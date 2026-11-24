package com.meshconnect.payer.ui.paylink

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import com.meshconnect.utils.enableMeshExternalOpener
import com.meshconnect.utils.setMeshLinkEventListener

/**
 * Opens a hosted payment link (`paymentLink` of a link token requested with `generatePayLink`) in a plain WebView,
 * no Link SDK. The page runs the web SDK, which renders Link in an iframe.
 *
 * Link opens wallets, OAuth and other pages through [enableMeshExternalOpener]. The screen closes when Link sends
 * `done`, through [setMeshLinkEventListener].
 */
class ExampleActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    // The `paymentLink` of your link token
    private val paymentLink = "https://..."

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)
        // Before loading: the bridges must be there when Link starts
        setUp(webView)
        if (savedInstanceState == null) {
            webView.loadUrl(paymentLink)
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setUp(webView: WebView) {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            cacheMode = WebSettings.LOAD_NO_CACHE
        }

        // Link runs in an iframe of another origin than the payment page, its session needs third-party cookies
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        // Without a client the WebView hands every page navigation to the browser, redirects of the page included
        webView.webViewClient = WebViewClient()

        // Wallets, OAuth and other pages Link opens go to their app, else the browser
        webView.enableMeshExternalOpener()

        // Link closed, after Done or Exit
        webView.setMeshLinkEventListener { type, _ -> if (type == "done") finish() }
    }
}
