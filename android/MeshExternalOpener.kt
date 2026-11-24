package com.meshconnect.utils

// Bridges for a WebView that shows Link without the Link SDK, e.g. a hosted payment link: Link's events, and the
// wallets, OAuth and other pages Link opens outside the WebView

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.webkit.WebView
import androidx.core.net.toUri
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject

/** The object link-v2 would look for, a new name so Link doesn't mistake the page for a native SDK host */
private const val MESH_EXTERNAL_OPENER = "meshExternalOpener"

/**
 * Frames that get the bridges: Link's iframe, wherever it's served from (`web.`, `link.`, sandbox and dev hosts).
 * Doesn't match `https://meshconnect.com` itself. A Mesh page embedding Link is under it too
 */
private const val MESH_ORIGIN_RULE = "https://*.meshconnect.com"

/** The object Link's SDK bridge sends every event to, the same channel the Link SDKs read */
private const val LINK_JS_BRIDGE = "JSBridge"

/** No scheme, or one the WebView loads itself */
private val BLOCKED_SCHEMES = setOf(null, "about", "data", "blob", "javascript", "file")

/**
 * Let's Link open wallets, OAuth and other pages outside this WebView (proposed link-v2 change): Link calls
 * `window.meshExternalOpener.postMessage(url)` instead of opening a window, and the URL goes to the app that claims
 * it, else the browser. Only frames matching [MESH_ORIGIN_RULE] get the object, Link's cross-origin iframe included.
 *
 * Call before loading the page, so the object is there when Link starts. Does nothing on a WebView without message
 * listeners, there nothing leaves the WebView.
 */
fun WebView.enableMeshExternalOpener() {
    if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return
    // The app's context, so the listener doesn't hold the activity. NEW_TASK opens the target in its own task
    val appContext = context.applicationContext
    WebViewCompat.addWebMessageListener(this, MESH_EXTERNAL_OPENER, setOf(MESH_ORIGIN_RULE)) { _, message, _, _, _ ->
        val uri = message.data?.toUri() ?: return@addWebMessageListener
        // A frame shouldn't make the app start javascript: or file: links
        if (uri.scheme?.lowercase() !in BLOCKED_SCHEMES) appContext.openExternal(uri)
    }
}

/** The app that claims [uri], else the browser, in its own task. Ignores a URL nothing handles */
private fun Context.openExternal(uri: Uri) {
    runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)
        .addCategory(Intent.CATEGORY_BROWSABLE)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
}

/**
 * Receives Link's events in a WebView that shows Link without the Link SDK, e.g. a hosted payment link. Link posts
 * each one as JSON to `window.JSBridge.postMessage`, on top of what it sends the surrounding page, and [listener] gets
 * its `type` and the whole JSON on the main thread:
 *
 * - `done`: Link closed, after Done or Exit
 * - `transferFinished`: the transfer's result
 * - `brokerageAccountAccessToken`: an integration connected
 * - `loaded` and the analytics events, e.g. `integrationSelected`
 *
 * With the bridge Link also offers Close on a boot error, which sends `done`. Only frames matching
 * [MESH_ORIGIN_RULE] get it. Call before loading the page. Does nothing on a WebView without message listeners.
 */
fun WebView.setMeshLinkEventListener(listener: (type: String, json: String) -> Unit) {
    if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return
    WebViewCompat.addWebMessageListener(this, LINK_JS_BRIDGE, setOf(MESH_ORIGIN_RULE)) { _, message, _, _, _ ->
        val json = message.data ?: return@addWebMessageListener
        val type = runCatching { JSONObject(json).optString("type") }.getOrNull()
        if (!type.isNullOrEmpty()) listener(type, json)
    }
}
