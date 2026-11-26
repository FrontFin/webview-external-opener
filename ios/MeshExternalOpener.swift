// Bridges for a WKWebView that shows Link without the Link SDK, e.g. a hosted payment link: Link's events, and the
// wallets, OAuth and other pages Link opens outside the WebView

import UIKit
import WebKit

/** The object Link looks for, a new name so Link doesn't mistake the page for a native SDK host */
private let meshExternalOpener = "meshExternalOpener"

/** The handler Link's SDK bridge sends every event to, the same channel the Link SDKs read */
private let linkMessageHandler = "jsMessageHandler"

/**
 * Frames that get the bridges: Link's iframe, wherever it's served from (`web.`, `link.`, sandbox and dev hosts).
 * Doesn't match `https://meshconnect.com` itself. A Mesh page embedding Link is under it too
 */
private let meshHostSuffix = ".meshconnect.com"

/** No scheme, or one the WebView loads itself */
private let blockedSchemes: Set<String?> = [nil, "about", "data", "blob", "javascript", "file"]

@MainActor
private func isMeshOrigin(_ origin: WKSecurityOrigin) -> Bool {
    origin.protocol == "https" && origin.host.hasSuffix(meshHostSuffix)
}

extension WKWebView {
    /**
     * Lets Link open wallets, OAuth and other pages outside this WebView: Link calls
     * `window.meshExternalOpener.postMessage(url)` instead of opening a window, and the URL goes to the app that
     * claims it, else Safari. Only frames on a Mesh origin get the object, Link's cross-origin iframe included.
     *
     * WKWebView exposes handlers as `window.webkit.messageHandlers.<name>`, so a user script defines
     * `window.meshExternalOpener` in those frames and forwards to the handler.
     *
     * Call before loading the page, so the object is there when Link starts.
     */
    func enableMeshExternalOpener() {
        let shim = """
        if (location.protocol === 'https:' && location.hostname.endsWith('\(meshHostSuffix)')) {
          window.\(meshExternalOpener) = {
            postMessage: function (u) {
              window.webkit.messageHandlers.\(meshExternalOpener).postMessage(String(u));
            }
          };
        }
        """
        let controller = configuration.userContentController
        // Link runs in an iframe: every frame gets the script, the shim keeps the object to Mesh origins. Once only,
        // a repeated call replaces the handler below but would stack the script
        if !controller.userScripts.contains(where: { $0.source == shim }) {
            controller.addUserScript(WKUserScript(source: shim, injectionTime: .atDocumentStart, forMainFrameOnly: false))
        }
        controller.removeScriptMessageHandler(forName: meshExternalOpener)
        controller.add(MessageHandler { message in
            // Checked again here: the handler itself is reachable from every frame
            guard isMeshOrigin(message.frameInfo.securityOrigin),
                  let string = message.body as? String,
                  let url = URL(string: string),
                  !blockedSchemes.contains(url.scheme?.lowercased())
            else { return }
            // Universal links open the wallet app if installed, otherwise Safari
            UIApplication.shared.open(url)
        }, name: meshExternalOpener)
    }

    /**
     * Receives Link's events in a WebView that shows Link without the Link SDK, e.g. a hosted payment link. Link posts
     * each one to `window.webkit.messageHandlers.jsMessageHandler`, on top of what it sends the surrounding page, and
     * [listener] gets its `type` and the whole event as JSON on the main thread:
     *
     * - `done`: Link closed, after Done or Exit
     * - `transferFinished`: the transfer's result
     * - `brokerageAccountAccessToken`: an integration connected
     * - `loaded` and the analytics events, e.g. `integrationSelected`
     *
     * With the bridge Link also offers Close on a boot error, which sends `done`. Only frames on a Mesh origin are
     * heard. Call before loading the page. The WebView holds [listener]: capture your screen weakly.
     */
    func setMeshLinkEventListener(_ listener: @escaping @MainActor (_ type: String, _ json: String) -> Void) {
        let controller = configuration.userContentController
        controller.removeScriptMessageHandler(forName: linkMessageHandler)
        controller.add(MessageHandler { message in
            guard isMeshOrigin(message.frameInfo.securityOrigin),
                  let event = message.body as? [String: Any],
                  let type = event["type"] as? String, !type.isEmpty,
                  JSONSerialization.isValidJSONObject(event),
                  let data = try? JSONSerialization.data(withJSONObject: event),
                  let json = String(data: data, encoding: .utf8)
            else { return }
            listener(type, json)
        }, name: linkMessageHandler)
    }

}

@MainActor
private final class MessageHandler: NSObject, WKScriptMessageHandler {
    private let onMessage: @MainActor (WKScriptMessage) -> Void

    init(_ onMessage: @escaping @MainActor (WKScriptMessage) -> Void) {
        self.onMessage = onMessage
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        onMessage(message)
    }
}
