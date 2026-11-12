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
  // Immer derselbe Provider an derselben Stelle: Wechselte der Baum hier zwischen Fragment und Provider,
  // baute React die ganze App neu auf, sobald die Tastatur den Abstand über 34 pt hob. Die App startete
  // dann beim Tippen neu, mit Kater-Intro und frisch geladenem Feed (Daria, 12.11.2026).
  const value = Platform.OS === 'web' && insets.bottom > WEB_MAX_BOTTOM_INSET ? { ...insets, bottom: WEB_MAX_BOTTOM_INSET } : insets;
  return <SafeAreaInsetsContext.Provider value={value}>{children}</SafeAreaInsetsContext.Provider>;
}
