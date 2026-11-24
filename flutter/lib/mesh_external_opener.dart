// Bridges for a flutter_inappwebview WebView that shows Link without the Link SDK, e.g. a hosted payment link:
// Link's events, and the wallets, OAuth and other pages Link opens outside the WebView

import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:url_launcher/url_launcher.dart';

/// The object Link looks for, a new name so Link doesn't mistake the page for a native SDK host
const _meshExternalOpener = 'meshExternalOpener';

/// The object Link's SDK bridge sends every event to, the same channel the Link SDKs read
const _linkJsBridge = 'JSBridge';

/// Frames that get the bridges: Link's iframe, wherever it's served from (`web.`, `link.`, sandbox and dev hosts).
/// Doesn't match `https://meshconnect.com` itself. A Mesh page embedding Link is under it too
const _meshOriginRule = 'https://*.meshconnect.com';

/// No scheme, or one the WebView loads itself
const _blockedSchemes = {'', 'about', 'data', 'blob', 'javascript', 'file'};

extension MeshLinkWebView on InAppWebViewController {
  /// Lets Link open wallets, OAuth and other pages outside this WebView: Link calls
  /// `window.meshExternalOpener.postMessage(url)` instead of opening a window, and the URL goes to the app that
  /// claims it, else the browser. Only frames matching [_meshOriginRule] get the object, Link's cross-origin iframe
  /// included.
  ///
  /// Call before loading the page, so the object is there when Link starts. Does nothing on an Android WebView
  /// without message listeners, there nothing leaves the WebView.
  Future<void> enableMeshExternalOpener() async {
    if (!await _supportsMessageListeners()) return;
    await addWebMessageListener(
      WebMessageListener(
        jsObjectName: _meshExternalOpener,
        allowedOriginRules: {_meshOriginRule},
        onPostMessage: (message, sourceOrigin, isMainFrame, replyProxy) {
          final url = message?.data;
          if (url is String) _openExternal(url);
        },
      ),
    );
  }

  /// Receives Link's events in a WebView that shows Link without the Link SDK, e.g. a hosted payment link. Link posts
  /// each one as JSON to `window.JSBridge.postMessage`, on top of what it sends the surrounding page, and [listener]
  /// gets its `type` and the whole JSON:
  ///
  /// - `done`: Link closed, after Done or Exit
  /// - `transferFinished`: the transfer's result
  /// - `brokerageAccountAccessToken`: an integration connected
  /// - `loaded` and the analytics events, e.g. `integrationSelected`
  ///
  /// With the bridge Link also offers Close on a boot error, which sends `done`. Only frames matching
  /// [_meshOriginRule] get it. Call before loading the page. Does nothing on an Android WebView without message
  /// listeners.
  Future<void> setMeshLinkEventListener(
    void Function(String type, String json) listener,
  ) async {
    if (!await _supportsMessageListeners()) return;
    await addWebMessageListener(
      WebMessageListener(
        jsObjectName: _linkJsBridge,
        allowedOriginRules: {_meshOriginRule},
        onPostMessage: (message, sourceOrigin, isMainFrame, replyProxy) {
          final json = message?.data;
          if (json is! String) return;
          try {
            final type = (jsonDecode(json) as Map<String, dynamic>)['type'];
            if (type is String && type.isNotEmpty) listener(type, json);
          } catch (_) {
            // Not one of Link's events
          }
        },
      ),
    );
  }
}

Future<bool> _supportsMessageListeners() async =>
    defaultTargetPlatform != TargetPlatform.android ||
    await WebViewFeature.isFeatureSupported(
      WebViewFeature.WEB_MESSAGE_LISTENER,
    );

/// The app that claims [url], else the browser. Ignores a URL nothing handles
Future<void> _openExternal(String url) async {
  final uri = Uri.tryParse(url);
  // A frame shouldn't make the app start javascript: or file: links
  if (uri == null || _blockedSchemes.contains(uri.scheme.toLowerCase())) return;
  try {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (_) {}
}
