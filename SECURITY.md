# Security

These snippets decide which URLs leave a host app, so every change needs review from the code owners.

## Rules every snippet follows

- The bridge object is exposed to **Mesh origins only** (`https://*.meshconnect.com`). The platform's origin rules scope the injection; iOS also checks the sending frame's origin on receipt.
- Only `https:` URLs and custom app schemes (wallets) are opened. `http:`, `javascript:`, `file:`, `data:`, `blob:`, `about:`, `content:` and `intent:` URLs are dropped.
- The URL is opened with the OS (`Intent.ACTION_VIEW` + `CATEGORY_BROWSABLE`, `UIApplication.open`, `Linking.openURL`, `launchUrl`), never loaded back into the WebView and never passed to `eval`.
- No logging of the URL: deeplinks and OAuth URLs can carry tokens.

## Reporting a vulnerability

Please don't open a public issue. Email **security@meshconnect.com** with the details and steps to reproduce.
