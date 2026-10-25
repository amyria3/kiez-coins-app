import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Größter echter Abstand unten im Browser: Home-Balken des iPhones (34 pt).
 * Ecosia und andere iOS-Browser mit eigener WebView melden nach offener Tastatur
 * `env(safe-area-inset-bottom)` zeitweise in Tastaturhöhe (rund 400 pt). Der Platzhalter
 * unter jeder SubScreen schnitt den Inhalt dann mitten auf dem Bildschirm ab (Daria, 25.10.2026).
 */
const WEB_MAX_BOTTOM_INSET = 34;

/** Begrenzt im Browser den unteren Abstand, den `useSafeAreaInsets` überall liefert. */
export function WebSafeArea({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'web' || insets.bottom <= WEB_MAX_BOTTOM_INSET) return <>{children}</>;
  return (
    <SafeAreaInsetsContext.Provider value={{ ...insets, bottom: WEB_MAX_BOTTOM_INSET }}>{children}</SafeAreaInsetsContext.Provider>
  );
}
