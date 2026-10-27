import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, space } from '../theme/tokens';
import { FixedBarContext } from './Nudge';

/** Figma „ActionBar“: feste Button-Leiste unten, Buttons volle Breite, Haupt-Button oben. */
export function ActionBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <FixedBarContext.Provider value>
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space[16]) }]}>{children}</View>
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
});
