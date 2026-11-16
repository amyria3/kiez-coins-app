import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { WORDMARK_BOTTOM, WORDMARK_LEFT, WORDMARK_LETTERS, WORDMARK_RIGHT, WORDMARK_TOP } from './icons/wordmarkLetters';

/** Farbe des Schriftzugs wie in assets/marke/wortbildmarke.svg */
const INK = '#7E94FF';
/** Abstand, mit dem die Buchstaben nacheinander starten */
export const LETTER_STAGGER_MS = 70;
/** Fallzeit eines Buchstabens bis zum Aufsetzen, danach federt er kurz nach */
const FALL_MS = 420;
/** Bis alle Buchstaben stehen */
export const START_LOGO_MS = LETTER_STAGGER_MS * (WORDMARK_LETTERS.length - 1) + FALL_MS + 260;

/**
 * Startanimation statt „Moment“ (Daria, 2026-11-16): Die Buchstaben des Schriftzugs „KiezCoins“ fallen nacheinander
 * von oben ins Bild, setzen auf und federn kurz nach, jeder leicht schräg, bis er gerade steht.
 * Mit „Bewegung reduzieren“ steht der Schriftzug gleich da.
 */
export function StartLogo({ width = 220 }: { width?: number }) {
  const scale = width / (WORDMARK_RIGHT - WORDMARK_LEFT);
  const height = (WORDMARK_BOTTOM - WORDMARK_TOP) * scale;
  const drops = useRef(WORDMARK_LETTERS.map(() => new Animated.Value(0))).current;
  const [still, setStill] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(setStill);
  }, []);

  useEffect(() => {
    if (still === undefined) return;
    if (still) {
      drops.forEach((d) => d.setValue(1));
      return;
    }
    const falls = drops.map((d, i) =>
      Animated.sequence([
        Animated.delay(i * LETTER_STAGGER_MS),
        Animated.timing(d, { toValue: 1, duration: FALL_MS, easing: Easing.bezier(0.34, 1.45, 0.64, 1), useNativeDriver: true }),
      ]),
    );
    Animated.parallel(falls).start();
  }, [still, drops]);

  return (
    <View accessibilityRole="image" accessibilityLabel="KiezCoins" style={{ width, height }}>
      {WORDMARK_LETTERS.map((l, i) => {
        const w = (l.x1 - l.x0) * scale;
        const d = drops[i];
        // Jeder zweite Buchstabe kippt anders herum, damit es nicht wie eine Welle aussieht
        const tilt = i % 2 ? '-14deg' : '12deg';
        return (
          <Animated.View
            key={`${l.char}-${i}`}
            style={[
              styles.letter,
              {
                left: (l.x0 - WORDMARK_LEFT) * scale,
                width: w,
                height,
                opacity: d.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] }),
                transform: [
                  { translateY: d.interpolate({ inputRange: [0, 1], outputRange: [-height * 2.2, 0] }) },
                  { rotate: d.interpolate({ inputRange: [0, 1], outputRange: [tilt, '0deg'] }) },
                ],
              },
            ]}
          >
            <Svg width={w} height={height} viewBox={`${l.x0} ${WORDMARK_TOP} ${l.x1 - l.x0} ${WORDMARK_BOTTOM - WORDMARK_TOP}`}>
              <Path d={l.d} fill={INK} />
            </Svg>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  letter: { position: 'absolute', top: 0 },
});
