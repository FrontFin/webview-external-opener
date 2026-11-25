# Mesh WebView External Opener

Copy-paste snippets that let a **plain native WebView** open Mesh Link's wallet deeplinks, universal links and OAuth pages outside the app, with no Mesh SDK.

Use this if you embed Link through the **Mesh Web SDK** (Link in an iframe) inside an Android, iOS, React Native or Flutter WebView. Mesh native SDKs don't need it.

## The problem

In a plain WebView, wallet deeplinks (`metamask://`, `rainbow://`…) fail with `ERR_UNKNOWN_URL_SCHEME`, and `target="_blank"` / `window.open` links (OAuth, help pages) go nowhere.

## How it works

Your app injects `window.meshExternalOpener` into Link's frame before the page loads. Link then posts every new-window open to it as an absolute URL, and your app opens that URL with the OS (wallet app if installed, otherwise the system browser). Without the object, nothing changes.

## Contract (v1)

| | |
|---|---|
| Global name | `window.meshExternalOpener` |
| Method | `postMessage(message: string)` |
| Message | One absolute URL: `https:`, or a wallet scheme such as `metamask:` |
| Sent for | `<a target="_blank">` clicks; `window.open(url)` with no target, `''` or `_blank` |
| Never sent | `about:`, `blob:`, `data:`, `file:`, `javascript:` URLs; `about:blank` popups; `_self` / `_parent` / `_top` / named-window opens |
| Reply | None. Fire-and-forget. If `postMessage` throws, Link opens the URL itself. |
| Injection | **Before the page loads**, and **into Link's iframe**, not only the main frame |
| Allowed origin | Mesh origins only: `https://*.meshconnect.com` |

> Only expose the object to Link's origin, so other frames can't make your app open arbitrary URLs.

## Platforms

| Platform | Snippet | WebView API |
|---|---|---|
| Android (Kotlin) | [`android/`](android/) | `androidx.webkit` `WebViewCompat.addWebMessageListener` |
| iOS (Swift) | [`ios/`](ios/) | `WKWebView` user script + `WKScriptMessageHandler` |
| React Native | [`react-native/`](react-native/) | `react-native-webview` shim on iOS, a WebView view manager on Android. ⚠️ Android tried with `newArchEnabled=false` only, see its README |
| Flutter | [`flutter/`](flutter/) | `flutter_inappwebview` `addWebMessageListener` |

Each folder has the bridge file to copy, an example screen, an optional Link event listener, and a README with setup steps.

## Versioning

Tags are contract versions (`v1`, `v1.1`…). Link to a tag, not `main`. See [CHANGELOG.md](CHANGELOG.md).

## Support

Open an issue in this repo, or contact your Mesh account team. For security issues, see [SECURITY.md](SECURITY.md).
