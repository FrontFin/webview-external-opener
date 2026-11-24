package com.meshconnect.utils

import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import androidx.webkit.WebViewFeature
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.UIManagerModule

/**
 * Runs the Android snippet ([enableMeshExternalOpener], `android/MeshExternalOpener.kt`) on a react-native-webview.
 * react-native-webview injects scripts into the main frame only on Android, so the React Native snippet can't reach
 * Link's iframe, while `addWebMessageListener` does. Link's events still reach `onMessage`, `window.ReactNativeWebView`
 * is in every frame.
 */
class MeshExternalOpenerModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "MeshExternalOpener"

    /**
     * Enables the opener on the WebView under the view with [reactTag]. Resolves false when there's no WebView, or
     * the device's WebView has no message listeners.
     */
    @ReactMethod
    fun enable(
        reactTag: Double,
        promise: Promise,
    ) {
        // Not there under the New Architecture's bridgeless mode: the opener stays off, see the README
        val uiManager = reactApplicationContext.getNativeModule(UIManagerModule::class.java)
        if (uiManager == null) {
            promise.resolve(false)
            return
        }
        // A UI block runs after the views created so far exist, the WebView included
        uiManager.addUIBlock { resolver ->
            val webView = runCatching { resolver.resolveView(reactTag.toInt()) }.getOrNull()?.findWebView()
            // The snippet does nothing without message listeners, so the page knows it runs without the opener
            val isSupported = WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)
            webView?.enableMeshExternalOpener()
            promise.resolve(webView != null && isSupported)
        }
    }

    private fun View.findWebView(): WebView? =
        when (this) {
            is WebView -> this
            is ViewGroup -> (0 until childCount).firstNotNullOfOrNull { getChildAt(it).findWebView() }
            else -> null
        }
}
