# iOS (Swift, WKWebView)

Use this when your app shows Link inside its own `WKWebView`, for example a hosted payment link, without the Mesh iOS SDK.

Without it, the wallets, OAuth logins and help pages Link opens stay stuck inside your WebView. With it, they open in the right app, such as MetaMask or Coinbase, or in Safari. You can also find out when Link is done, so you can close your screen.

## What's here

| File | What it is |
|---|---|
| [`MeshExternalOpener.swift`](MeshExternalOpener.swift) | The code to copy into your app. Two `WKWebView` extension functions. |
| [`ExampleViewController.swift`](ExampleViewController.swift) | A minimal screen showing the setup. A reference, not a drop-in. |

The two functions:

- **`enableMeshExternalOpener()`**: opens every page Link asks to open in the app that handles it, or else Safari.
- **`setMeshLinkEventListener { type, json in }`**: optional. Tells you what happens in Link: `done`, `transferFinished`, `brokerageAccountAccessToken`, `loaded` and analytics events.

Both build in Swift 5 and Swift 6 language modes, on iOS 15 and newer.

## Setup

1. Copy [`MeshExternalOpener.swift`](MeshExternalOpener.swift) into your app.

2. Set up the WebView, and do it **before** you call `load`:

   ```swift
   // Wallets, OAuth and other pages Link opens go to their app, or Safari
   webView.enableMeshExternalOpener()
   // Optional: close the screen when Link is done.
   // Capture self weakly: the WebView keeps the listener alive.
   webView.setMeshLinkEventListener { [weak self] type, _ in
       if type == "done" { self?.dismiss(animated: true) }
   }

   webView.load(URLRequest(url: paymentLink)) // the `paymentLink` from your link token
   ```

3. Optional: if you also want to check whether a wallet app is installed with `canOpenURL`, list its URL scheme in `LSApplicationQueriesSchemes`. Opening pages doesn't need this.

## How it works

Link checks for a `window.meshExternalOpener` object. If it's there, Link hands it every page it wants to open, instead of trying to open a window the WebView can't show.

`WKWebView` can't add an object with that name by itself: its native handlers live under `window.webkit.messageHandlers`. So `enableMeshExternalOpener()` adds a small script to every frame before the page loads. On `https://*.meshconnect.com` frames, Link's iframe included, the script defines `window.meshExternalOpener` and passes each page to a native handler. The handler checks again that the message came from a Mesh frame, because any frame can reach it.

## Good to know

- **What's never opened:** `about:`, `data:`, `blob:`, `javascript:` and `file:` URLs. Everything else goes to `UIApplication.shared.open`.
- **Event listener side effect:** `setMeshLinkEventListener` registers `jsMessageHandler`, the same handler the Mesh iOS SDK uses. Link then treats your screen as a native app: if Link fails to start, it shows a Close button, which sends `done`.
- **New windows:** if your `WKUIDelegate` handles `createWebViewWith`, it won't see Link's new windows any more. Link hands those pages to the opener instead.
