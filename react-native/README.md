# React Native (react-native-webview)

Use this when your React Native app shows Link inside a `react-native-webview`, for example a hosted payment link, without the Mesh React Native SDK.

Without it, the wallets, OAuth logins and help pages Link opens stay stuck inside your WebView. With it, they open in the right app, such as MetaMask or Coinbase, or in the browser. You also get Link's events, so you can close your screen when Link is done.

## What's here

| File | What it is |
|---|---|
| [`meshExternalOpener.ts`](meshExternalOpener.ts) | The code to copy into your app, for iOS and Android. |
| [`android/`](android/) | Two Kotlin files, for Android only. |
| [`ExampleScreen.tsx`](ExampleScreen.tsx) | A minimal screen showing the setup. A reference, not a drop-in. |

`meshExternalOpener.ts` gives you two things:

- **`meshWebViewProps`**: spread it onto `<WebView>`. It's what lets Link hand pages over to your app.
- **`handleMeshMessage(event, onLinkEvent?, origins?)`**: call it from `onMessage`. It opens the pages Link hands over, and passes Link's events (`done`, `transferFinished`, `brokerageAccountAccessToken`, `loaded`, analytics events) to `onLinkEvent`.

The two Kotlin files in `android/`:

- **`MeshWebViewManager.kt`**: react-native-webview's WebView with the [Android snippet](../android/) built in.
- **`MeshExternalOpenerPackage.kt`**: registers it with React Native.

## Setup

1. Use `react-native-webview` 13 or newer, and 13.6.2 or newer if you ship on Android. Tried with 13.12.5.

2. Copy [`meshExternalOpener.ts`](meshExternalOpener.ts) into your app.

3. **Android only** (tried with `newArchEnabled=false`, see [Good to know](#good-to-know)):
   - Add `implementation("androidx.webkit:webkit:1.12.1")` to `android/app/build.gradle`.
   - Copy [`../android/MeshExternalOpener.kt`](../android/MeshExternalOpener.kt) and the two files in [`android/`](android/) into one package of your app, and change their `package` line to it.
   - Add `MeshExternalOpenerPackage()` to the packages in your `MainApplication`.

4. Set up the WebView. It's the same code on iOS and Android, as in [`ExampleScreen.tsx`](ExampleScreen.tsx):

   ```tsx
   <WebView
     source={{ uri: paymentLink }} // the `paymentLink` from your link token
     // Link runs in an iframe from another site, so its session needs third-party cookies
     thirdPartyCookiesEnabled
     domStorageEnabled
     cacheEnabled={false}
     // Wallets, OAuth and other pages Link opens go to their app, or the browser
     {...meshWebViewProps}
     onMessage={(event) => {
       // Optional: close the screen when Link is done.
       // Link can send `done` more than once, so make `close` run only once.
       if (handleMeshMessage(event, (type) => type === 'done' && close())) return
       // your own messages
     }}
   />
   ```

5. Optional, but recommended: pass `origins`, the payment page and Link's URL (your link token, base64-decoded), as the third argument to `handleMeshMessage`. That scopes which pages can talk to your app through `handleMeshMessage`, Link's events included. The Android native opener is separate: it always accepts any `https://*.meshconnect.com` frame, `origins` doesn't narrow it (see [Good to know](#good-to-know)). The example does this.

## How it works

Link checks for a `window.meshExternalOpener` object. If it's there, Link hands it every page it wants to open, instead of trying to open a window the WebView can't show. Link runs in an iframe, so the object has to be in that iframe, not just the main page. Each platform gets it there differently:

- **iOS:** `meshWebViewProps` injects a small script into every frame on `https://*.meshconnect.com`, Link's iframe included. The script defines `window.meshExternalOpener` and forwards each page to your `onMessage`, as `{ type: 'meshExternalOpener', url }`. `handleMeshMessage` opens it.
- **Android:** react-native-webview can only inject scripts into the main page there, not into Link's iframe. So `meshWebViewProps` swaps in `MeshWebView`, which adds `window.meshExternalOpener` natively, as the [Android snippet](../android/) does, and opens the pages itself.

Link's events reach `onMessage` on both platforms.

## Good to know

- **Android and the New Architecture:** `MeshWebView` was tried with `newArchEnabled=false` (React Native 0.76) on a Galaxy S25. Under the New Architecture it relies on React Native's compatibility layer for older native views. Test it there before you ship.
- **If Android isn't set up:** without `MeshExternalOpenerPackage` registered, you get a warning and a plain WebView, with no fallback. Wallets and other pages Link wants to open outside the WebView won't open at all; wallet deep links can fail with `ERR_UNKNOWN_URL_SCHEME`.
- **Who can send messages:** `handleMeshMessage` only listens to `https://*.meshconnect.com` pages, or just your `origins` if you pass them. So a page the WebView ends up on, such as an OAuth login, can't open URLs or fake Link's events. On Android the check sees the main page, not the iframe that sent the message, so an iframe inside a Mesh page could still send events there.
- **Your own messages:** `handleMeshMessage` takes any JSON message with a string `type`. If your page sends its own typed messages, handle those first.
- **iOS side effect:** the script also defines `window.ReactNativeWebView` in Link's iframe, which react-native-webview only defines in the main page. That's what lets Link's events through. Link then treats your screen as a native app: if Link fails to start, it shows a Close button, which sends `done`.
