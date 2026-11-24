# Mesh WebView External Opener

Copy-paste snippets that let a **plain native WebView** open Mesh Link's wallet deeplinks, universal links and OAuth pages outside the app, with no Mesh SDK.

Use this if you embed Link through the **Mesh Web SDK** (Link in an iframe) inside an Android, iOS, React Native or Flutter WebView. If you use a Mesh native SDK, you don't need it.

## The problem

Inside a plain WebView, Link's "leave the app" opens don't work reliably:

- Wallet deeplinks (`metamask://`, `rainbow://`…) fail with `ERR_UNKNOWN_URL_SCHEME` or land on download pages.
- OAuth and help pages opened with `target="_blank"` / `window.open` go nowhere, because the WebView has no popup handling.

## How it works

1. Your app injects a JS object named `window.meshExternalOpener` with a `postMessage(url)` method into **Link's frame**, before the page loads.
2. At boot, Link checks for it. If it's there, every new-window open is posted to your app as one absolute URL string instead of opening a window.
3. Your app opens that URL with the OS: the wallet app if installed, otherwise the system browser.

No object means no change: browsers and the Mesh SDKs behave as before.

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

> Only expose the object to Link's origin. Your other frames, ads and third-party content must not be able to make your app open arbitrary URLs.

## Platforms

| Platform | Snippet | WebView API |
|---|---|---|
| Android (Kotlin) | [`android/`](android/) | `androidx.webkit` `WebViewCompat.addWebMessageListener`, plus an optional Link event listener |
| iOS (Swift) | [`ios/`](ios/) | `WKWebView` user script + `WKScriptMessageHandler`, plus an optional Link event listener |
| React Native | [`react-native/`](react-native/) | `react-native-webview` shim, plus an optional Link event listener. ⚠️ iOS only, see its README |
| Flutter | [`flutter/`](flutter/) | `flutter_inappwebview` `addWebMessageListener`, plus an optional Link event listener |

Each folder has the bridge file to copy, an example screen that shows how to set up the WebView, and a README with setup steps and a test checklist.

## Test checklist (all platforms)

- [ ] A wallet deeplink (e.g. MetaMask) opens the wallet app when installed.
- [ ] A universal link opens the wallet app when installed, the browser when not.
- [ ] An OAuth exchange login (e.g. Coinbase) opens in the system browser.
- [ ] A help or terms link opens in the system browser.
- [ ] Nothing opens from a page that isn't Link (try `window.meshExternalOpener` in another frame: it should be `undefined`).

## Versioning

Tags are contract versions (`v1`, `v1.1`…). Link to a tag, not `main`, so the code you read doesn't change under you. See [CHANGELOG.md](CHANGELOG.md).

## Support

Open an issue in this repo, or contact your Mesh account team. For security issues, see [SECURITY.md](SECURITY.md).
