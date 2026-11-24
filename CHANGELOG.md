# Changelog

Tags are contract versions. A change to the contract (global name, message format, what's sent) bumps the major version; snippet-only fixes bump the minor.

## v1 — unreleased

- Contract: `window.meshExternalOpener.postMessage(url: string)`, injected before load into Link's frame, origins `https://*.meshconnect.com`.
- Optional Link event listener on every platform (`done`, `transferFinished`…).
- React Native: `handleMeshMessage` takes messages only from a Mesh page (`event.nativeEvent.url`), and ignores posted URLs on Android, where the native Android snippet opens them. Optional `origins` narrows the senders to the payment page and Link. The example closes once when Link sends `done` again.
- React Native, Android: a native module (`react-native/android/`) and `enableAndroidOpener` run the Android snippet on react-native-webview's WebView, so Link's URLs open there too.
- Per platform: a bridge file and an example screen. Android (`androidx.webkit`), iOS (`WKWebView`), React Native (`react-native-webview`), Flutter (`flutter_inappwebview`).
