import React, { useEffect, useRef, useState } from 'react'
import { Platform, View, findNodeHandle } from 'react-native'
import { WebView } from 'react-native-webview'
import { handleMeshMessage, meshWebViewProps } from './meshExternalOpener'
import { enableAndroidOpener } from './meshExternalOpenerAndroid'

// The `paymentLink` and `linkToken` of your link token response
const paymentLink = 'https://...'
const linkToken = '...'
// The pages that may post to the app: the payment page, and Link, the URL the link token decodes to
const origins = [paymentLink, atob(linkToken)]

/**
 * Opens a hosted payment link (`paymentLink` of a link token requested with `generatePayLink`) in a plain WebView,
 * no Link SDK. The page runs the web SDK, which renders Link in an iframe.
 *
 * Link opens wallets, OAuth and other pages through `meshWebViewProps` on iOS, and the native module on Android.
 * [onClose] runs when Link sends `done`.
 */
export function ExampleScreen({ onClose }: { onClose: () => void }) {
  const container = useRef<View>(null)
  // On Android the opener is added natively, and it must be there before the page loads, so the page waits for it
  const [isOpenerReady, setOpenerReady] = useState(Platform.OS !== 'android')
  useEffect(() => {
    if (isOpenerReady) return
    const tag = findNodeHandle(container.current)
    let isMounted = true
    ;(tag == null ? Promise.resolve(false) : enableAndroidOpener(tag))
      .catch(() => false)
      .then((isEnabled) => {
        // Link still runs, but nothing it opens leaves the WebView
        if (!isEnabled) console.warn('Mesh external opener not available')
        if (isMounted) setOpenerReady(true)
      })
    return () => {
      isMounted = false
    }
  }, [isOpenerReady])

  // Link can send `done` more than once, close once
  const isClosed = useRef(false)
  const close = () => {
    if (isClosed.current) return
    isClosed.current = true
    onClose()
  }
  return (
    // Not collapsed: Android finds the WebView under this view's tag
    <View ref={container} collapsable={false} style={{ flex: 1 }}>
      <WebView
        source={isOpenerReady ? { uri: paymentLink } : undefined}
        // Link runs in an iframe of another origin than the payment page, its session needs third-party cookies
        thirdPartyCookiesEnabled
        domStorageEnabled
        cacheEnabled={false}
        // Wallets, OAuth and other pages Link opens go to their app, else the browser
        {...meshWebViewProps}
        onMessage={(event) => {
          // Link closed, after Done or Exit
          if (handleMeshMessage(event, (type) => type === 'done' && close(), origins)) return
          // your own messages
        }}
      />
    </View>
  )
}
