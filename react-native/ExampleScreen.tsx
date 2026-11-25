import React, { useRef } from 'react'
import { WebView } from 'react-native-webview'
import { handleMeshMessage, meshWebViewProps } from './meshExternalOpener'

// The `paymentLink` and `linkToken` of your link token response
const paymentLink = 'https://...'
const linkToken = '...'
// The pages that may post to the app: the payment page, and Link, the URL the link token decodes to
const origins = [paymentLink, atob(linkToken)]

/**
 * Opens a hosted payment link (`paymentLink` of a link token requested with `generatePayLink`) in a plain WebView,
 * no Link SDK. The page runs the web SDK, which renders Link in an iframe.
 *
 * Link opens wallets, OAuth and other pages through `meshWebViewProps`. [onClose] runs when Link sends `done`.
 */
export function ExampleScreen({ onClose }: { onClose: () => void }) {
  // Link can send `done` more than once, close once
  const isClosed = useRef(false)
  const close = () => {
    if (isClosed.current) return
    isClosed.current = true
    onClose()
  }
  return (
    <WebView
      source={{ uri: paymentLink }}
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
  )
}
