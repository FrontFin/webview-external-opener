# Android (Kotlin)

Two files:

- [`MeshExternalOpener.kt`](MeshExternalOpener.kt): the bridges, as `WebView` extensions. Copy it into your app and set its package.
  - `enableMeshExternalOpener()` injects `window.meshExternalOpener` and opens every URL Link posts in the app that claims it, otherwise the browser.
  - `setMeshLinkEventListener { type, json -> }` receives Link's events (`done`, `transferFinished`, `brokerageAccountAccessToken`, `loaded`, analytics events). Optional.
- [`ExampleActivity.kt`](ExampleActivity.kt): a minimal activity that shows how to set up the WebView. Use it as a reference for your own screen, not as a drop-in.

Both bridges use `androidx.webkit`'s `WebViewCompat.addWebMessageListener`. It injects the object before the page loads into every frame whose origin matches `https://*.meshconnect.com`, so Link's cross-origin iframe gets it and other frames don't.

## Setup

1. Add the dependency:
   ```kotlin
   implementation("androidx.webkit:webkit:1.12.1")
   ```
2. Copy [`MeshExternalOpener.kt`](MeshExternalOpener.kt) into your app and set its package.
3. Set up the WebView **before** `loadUrl`, as in [`ExampleActivity.kt`](ExampleActivity.kt):
   ```kotlin
   webView.settings.apply {
       javaScriptEnabled = true
       domStorageEnabled = true
       cacheMode = WebSettings.LOAD_NO_CACHE
   }
   // Link runs in a cross-origin iframe: its session needs third-party cookies
   CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)
   // Keeps the payment page's own navigations and redirects in the WebView
   webView.webViewClient = WebViewClient()
   // Wallets, OAuth and other pages Link opens go to their app, else the browser
   webView.enableMeshExternalOpener()
   // Optional: close the screen when Link is done
   webView.setMeshLinkEventListener { type, _ -> if (type == "done") finish() }
   webView.loadUrl(paymentLink) // the `paymentLink` of your link token
   ```
4. Save and restore the WebView's state across configuration changes (`saveState` / `restoreState`), and call `destroy()` in `onDestroy`, as the example does.

## Notes

- Both functions do nothing on devices whose WebView doesn't support `WEB_MESSAGE_LISTENER` (very old System WebView). Link then runs without the bridges.
- `about:`, `data:`, `blob:`, `javascript:` and `file:` URLs are never opened. Others go out with `ACTION_VIEW` + `CATEGORY_BROWSABLE`.
- `setMeshLinkEventListener` exposes `window.JSBridge`, so Link treats the page as a native host for events, and shows Close on a boot error, which sends `done`.
- Back navigation is up to your screen: the example doesn't handle it.
