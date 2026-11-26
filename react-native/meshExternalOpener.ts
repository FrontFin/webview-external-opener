// Bridges for a react-native-webview that shows Link without the Link SDK, e.g. a hosted payment link: Link's
// events, and the wallets, OAuth and other pages Link opens outside the WebView

import { Linking, Platform, UIManager, requireNativeComponent } from 'react-native'
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
 * Proves a URL came through the shim's `window.meshExternalOpener`, i.e. from a Mesh frame: react-native-webview's
 * handler takes messages from every frame and reports the top page as the sender, so an iframe of a Mesh page could
 * post a URL by hand. The shim only uses the token in frames on a Mesh origin, and other frames can't read it there.
 * Math.random: a frame never sees the app's other random values, and crypto may not be polyfilled yet at import
 */
const OPENER_TOKEN = Array.from({ length: 4 }, () => Math.random().toString(36).slice(2)).join('')

/**
 * react-native-webview has no named-object API, so this shim defines `window.meshExternalOpener` in frames on a
 * Mesh origin and forwards through `window.ReactNativeWebView.postMessage`, tagged so it can't be confused with
 * Link's events or your own messages, and with [OPENER_TOKEN].
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
          JSON.stringify({ type: '${MESH_EXTERNAL_OPENER}', url: String(u), token: '${OPENER_TOKEN}' }));
      }
    };
  })();
  true;`

/** The Android WebView with the native opener, see `android/MeshWebViewManager.kt` */
const MESH_WEB_VIEW = 'MeshWebView'

/**
 * Lets Link open wallets, OAuth and other pages outside this WebView: spread onto `<WebView>`.
 * Pass the WebView's messages to [handleMeshMessage].
 *
 * - iOS: injects the shim before the page loads into every frame, Link's cross-origin iframe included.
 * - Android: react-native-webview injects into the main frame only, so it swaps in the native `MeshWebView`, which runs
 *   the Android snippet. Without it registered, Link runs without the opener. The shim isn't injected: it would
 *   replace the native `window.meshExternalOpener` in a Mesh main frame with one whose URLs [handleMeshMessage]
 *   ignores.
 */
export const meshWebViewProps: Pick<
  WebViewProps,
  'injectedJavaScriptBeforeContentLoaded' | 'injectedJavaScriptBeforeContentLoadedForMainFrameOnly' | 'nativeConfig'
> =
  Platform.OS === 'android'
    ? { nativeConfig: meshWebViewConfig() }
    : { injectedJavaScriptBeforeContentLoaded: shim, injectedJavaScriptBeforeContentLoadedForMainFrameOnly: false }

/** `MeshWebView` for `nativeConfig`, or none, with a warning, when `MeshExternalOpenerPackage` isn't registered */
function meshWebViewConfig(): WebViewProps['nativeConfig'] {
  if (UIManager.hasViewManagerConfig(MESH_WEB_VIEW)) return { component: requireNativeComponent(MESH_WEB_VIEW) }
  // Link still runs, but nothing it opens leaves the WebView
  console.warn(`${MESH_WEB_VIEW} isn't registered: add MeshExternalOpenerPackage to your MainApplication`)
  return undefined
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
 * Only messages from a Mesh page count, other pages in the WebView (an OAuth login it navigated to, an ad) can't
 * make the app open URLs or act on fake events. The page is the top page, not the sending frame, so an iframe of a Mesh
 * page could still post: it can fake events, but not URLs, which iOS only opens with the shim's token and Android
 * leaves to `MeshWebView`'s native listener, see the README.
 *
 * [origins] narrows that to the pages you load, e.g. the payment page and Link: the https origins, or URLs on them,
 * the sender's origin must equal. Without it, any `https://*.meshconnect.com` page counts.
 */
export function handleMeshMessage(
  event: WebViewMessageEvent,
  onLinkEvent?: (type: string, json: string) => void,
  origins?: readonly string[],
): boolean {
  // The top page on both platforms, not the frame that sent the message
  if (!isAllowedSender(event.nativeEvent.url, origins)) return false
  const json = event.nativeEvent.data
  let message: { type?: unknown; url?: unknown; token?: unknown }
  try {
    message = JSON.parse(json)
  } catch {
    return false
  }
  if (typeof message !== 'object' || message === null || typeof message.type !== 'string' || !message.type) {
    return false
  }
  if (message.type === MESH_EXTERNAL_OPENER) {
    // Without the token a frame posted it by hand. On Android `MeshWebView` opens Link's URLs natively and the shim
    // isn't injected, so there every one was
    if (Platform.OS !== 'android' && message.token === OPENER_TOKEN && typeof message.url === 'string') {
      openExternal(message.url)
    }
  } else {
    onLinkEvent?.(message.type, json)
  }
  return true
}

/** Whether [url] is an https page on one of [origins], or without them on a Mesh origin, the frames the shim serves */
function isAllowedSender(url: string | undefined, origins: readonly string[] | undefined): boolean {
  const sender = parseHttpsOrigin(url)
  if (sender == null) return false
  if (origins == null) return sender.host.endsWith(MESH_HOST_SUFFIX)
  return origins.some((o) => parseHttpsOrigin(o)?.origin === sender.origin)
}

/** The lower-case `https://host[:port]` of [url], without the default port, and its host. No user info */
function parseHttpsOrigin(url: string | undefined): { origin: string; host: string } | undefined {
  // React Native's URL can't read the host
  const match = /^https:\/\/([^/?#:@\s]+)(?::(\d{1,5}))?(?:[/?#]|$)/i.exec(url ?? '')
  if (match == null) return undefined
  const host = match[1].toLowerCase()
  const port = match[2] != null && match[2] !== '443' ? `:${match[2]}` : ''
  return { origin: `https://${host}${port}`, host }
}

/** The app that claims [url], else the browser. Ignores a URL nothing handles */
function openExternal(url: string): void {
  // A frame shouldn't make the app start javascript: or file: links
  const colon = url.indexOf(':')
  const scheme = colon > 0 ? url.slice(0, colon).toLowerCase() : ''
  if (BLOCKED_SCHEMES.has(scheme)) return
  Linking.openURL(url).catch(() => {})
}
