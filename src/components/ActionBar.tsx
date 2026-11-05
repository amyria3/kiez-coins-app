import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, space } from '../theme/tokens';
import { FixedBarContext } from './Nudge';

/** Figma „ActionBar“: feste Button-Leiste unten, Buttons volle Breite, Haupt-Button oben. */
/** `transparent`: ohne eigene Fläche, z. B. über einem Hintergrundfoto mit Milchglas dahinter */
export function ActionBar({ children, transparent }: { children: ReactNode; transparent?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <FixedBarContext.Provider value>
      <View style={[styles.bar, transparent && styles.transparent, { paddingBottom: Math.max(insets.bottom, space[16]) }]}>{children}</View>
    </FixedBarContext.Provider>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: color.bg.screen,
    paddingTop: space[12],
    paddingHorizontal: space[16],
    gap: space[8],
  },
  transparent: { backgroundColor: 'transparent' },
});
