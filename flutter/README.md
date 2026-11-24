# Flutter (flutter_inappwebview)

Two files:

- [`lib/mesh_external_opener.dart`](lib/mesh_external_opener.dart): the bridges, as `InAppWebViewController` extensions. Copy it into your app.
  - `enableMeshExternalOpener()` injects `window.meshExternalOpener` and opens every URL Link posts in the app that claims it, otherwise the browser.
  - `setMeshLinkEventListener((type, json) {})` receives Link's events (`done`, `transferFinished`, `brokerageAccountAccessToken`, `loaded`, analytics events). Optional.
- [`lib/example_page.dart`](lib/example_page.dart): a minimal page that shows how to set up the WebView. Use it as a reference for your own screen, not as a drop-in.

Both bridges use `flutter_inappwebview`'s `addWebMessageListener`, on Android and iOS. It injects the object before the page loads into every frame whose origin matches `https://*.meshconnect.com`, so Link's cross-origin iframe gets it and other frames don't.

## Setup

1. Dependencies:
   ```yaml
   flutter_inappwebview: ^6.0.0
   url_launcher: ^6.1.0
   ```
2. Copy [`lib/mesh_external_opener.dart`](lib/mesh_external_opener.dart) into your app.
3. Set up the WebView as in [`lib/example_page.dart`](lib/example_page.dart). Leave `initialUrlRequest` empty and load **after** adding the bridges:
   ```dart
   InAppWebView(
     initialSettings: InAppWebViewSettings(
       javaScriptEnabled: true,
       domStorageEnabled: true,
       cacheMode: CacheMode.LOAD_NO_CACHE,
       // Link runs in a cross-origin iframe: its session needs third-party cookies
       thirdPartyCookiesEnabled: true,
     ),
     onWebViewCreated: (controller) async {
       // Wallets, OAuth and other pages Link opens go to their app, else the browser
       await controller.enableMeshExternalOpener();
       // Optional: close the page when Link is done
       await controller.setMeshLinkEventListener((type, _) {
         if (type == 'done' && context.mounted) Navigator.of(context).pop();
       });
       // the `paymentLink` of your link token
       await controller.loadUrl(urlRequest: URLRequest(url: WebUri(paymentLink)));
     },
   )
   ```

## Notes

- Both functions do nothing on Android devices whose WebView doesn't support `WEB_MESSAGE_LISTENER` (very old System WebView). Link then runs without the bridges.
- `about:`, `data:`, `blob:`, `javascript:` and `file:` URLs are never opened. Others go to `launchUrl` with `LaunchMode.externalApplication`.
- `setMeshLinkEventListener` exposes `window.JSBridge`, so Link treats the page as a native host for events, and shows Close on a boot error, which sends `done`.
- ⚠️ Verify on iOS that the `https://*.meshconnect.com` wildcard rule reaches Link's iframe. flutter_inappwebview emulates message listeners on iOS with user scripts.
- `pubspec.yaml` is only there so CI can run `flutter analyze`. Don't copy it.

## `webview_flutter`

`addJavaScriptChannel('meshExternalOpener', …)` gives the same `window.meshExternalOpener.postMessage` name, but it has **no origin filter** and may not reach iframes on every platform. Not recommended; use `flutter_inappwebview`.
