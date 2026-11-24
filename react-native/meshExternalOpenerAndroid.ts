// Android half of the opener for react-native-webview: meshExternalOpener.ts doesn't reach Link's iframe on Android, so
// the Android snippet runs behind a native module, see android/

import { NativeModules } from 'react-native'

type MeshExternalOpenerModule = {
  enable(reactTag: number): Promise<boolean>
}

/**
 * Calls the Android snippet's `enableMeshExternalOpener()` on the WebView under the view with [reactTag]. Call it
 * before the WebView loads the page, so `window.meshExternalOpener` is there when Link starts.
 *
 * Resolves false when the native module isn't registered, there's no WebView, or the device's WebView has no message
 * listeners: Link then runs without the opener.
 */
export function enableAndroidOpener(reactTag: number): Promise<boolean> {
  const module = NativeModules.MeshExternalOpener as MeshExternalOpenerModule | undefined
  return module?.enable(reactTag) ?? Promise.resolve(false)
}
