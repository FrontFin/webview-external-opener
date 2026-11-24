# React Native (react-native-webview)

Files:

- [`meshExternalOpener.ts`](meshExternalOpener.ts): the bridges. Copy it into your app.
  - `meshWebViewProps`, spread onto `<WebView>`, injects a shim that defines `window.meshExternalOpener` in frames on `https://*.meshconnect.com`.
  - `handleMeshMessage(event, onLinkEvent?, origins?)`, called from `onMessage`, opens every URL Link posts in the app that claims it, otherwise the browser. It also passes Link's events (`done`, `transferFinished`, `brokerageAccountAccessToken`, `loaded`, analytics events) to the optional `onLinkEvent`.
- Android only, the opener behind a native module (react-native-webview can't reach Link's iframe there):
  - [`android/`](android/): `MeshExternalOpenerModule.kt` and `MeshExternalOpenerPackage.kt`, which run the [Android snippet](../android/) on react-native-webview's WebView.
  - [`meshExternalOpenerAndroid.ts`](meshExternalOpenerAndroid.ts): `enableAndroidOpener(reactTag)`, called before the WebView loads the page.
- [`ExampleScreen.tsx`](ExampleScreen.tsx): a minimal screen that shows how to set up the WebView. Use it as a reference for your own screen, not as a drop-in.

react-native-webview has no named-object API, so the shim forwards through `window.ReactNativeWebView.postMessage`, tagged `{ type: 'meshExternalOpener', url }`.

## Setup

1. `react-native-webview` 13 or newer.
2. Copy [`meshExternalOpener.ts`](meshExternalOpener.ts) into your app.
3. Android:
   - Add `implementation("androidx.webkit:webkit:1.12.1")` to `android/app/build.gradle`.
   - Copy [`../android/MeshExternalOpener.kt`](../android/MeshExternalOpener.kt) and the two files in [`android/`](android/) into one package of your app, and set it.
   - Add `MeshExternalOpenerPackage()` to the packages in your `MainApplication`.
   - Copy [`meshExternalOpenerAndroid.ts`](meshExternalOpenerAndroid.ts).
4. Set up the WebView as in [`ExampleScreen.tsx`](ExampleScreen.tsx). On Android, wrap it in a `View` with `collapsable={false}`, call `enableAndroidOpener(findNodeHandle(view))`, and set `source` only once it resolves. Then:
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
       // Optional: close the screen when Link is done. It can send `done` more than once, close once
       if (handleMeshMessage(event, (type) => type === 'done' && close())) return
       // your own messages
     }}
   />
   ```

## ⚠️ Caveats

- **Android doesn't reach Link's iframe.** react-native-webview injects scripts into the main frame only on Android (`injectedJavaScriptBeforeContentLoadedForMainFrameOnly: false` is iOS-only), so Link's iframe never gets `window.meshExternalOpener`, and `handleMeshMessage` ignores the URLs posted there. The native module in [`android/`](android/) runs the [Android snippet](../android/) instead: its listener takes URLs from Mesh frames only. Link's events still reach `onMessage` there, because `window.ReactNativeWebView` exists in every frame.
- **Android, New Architecture:** the module finds the WebView through `UIManagerModule`, which bridgeless mode doesn't have. It was tried with `newArchEnabled=false` (React Native 0.76); in bridgeless mode `enableAndroidOpener` resolves false and Link runs without the opener.
- **iOS:** react-native-webview defines `window.ReactNativeWebView` in the main frame only. The shim also defines it in Link's iframe, which is what lets both the URLs and Link's events through. Link then treats the page as a native host for events, and shows Close on a boot error, which sends `done`.
- **Sender check:** `handleMeshMessage` takes messages only when `event.nativeEvent.url` is an https page on `*.meshconnect.com`, so a page the WebView navigated to (an OAuth login, a help page) can't open URLs or post fake events. Pass `origins`, the payment page and Link's URL (the link token decoded), to take them from those two origins only, as the example does. On iOS that URL is the frame that sent the message; on Android it's the top page, so an iframe inside a Mesh page could still post events there.
- `handleMeshMessage` claims any JSON message with a string `type`. If your page posts its own typed messages, handle those first.
