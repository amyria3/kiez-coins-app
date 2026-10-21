import { Platform, useWindowDimensions } from 'react-native';

/**
 * Größte Breite der App im Browser. Breitere Fenster zeigen die App mittig in dieser Breite,
 * wie auf einem Telefon. Muss zu `max-width` von `#root` in `public/index.html` passen.
 */
export const WEB_MAX_WIDTH = 480;

/** Wie `useWindowDimensions`, im Browser aber höchstens `WEB_MAX_WIDTH` breit. */
export function useAppDimensions() {
  const window = useWindowDimensions();
  if (Platform.OS !== 'web') return window;
  return { ...window, width: Math.min(window.width, WEB_MAX_WIDTH) };
}
