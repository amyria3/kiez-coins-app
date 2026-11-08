import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import Svg, { Path, SvgXml } from 'react-native-svg';

import { iconSvgs } from './icons/svgs';
import { color } from '../theme/tokens';

const B = 42; // Breite der Fläche
const HOEHE = 40;
const SCHIFF_B = 31;
const SCHIFF_H = (SCHIFF_B * iconSvgs.ship.height) / iconSvgs.ship.width;
const PERIODE = 14; // Länge einer Welle

/** Welle über die doppelte Breite, damit sie um eine Periode wandern kann und nahtlos weiterläuft */
function welle(y: number, a: number) {
  let d = `M0 ${y}`;
  for (let x = 0; x < B * 2 + PERIODE; x += PERIODE) {
    d += ` q${PERIODE / 4} ${-a} ${PERIODE / 2} 0 t${PERIODE / 2} 0`;
  }
  return d;
}

function Welle({ y, a, ms, deckkraft, still, farbe }: { y: number; a: number; ms: number; deckkraft: number; still: boolean; farbe: string }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(Animated.timing(x, { toValue: -PERIODE, duration: ms, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [x, ms, still]);
  return (
    <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateX: x }] }}>
      <Svg width={B * 2 + PERIODE} height={HOEHE}>
        <Path d={welle(y, a)} stroke={farbe} strokeWidth={2} strokeLinecap="round" fill="none" opacity={deckkraft} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Darias Schiffchen schaukelt auf ruhigen Wellen, schwarz-weiß (Daria, 2026-11-02). Steht links vor „Was Du so machst“.
 * Mit „Bewegung reduzieren“ steht alles still.
 */
export function SchiffWellen({ farbe = color.text.primary }: { farbe?: string }) {
  const [still, setStill] = useState(false);
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => {});
  }, []);
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, still]);
  const wasser = HOEHE - 7;
  return (
    <View style={{ width: B, height: HOEHE, overflow: 'hidden' }} accessible={false} importantForAccessibility="no-hide-descendants">
      {/* Hintere Welle in derselben Farbe, voll deckend: eine Farbe für die ganze Zeile (Daria, 08.11.2026) */}
      <Welle y={wasser + 4} a={1.6} ms={5200} deckkraft={1} still={still} farbe={farbe} />
      <Animated.View
        style={{
          position: 'absolute',
          left: (B - SCHIFF_B) / 2,
          top: wasser + 1.5 - SCHIFF_H,
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-1, 1.5] }) },
            { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '3deg'] }) },
          ],
        }}
      >
        <SvgXml xml={iconSvgs.ship.svg(farbe)} width={SCHIFF_B} height={SCHIFF_H} />
      </Animated.View>
      <Welle y={wasser} a={2} ms={3600} deckkraft={1} still={still} farbe={farbe} />
    </View>
  );
}
