import * as WebBrowser from 'expo-web-browser';
import { C } from '@/lib/theme';

export const WEB_ORIGIN = 'https://exosky-beta.vercel.app';
/** Opens a web-app route in the in-app browser (SFSafariViewController / Custom Tabs). */
export const openWeb = (path: string) =>
  WebBrowser.openBrowserAsync(WEB_ORIGIN + path, {
    toolbarColor: C.bg,
    controlsColor: C.green,
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  });
