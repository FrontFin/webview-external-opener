import UIKit
import WebKit

/**
 * Opens a hosted payment link (`paymentLink` of a link token requested with `generatePayLink`) in a plain WKWebView,
 * no Link SDK. The page runs the web SDK, which renders Link in an iframe.
 *
 * Link opens wallets, OAuth and other pages through `enableMeshExternalOpener`. The screen closes when Link sends
 * `done`, through `setMeshLinkEventListener`.
 */
final class ExampleViewController: UIViewController {
    // The `paymentLink` of your link token
    private let paymentLink = URL(string: "https://...")!

    private let webView = WKWebView(frame: .zero, configuration: WKWebViewConfiguration())

    override func loadView() {
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        // Before loading: the bridges must be there when Link starts
        setUp(webView)
        webView.load(URLRequest(url: paymentLink, cachePolicy: .reloadIgnoringLocalCacheData))
    }

    private func setUp(_ webView: WKWebView) {
        // Wallets, OAuth and other pages Link opens go to their app, else Safari
        webView.enableMeshExternalOpener()
        // Link closed, after Done or Exit. Weak: the WebView holds the listener
        webView.setMeshLinkEventListener { [weak self] type, _ in
            if type == "done" { self?.dismiss(animated: true) }
        }
    }
}
