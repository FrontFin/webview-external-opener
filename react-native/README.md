# React Native (react-native-webview)

Two files:

- [`meshExternalOpener.ts`](meshExternalOpener.ts): the bridges. Copy it into your app.
  - `meshWebViewProps`, spread onto `<WebView>`, injects a shim that defines `window.meshExternalOpener` in frames on `https://*.meshconnect.com`.
  - `handleMeshMessage(event, onLinkEvent?)`, called from `onMessage`, opens every URL Link posts in the app that claims it, otherwise the browser. It also passes Link's events (`done`, `transferFinished`, `brokerageAccountAccessToken`, `loaded`, analytics events) to the optional `onLinkEvent`.
- [`ExampleScreen.tsx`](ExampleScreen.tsx): a minimal screen that shows how to set up the WebView. Use it as a reference for your own screen, not as a drop-in.

react-native-webview has no named-object API, so the shim forwards through `window.ReactNativeWebView.postMessage`, tagged `{ type: 'meshExternalOpener', url }`.

## Setup

1. `react-native-webview` 13 or newer.
2. Copy [`meshExternalOpener.ts`](meshExternalOpener.ts) into your app.
3. Set up the WebView as in [`ExampleScreen.tsx`](ExampleScreen.tsx):
   ```tsx
   <WebView
     source={{ uri: paymentLink }} // the `paymentLink` of your link token
     // Link runs in a cross-origin iframe: its session needs third-party cookies
     thirdPartyCookiesEnabled
     domStorageEnabled
     cacheEnabled={false}
     // Wallets, OAuth and other pages Link opens go to their app, else the browser
     {...meshWebViewProps}
     onMessage={(event) => {
       // Optional: close the screen when Link is done
       if (handleMeshMessage(event, (type) => type === 'done' && onClose())) return
       // your own messages
     }}
   />
   ```

## ⚠️ Caveats

- **Android doesn't reach Link's iframe.** react-native-webview injects scripts into the main frame only on Android (`injectedJavaScriptBeforeContentLoadedForMainFrameOnly: false` is iOS-only), so Link's iframe never gets `window.meshExternalOpener`. On Android, use the [Android snippet](../android/) through a small native module instead. Link's events still reach `onMessage` there, because `window.ReactNativeWebView` exists in every frame.
- **iOS:** react-native-webview defines `window.ReactNativeWebView` in the main frame only. The shim also defines it in Link's iframe, which is what lets both the URLs and Link's events through. Link then treats the page as a native host for events, and shows Close on a boot error, which sends `done`.
- **No sender check:** `onMessage` can't tell which frame sent a message, so the origin check in the shim is the only guard.
- `handleMeshMessage` claims any JSON message with a string `type`. If your page posts its own typed messages, handle those first.
