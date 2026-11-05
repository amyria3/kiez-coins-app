import { createContext, useContext, type ReactNode } from 'react';
import { Linking, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';

import { color, isFashionable, radius as radii, space, text } from '../theme/tokens';
import { GlassEdge } from './GlassEdge';
import { Text } from './T';

/*
 * Leichter Stil der Verwaltungsseiten (Daria, 2026-11-05): Bergfoto über den ganzen Bildschirm,
 * Karten, Zeilen und Leisten aus Milchglas mit Verlaufsrand. Nur im Kiez-Look, der Fashionable Look bleibt flach.
 */

const wallpaper = require('../../assets/wallpaper/berge-peter-fazekas.jpg');

/** Halbtransparente Füllung der Glaskarten, darunter liegt der Blur */
export const GLASS_FILL = 'rgba(36, 33, 31, 0.15)';
/** Etwas dunkler für Kopf- und Fußleiste */
export const GLASS_BAR_FILL = 'rgba(25, 23, 22, 0.15)';

const GlassContext = createContext(false);

/** true, wenn die Fläche auf dem Foto liegt und Glas sein soll */
export function useGlass() {
  return useContext(GlassContext);
}

/** Schaltet Glas für alles darin ein. Im Fashionable Look bleibt es aus. */
export function GlassProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  return <GlassContext.Provider value={enabled && !isFashionable}>{children}</GlassContext.Provider>;
}

/** Foto als Hintergrund über die ganze Fläche */
export function Wallpaper() {
  if (isFashionable) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wallpaper]}>
      <Image source={wallpaper} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={[StyleSheet.absoluteFill, styles.wallpaperDim]} />
    </View>
  );
}

/**
 * Blur und Verlaufsrand einer Glasfläche. Als erstes Kind in eine Fläche mit `overflow: 'hidden'` legen.
 * `radius` ist der Eckenradius der Fläche, ohne ihn gibt es keinen Rand (z. B. für Leisten).
 */
export function GlassFill({ radius }: { radius?: number }) {
  if (isFashionable) return null;
  return (
    <>
      <BlurView intensity={80} tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
      {radius === undefined ? null : <GlassEdge radius={radius} />}
    </>
  );
}

/** Stil einer Glasfläche: halbtransparent und beschnitten, damit Blur und Rand die Ecken halten */
export function glassSurface(glass: boolean): StyleProp<ViewStyle> {
  return glass ? styles.surface : null;
}

/** Bildnachweis klein in der Fußleiste, nicht über dem Foto (Daria, 2026-11-05) */
export function PhotoCredit() {
  if (isFashionable) return null;
  return (
    <Text style={styles.credit} accessibilityRole="link" onPress={() => Linking.openURL('https://www.pexels.com/de-de/@peterfazekas/')}>
      Foto: Peter Fazekas, Pexels
    </Text>
  );
}

export const glassStyles = StyleSheet.create({
  bar: isFashionable ? {} : { overflow: 'hidden', backgroundColor: GLASS_BAR_FILL },
  // Fußleiste oben gebogen statt einer Linie (Daria, 2026-11-05)
  footer: isFashionable ? {} : { borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card },
});

const styles = StyleSheet.create({
  wallpaper: { overflow: 'hidden' },
  wallpaperDim: { backgroundColor: 'rgba(25, 23, 22, 0.1)' },
  surface: { overflow: 'hidden', backgroundColor: GLASS_FILL },
  credit: { ...text.caption, fontSize: 11, lineHeight: 14, color: color.text.secondary, textAlign: 'center', paddingTop: space[2] },
});
