import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import Svg, { Path, SvgXml } from 'react-native-svg';

import { iconSvgs } from './icons/svgs';
import { color } from '../theme/tokens';

const B = 42; // Breite der Fläche
const HEIGHT = 40;
const SHIP_W = 31;
const SHIP_H = (SHIP_W * iconSvgs.ship.height) / iconSvgs.ship.width;
const PERIOD = 14; // Länge einer Welle

/** Welle über die doppelte Breite, damit sie um eine Periode wandern kann und nahtlos weiterläuft */
function wave(y: number, a: number) {
  let d = `M0 ${y}`;
  for (let x = 0; x < B * 2 + PERIOD; x += PERIOD) {
    d += ` q${PERIOD / 4} ${-a} ${PERIOD / 2} 0 t${PERIOD / 2} 0`;
  }
  return d;
}

function Wave({ y, a, ms, strokeOpacity, still, tint }: { y: number; a: number; ms: number; strokeOpacity: number; still: boolean; tint: string }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(Animated.timing(x, { toValue: -PERIOD, duration: ms, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [x, ms, still]);
  return (
    <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateX: x }] }}>
      <Svg width={B * 2 + PERIOD} height={HEIGHT}>
        <Path d={wave(y, a)} stroke={tint} strokeWidth={2} strokeLinecap="round" fill="none" opacity={strokeOpacity} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Darias Schiffchen schaukelt auf ruhigen Wellen, schwarz-weiß (Daria, 2026-11-02). Steht links vor „Was Du so machst“.
 * Mit „Bewegung reduzieren“ steht alles still.
 */
export function ShipWaves({ tint = color.text.primary }: { tint?: string }) {
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
  const water = HEIGHT - 7;
  return (
    <View style={{ width: B, height: HEIGHT, overflow: 'hidden' }} accessible={false} importantForAccessibility="no-hide-descendants">
      {/* Hintere Welle in derselben Farbe, voll deckend: eine Farbe für die ganze Zeile (Daria, 08.11.2026) */}
      <Wave y={water + 4} a={1.6} ms={5200} strokeOpacity={1} still={still} tint={tint} />
      <Animated.View
        style={{
          position: 'absolute',
          left: (B - SHIP_W) / 2,
          top: water + 1.5 - SHIP_H,
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-1, 1.5] }) },
            { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '3deg'] }) },
          ],
        }}
      >
        <SvgXml xml={iconSvgs.ship.svg(tint)} width={SHIP_W} height={SHIP_H} />
      </Animated.View>
      <Wave y={water} a={2} ms={3600} strokeOpacity={1} still={still} tint={tint} />
    </View>
  );
}
