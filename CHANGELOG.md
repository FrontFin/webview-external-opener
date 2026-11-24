# Changelog

Tags are contract versions. A change to the contract (global name, message format, what's sent) bumps the major version; snippet-only fixes bump the minor.

## v1 — unreleased

- Contract: `window.meshExternalOpener.postMessage(url: string)`, injected before load into Link's frame, origins `https://*.meshconnect.com`.
- Optional Link event listener on every platform (`done`, `transferFinished`…).
- React Native: `handleMeshMessage` takes messages only from a Mesh page (`event.nativeEvent.url`), and ignores posted URLs on Android, where the native Android snippet opens them. The example closes once when Link sends `done` again.
- Per platform: a bridge file and an example screen. Android (`androidx.webkit`), iOS (`WKWebView`), React Native (`react-native-webview`, iOS only), Flutter (`flutter_inappwebview`).
