# Android (Kotlin)

Use this when your app shows Link inside its own `WebView`, for example a hosted payment link, without the Mesh Android SDK.

Without it, the wallets, OAuth logins and help pages Link opens stay stuck inside your WebView. With it, they open in the right app, such as MetaMask or Coinbase, or in the browser. You can also find out when Link is done, so you can close your screen.

## What's here

| File | What it is |
|---|---|
| [`MeshExternalOpener.kt`](MeshExternalOpener.kt) | The code to copy into your app. Two `WebView` extension functions. |
| [`ExampleActivity.kt`](ExampleActivity.kt) | A minimal screen showing the setup. A reference, not a drop-in. |

The two functions:

- **`enableMeshExternalOpener()`**: opens every page Link asks to open in the app that handles it, or else the browser.
- **`setMeshLinkEventListener { type, json -> }`**: optional. Tells you what happens in Link: `done`, `transferFinished`, `brokerageAccountAccessToken`, `loaded` and analytics events.

## Setup

1. Add the dependency to your app's `build.gradle.kts`:

   ```kotlin
   implementation("androidx.webkit:webkit:1.12.1")
   ```

2. Copy [`MeshExternalOpener.kt`](MeshExternalOpener.kt) into your app and change its `package` line to yours.

3. Set up the WebView, and do it **before** you call `loadUrl`:

   ```kotlin
   webView.settings.apply {
       javaScriptEnabled = true
       domStorageEnabled = true
       cacheMode = WebSettings.LOAD_NO_CACHE
   }
   // Link runs in an iframe from another site, so its session needs third-party cookies
   CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)
   // Keeps the payment page's own links and redirects inside the WebView
   webView.webViewClient = WebViewClient()
   // Wallets, OAuth and other pages Link opens go to their app, or the browser
   webView.enableMeshExternalOpener()
   // Optional: close the screen when Link is done
   webView.setMeshLinkEventListener { type, _ -> if (type == "done") finish() }

   webView.loadUrl(paymentLink) // the `paymentLink` from your link token
   ```

4. Keep the WebView alive across rotation with `saveState` / `restoreState`, and call `destroy()` in `onDestroy`. [`ExampleActivity.kt`](ExampleActivity.kt) shows both.

## How it works

Link checks for a `window.meshExternalOpener` object. If it's there, Link hands it every page it wants to open, instead of trying to open a window the WebView can't show.

`enableMeshExternalOpener()` adds that object with `androidx.webkit`'s `WebViewCompat.addWebMessageListener`. It's added before the page loads, and only to frames on `https://*.meshconnect.com`. That includes Link's iframe, so Link finds it, and other sites in the WebView don't get it.

## Good to know

- **Old devices:** on a phone whose Android System WebView is too old for message listeners, both functions do nothing. Link still works, but its pages open inside the WebView.
- **What's never opened:** `about:`, `data:`, `blob:`, `javascript:` and `file:` URLs. Everything else goes out as an `ACTION_VIEW` intent for a browsable app.
- **Event listener side effect:** `setMeshLinkEventListener` adds `window.JSBridge`, so Link treats your screen as a native app. If Link fails to start, it shows a Close button, which sends `done`.
- **Back button:** handling Back is up to your screen. The example doesn't do it.
