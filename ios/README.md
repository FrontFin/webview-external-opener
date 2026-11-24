# iOS (Swift, WKWebView)

Two files:

- [`MeshExternalOpener.swift`](MeshExternalOpener.swift): the bridges, as `WKWebView` extensions. Copy it into your app.
  - `enableMeshExternalOpener()` injects `window.meshExternalOpener` and opens every URL Link posts in the app that claims it, otherwise Safari.
  - `setMeshLinkEventListener { type, json in }` receives Link's events (`done`, `transferFinished`, `brokerageAccountAccessToken`, `loaded`, analytics events). Optional.
- [`ExampleViewController.swift`](ExampleViewController.swift): a minimal view controller that shows how to set up the WebView. Use it as a reference for your own screen, not as a drop-in.

WKWebView exposes handlers as `window.webkit.messageHandlers.<name>`, not `window.<name>`. So a user script, injected at document start into every frame, defines `window.meshExternalOpener` in frames on `https://*.meshconnect.com` and forwards to a native handler. The handler checks the sender's origin again, because handlers are reachable from every frame.

## Setup

1. Copy [`MeshExternalOpener.swift`](MeshExternalOpener.swift) into your app.
2. Set up the WebView **before** `load`, as in [`ExampleViewController.swift`](ExampleViewController.swift):
   ```swift
   // Wallets, OAuth and other pages Link opens go to their app, else Safari
   webView.enableMeshExternalOpener()
   // Optional: close the screen when Link is done. Capture weakly: the WebView holds the listener
   webView.setMeshLinkEventListener { [weak self] type, _ in
       if type == "done" { self?.dismiss(animated: true) }
   }
   webView.load(URLRequest(url: paymentLink)) // the `paymentLink` of your link token
   ```
3. To check for wallet apps with `canOpenURL`, list their schemes in `LSApplicationQueriesSchemes`. `UIApplication.open` works without it.

## Notes

- `about:`, `data:`, `blob:`, `javascript:` and `file:` URLs are never opened. Others go to `UIApplication.shared.open`.
- `setMeshLinkEventListener` registers `jsMessageHandler`, the handler the Link iOS SDK uses. Link then treats the page as a native host for events, and shows Close on a boot error, which sends `done`.
- If you have a `WKUIDelegate` that handles `createWebViewWith`, it no longer sees Link's new-window opens: Link hands them to the bridge instead.
- Both files build with Swift 5 and Swift 6 language modes, iOS 15+.
