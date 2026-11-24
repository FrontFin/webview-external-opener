import 'package:flutter/widgets.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

import 'mesh_external_opener.dart';

// The `paymentLink` of your link token
const _paymentLink = 'https://...';

/// Opens a hosted payment link (`paymentLink` of a link token requested with `generatePayLink`) in a plain WebView,
/// no Link SDK. The page runs the web SDK, which renders Link in an iframe.
///
/// Link opens wallets, OAuth and other pages through `enableMeshExternalOpener`. The page closes when Link sends
/// `done`, through `setMeshLinkEventListener`.
class ExamplePage extends StatelessWidget {
  const ExamplePage({super.key});

  @override
  Widget build(BuildContext context) {
    return InAppWebView(
      initialSettings: InAppWebViewSettings(
        javaScriptEnabled: true,
        domStorageEnabled: true,
        cacheMode: CacheMode.LOAD_NO_CACHE,
        // Link runs in an iframe of another origin than the payment page, its session needs third-party cookies
        thirdPartyCookiesEnabled: true,
      ),
      // No initialUrlRequest: the bridges must be there when Link starts, so load after adding them
      onWebViewCreated: (controller) async {
        // Wallets, OAuth and other pages Link opens go to their app, else the browser
        await controller.enableMeshExternalOpener();
        // Link closed, after Done or Exit
        await controller.setMeshLinkEventListener((type, _) {
          if (type == 'done' && context.mounted) Navigator.of(context).pop();
        });
        await controller.loadUrl(
          urlRequest: URLRequest(url: WebUri(_paymentLink)),
        );
      },
    );
  }
}
