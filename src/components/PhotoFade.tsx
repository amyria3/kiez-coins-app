import { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { color } from '../theme/tokens';

/**
 * Weicher Verlauf am unteren Fotorand, auf dem Titel und Urheber ruhig sitzen (Mono, Daria, 2026-11-25: „höchstens
 * einen leichten graduellen Blur“). Ersetzt dort die Glasleiste: kein harter Balken, das Foto läuft nach unten
 * dunkler aus. Ohne `color.overlay.fade` zeichnet er nichts.
 */
export function PhotoFade({ style }: { style?: StyleProp<ViewStyle> }) {
  const id = `fade${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const fade = color.overlay.fade;
  if (!fade) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fade} stopOpacity={0} />
            <Stop offset="0.45" stopColor={fade} stopOpacity={0.22} />
            <Stop offset="1" stopColor={fade} stopOpacity={0.6} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
