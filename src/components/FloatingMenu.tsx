import { useState, type ReactNode } from 'react';
import { BlurView } from 'expo-blur';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { placeMenu, type Rect } from '../lib/menuPlacement';
import { color, radius, scheme, space, stroke } from '../theme/tokens';

export type { Rect } from '../lib/menuPlacement';

/**
 * Aufklappendes Menü neben einem Knopf (Zahnrad, drei Punkte), immer ganz sichtbar (Daria, 2026-11-25):
 * klappt nach unten oder oben, je nachdem wo Platz ist, lässt Statusleiste und Home-Balken frei, stößt am Rand an
 * und scrollt in sich, wenn es nirgends ganz passt. Grund: Blur und halbdurchsichtige Kartenfarbe, in jedem Look.
 *
 * Liegt absolut in einer Fläche, deren Lage im Fenster `bounds` angibt (ohne Angabe: das ganze Fenster, z. B.
 * in einem Modal). Bis die Höhe gemessen ist, bleibt es unsichtbar, damit es nicht springt.
 */
export function FloatingMenu({
  anchor,
  bounds,
  minWidth = 200,
  onRect,
  children,
}: {
  /** Lage des Knopfs im Fenster (measureInWindow) */
  anchor: Rect;
  bounds?: Rect;
  minWidth?: number;
  /** Lage des Menüs im Fenster, z. B. um Tipps außerhalb zu erkennen */
  onRect?: (rect: Rect) => void;
  children: ReactNode;
}) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [menuHeight, setMenuHeight] = useState(0);
  const area = bounds ?? { x: 0, y: 0, w: window.width, h: window.height };
  const p = placeMenu({
    anchor,
    bounds: area,
    insets,
    windowWidth: window.width,
    windowHeight: window.height,
    menuHeight,
    gap: space[6],
    margin: space[8],
  });
  const height = Math.min(menuHeight, p.maxHeight);
  // Lage im Fenster melden, sobald sie feststeht
  const report = (width: number) => {
    if (!menuHeight || !onRect) return;
    onRect({ x: area.x + area.w - p.right - width, y: area.y + p.top, w: width, h: height });
  };
  return (
    <View
      style={[
        styles.menu,
        { top: p.top, right: p.right, maxHeight: p.maxHeight, maxWidth: p.maxWidth, minWidth: Math.min(minWidth, p.maxWidth) },
        !menuHeight && styles.measuring,
      ]}
      accessibilityRole="menu"
      onLayout={(e) => report(e.nativeEvent.layout.width)}
    >
      <BlurView intensity={40} tint={scheme} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={[StyleSheet.absoluteFill, styles.tint]} pointerEvents="none" />
      <ScrollView
        style={styles.scroll}
        scrollEnabled={p.scroll}
        bounces={false}
        showsVerticalScrollIndicator={p.scroll}
        persistentScrollbar={p.scroll}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={(_, h) => setMenuHeight(h)}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    zIndex: 100,
    borderRadius: radius.lg,
    borderWidth: stroke.ultraThin,
    borderColor: color.line.hairline,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  measuring: { opacity: 0 },
  tint: { backgroundColor: color.bg.menu },
  // Eigene Ebene: Sonst liegen Blur und Tönung im Web über den Einträgen
  scroll: { position: 'relative', flexGrow: 0, flexShrink: 1 },
});
