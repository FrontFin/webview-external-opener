# Flutter (flutter_inappwebview)

Use this when your Flutter app shows Link inside an `InAppWebView`, for example a hosted payment link, without the Mesh Flutter SDK.

Without it, the wallets, OAuth logins and help pages Link opens stay stuck inside your WebView. With it, they open in the right app, such as MetaMask or Coinbase, or in the browser. You can also find out when Link is done, so you can close your page.

## What's here

| File | What it is |
|---|---|
| [`lib/mesh_external_opener.dart`](lib/mesh_external_opener.dart) | The code to copy into your app. Two `InAppWebViewController` extension functions. |
| [`lib/example_page.dart`](lib/example_page.dart) | A minimal page showing the setup. A reference, not a drop-in. |
| `pubspec.yaml` | Only there so CI can run `flutter analyze`. Don't copy it. |

The two functions:

- **`enableMeshExternalOpener()`**: opens every page Link asks to open in the app that handles it, or else the browser.
- **`setMeshLinkEventListener((type, json) {})`**: optional. Tells you what happens in Link: `done`, `transferFinished`, `brokerageAccountAccessToken`, `loaded` and analytics events.

## Setup

1. Add the dependencies to your `pubspec.yaml`:

   ```yaml
   flutter_inappwebview: ^6.0.0
   url_launcher: ^6.1.0
   ```

2. Copy [`lib/mesh_external_opener.dart`](lib/mesh_external_opener.dart) into your app.

3. Set up the WebView. Leave `initialUrlRequest` empty, and load the page only **after** the two functions have run:

   ```dart
   InAppWebView(
     initialSettings: InAppWebViewSettings(
       javaScriptEnabled: true,
       domStorageEnabled: true,
       cacheMode: CacheMode.LOAD_NO_CACHE,
       // Link runs in an iframe from another site, so its session needs third-party cookies
       thirdPartyCookiesEnabled: true,
     ),
     onWebViewCreated: (controller) async {
       // Wallets, OAuth and other pages Link opens go to their app, or the browser
       await controller.enableMeshExternalOpener();
       // Optional: close the page when Link is done
       await controller.setMeshLinkEventListener((type, _) {
         if (type == 'done' && context.mounted) Navigator.of(context).pop();
       });
       // the `paymentLink` from your link token
       await controller.loadUrl(urlRequest: URLRequest(url: WebUri(paymentLink)));
     },
   )
   ```

## How it works

Link checks for a `window.meshExternalOpener` object. If it's there, Link hands it every page it wants to open, instead of trying to open a window the WebView can't show.

`enableMeshExternalOpener()` adds that object with `flutter_inappwebview`'s `addWebMessageListener`, on both Android and iOS. It's added before the page loads, and only to frames on `https://*.meshconnect.com`. That includes Link's iframe, so Link finds it, and other sites in the WebView don't get it.

## Good to know

- **⚠️ Check iOS:** on iOS, `flutter_inappwebview` imitates message listeners with injected scripts. Test that Link's iframe gets `window.meshExternalOpener` there before you ship.
- **Old Android devices:** on a phone whose Android System WebView is too old for message listeners, both functions do nothing, with no fallback. Wallet deep links can fail with an unknown-scheme error, and Link's events won't reach you, unless you add your own handling.
- **What's never opened:** `about:`, `data:`, `blob:`, `javascript:` and `file:` URLs. Everything else goes to `launchUrl` with `LaunchMode.externalApplication`.
- **Event listener side effect:** `setMeshLinkEventListener` adds `window.JSBridge`, so Link treats your page as a native app. If Link fails to start, it shows a Close button, which sends `done`.

## What about `webview_flutter`?

Not recommended. `addJavaScriptChannel('meshExternalOpener', …)` gives Link the same `window.meshExternalOpener.postMessage`, but it **can't limit which sites get it**, and it may not reach iframes on every platform. Use `flutter_inappwebview`.
