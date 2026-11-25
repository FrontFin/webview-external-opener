package com.meshconnect.utils

import com.facebook.react.uimanager.ThemedReactContext
import com.reactnativecommunity.webview.RNCWebViewManager
import com.reactnativecommunity.webview.RNCWebViewWrapper

/**
 * react-native-webview's WebView with the Android snippet's opener ([enableMeshExternalOpener],
 * `android/MeshExternalOpener.kt`), added before any page loads. react-native-webview injects scripts into the main
 * frame only on Android, so the React Native snippet can't reach Link's iframe, while `addWebMessageListener` does.
 * `meshWebViewProps` picks it through `nativeConfig`.
 */
class MeshWebViewManager : RNCWebViewManager() {
    override fun getName() = "MeshWebView"

    override fun createViewInstance(context: ThemedReactContext): RNCWebViewWrapper =
        super.createViewInstance(context).also { it.webView.enableMeshExternalOpener() }
}
