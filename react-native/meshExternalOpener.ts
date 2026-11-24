// Bridges for a react-native-webview that shows Link without the Link SDK, e.g. a hosted payment link: Link's
// events, and the wallets, OAuth and other pages Link opens outside the WebView

import { Linking } from 'react-native'
import type { WebViewMessageEvent, WebViewProps } from 'react-native-webview'

/** The object Link looks for, a new name so Link doesn't mistake the page for a native SDK host */
const MESH_EXTERNAL_OPENER = 'meshExternalOpener'

/**
 * Frames that get the bridges: Link's iframe, wherever it's served from (`web.`, `link.`, sandbox and dev hosts).
 * Doesn't match `https://meshconnect.com` itself. A Mesh page embedding Link is under it too
 */
const MESH_HOST_SUFFIX = '.meshconnect.com'

/** No scheme, or one the WebView loads itself */
const BLOCKED_SCHEMES = new Set(['', 'about', 'data', 'blob', 'javascript', 'file'])

/**
 * react-native-webview has no named-object API, so this shim defines `window.meshExternalOpener` in frames on a
 * Mesh origin and forwards through `window.ReactNativeWebView.postMessage`, tagged so it can't be confused with
 * Link's events or your own messages.
 *
 * On iOS react-native-webview defines `window.ReactNativeWebView` in the main frame only, while its native handler
 * takes messages from every frame. So the shim defines it in Link's iframe too, which also lets Link post its events.
 */
const shim = `
  (function () {
    if (location.protocol !== 'https:' || !location.hostname.endsWith('${MESH_HOST_SUFFIX}')) return;
    var handler = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ReactNativeWebView;
    if (!window.ReactNativeWebView && handler) {
      window.ReactNativeWebView = { postMessage: function (m) { handler.postMessage(String(m)); } };
    }
    window.${MESH_EXTERNAL_OPENER} = {
      postMessage: function (u) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: '${MESH_EXTERNAL_OPENER}', url: String(u) }));
      }
    };
  })();
  true;`

/**
 * Lets Link open wallets, OAuth and other pages outside this WebView: spread onto `<WebView>`. Injects the shim
 * before the page loads, on iOS into every frame, Link's cross-origin iframe included.
 * Pass the WebView's messages to [handleMeshMessage].
 */
export const meshWebViewProps: Pick<
  WebViewProps,
  | 'injectedJavaScriptBeforeContentLoaded'
  | 'injectedJavaScriptBeforeContentLoadedForMainFrameOnly'
> = {
  injectedJavaScriptBeforeContentLoaded: shim,
  // iOS only: Android injects into the main frame alone, see the README
  injectedJavaScriptBeforeContentLoadedForMainFrameOnly: false,
}

/**
 * Handles a WebView message from Link, call it from `onMessage`. Returns true when the message was Link's, so you can
 * skip your own handling.
 *
 * - A URL from `window.meshExternalOpener` goes to the app that claims it, else the browser.
 * - Anything else with a `type` is one of Link's events, which Link posts to `window.ReactNativeWebView` on top of
 *   what it sends the surrounding page. [onLinkEvent] gets its `type` and the whole JSON:
 *   - `done`: Link closed, after Done or Exit
 *   - `transferFinished`: the transfer's result
 *   - `brokerageAccountAccessToken`: an integration connected
 *   - `loaded` and the analytics events, e.g. `integrationSelected`
 *
 * `onMessage` can't tell which frame sent a message: the origin check in the shim is the only guard for URLs.
 */
export function handleMeshMessage(
  event: WebViewMessageEvent,
  onLinkEvent?: (type: string, json: string) => void,
): boolean {
  const json = event.nativeEvent.data
  let message: { type?: unknown; url?: unknown }
  try {
    message = JSON.parse(json)
  } catch {
    return false
  }
  if (typeof message !== 'object' || message === null || typeof message.type !== 'string' || !message.type) {
    return false
  }
  if (message.type === MESH_EXTERNAL_OPENER) {
    if (typeof message.url === 'string') openExternal(message.url)
  } else {
    onLinkEvent?.(message.type, json)
  }
  return true
}

/** The app that claims [url], else the browser. Ignores a URL nothing handles */
function openExternal(url: string): void {
  // A frame shouldn't make the app start javascript: or file: links
  const colon = url.indexOf(':')
  const scheme = colon > 0 ? url.slice(0, colon).toLowerCase() : ''
  if (BLOCKED_SCHEMES.has(scheme)) return
  Linking.openURL(url).catch(() => {})
}
