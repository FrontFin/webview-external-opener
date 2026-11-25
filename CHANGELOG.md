# Changelog

Tags are contract versions. A change to the contract (global name, message format, what's sent) bumps the major version; snippet-only fixes bump the minor.

## v1 — unreleased

- Contract: `window.meshExternalOpener.postMessage(url: string)`, injected before load into Link's frame, origins `https://*.meshconnect.com`.
- Optional Link event listener on every platform (`done`, `transferFinished`…).
- Per platform: a bridge file and an example screen. Android (`androidx.webkit`), iOS (`WKWebView`), React Native (`react-native-webview`), Flutter (`flutter_inappwebview`).
- React Native: messages only from Mesh pages, or the given `origins`. The shim on iOS, `MeshWebView` (the Android snippet) on Android.
