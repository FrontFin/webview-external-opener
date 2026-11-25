# Changelog

All notable changes to the WebView external opener snippets are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions are contract versions, tagged `v1`, `v2`…: a change to the contract (global name, message format, what's sent) bumps the major version; snippet-only fixes bump the minor.

## Unreleased

### Added
- Contract: `window.meshExternalOpener.postMessage(url: string)`, injected before the page loads into Link's frame on `https://*.meshconnect.com`
- A bridge file and an example screen for Android (`androidx.webkit`), iOS (`WKWebView`), React Native (`react-native-webview`) and Flutter (`flutter_inappwebview`)
- Optional Link event listener on every platform (`done`, `transferFinished`…)
- React Native: `MeshWebView` on Android, react-native-webview's WebView with the Android snippet
- React Native: optional `origins` for `handleMeshMessage`, e.g. the payment page and Link

### Security
- React Native: `handleMeshMessage` takes messages only from Mesh pages, and ignores posted URLs on Android
