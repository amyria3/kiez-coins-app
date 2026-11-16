import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path, SvgXml } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, space } from '../theme/tokens';
import { t } from '../data/texts';
import { GearsLoader } from './GearsLoader';
import { BILDMARKE_SVG, WORDMARK_LETTERS } from './icons/wordmarkLetters';

/** Wortbildmarke: 105 × 24 Einheiten, Kater im Kreis bei x 0 bis 22, Buchstaben ab x 21,8 */
const MARK_W = 105;
const MARK_H = 24;
const CAT = { x: 0, y: 1, size: 22 };
/** Schriftfarbe wie in assets/marke/wortbildmarke.svg */
const INK = '#7E94FF';

const CAT_IN_MS = 750;
/** Buchstaben starten, wenn der Kater fast da ist */
const LETTERS_IN_AFTER_MS = 450;
const LETTER_STAGGER_MS = 70;
const LETTER_FALL_MS = 420;
const IN_MS = LETTERS_IN_AFTER_MS + LETTER_STAGGER_MS * (WORDMARK_LETTERS.length - 1) + LETTER_FALL_MS;
/** So lange steht das fertige Logo mindestens */
const HOLD_MS = 600;
const LETTER_OUT_STAGGER_MS = 55;
const LETTER_OUT_MS = 380;
const CAT_OUT_MS = 650;
const GEARS_OUT_MS = 1100;
const FADE_MS = 250;

/**
 * Startbildschirm (Daria, 2026-11-16):
 * - Der Kater im Kreis rollt von links ins Bild, die Buchstaben von „KiezCoins“ fallen nacheinander dazu.
 *   Unten drehen die Zahnräder.
 * - Ist die App geladen, gehen die Buchstaben einzeln nacheinander wieder raus (kurz hoch, dann nach unten weg),
 *   der Kater rollt nach rechts aus dem Bild, und die Zahnräder rollen einzeln weg. Dann blendet der Grund aus.
 * - Ein Tipp überspringt die Wartezeit, sobald geladen ist. Mit „Bewegung reduzieren“ steht alles still da und
 *   blendet nur aus.
 * Vorher: Kater mit Besen und Spruch (bis 2026-11-16).
 */
export function StartKater({ loaded, onDone }: { loaded: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height } = useWindowDimensions();
  const logoWidth = Math.round(Math.min(320, screenWidth * 0.78));
  const scale = logoWidth / MARK_W;
  const logoHeight = MARK_H * scale;
  const catSize = CAT.size * scale;
  const gearsSize = Math.round(Math.min(200, height * 0.22));

  const catIn = useRef(new Animated.Value(0)).current;
  const catOut = useRef(new Animated.Value(0)).current;
  const lettersIn = useRef(WORDMARK_LETTERS.map(() => new Animated.Value(0))).current;
  const lettersOut = useRef(WORDMARK_LETTERS.map(() => new Animated.Value(0))).current;
  const gearsOut = useRef(new Animated.Value(0)).current;
  const screen = useRef(new Animated.Value(1)).current;
  const [still, setStill] = useState<boolean | undefined>(undefined);
  const [entered, setEntered] = useState(false);
  const [skip, setSkip] = useState(false);
  const leaving = useRef(false);

  // Die Zahnräder aus public/index.html übernehmen: Ab hier drehen die eigenen an derselben Stelle
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.getElementById('boot')?.remove();
    document.getElementById('boot-moment')?.remove();
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(setStill);
  }, []);

  // Rein: Kater rollt, Buchstaben fallen
  useEffect(() => {
    if (still === undefined) return;
    if (still) {
      catIn.setValue(1);
      lettersIn.forEach((v) => v.setValue(1));
      setEntered(true);
      return;
    }
    Animated.parallel([
      Animated.timing(catIn, { toValue: 1, duration: CAT_IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ...lettersIn.map((v, i) =>
        Animated.sequence([
          Animated.delay(LETTERS_IN_AFTER_MS + i * LETTER_STAGGER_MS),
          Animated.timing(v, { toValue: 1, duration: LETTER_FALL_MS, easing: Easing.bezier(0.34, 1.45, 0.64, 1), useNativeDriver: true }),
        ]),
      ),
    ]).start();
    const timer = setTimeout(() => setEntered(true), IN_MS + HOLD_MS);
    return () => clearTimeout(timer);
  }, [still, catIn, lettersIn]);

  // Raus: Buchstaben einzeln, Kater rollt weg, Zahnräder einzeln, dann der Grund
  const leave = () => {
    if (leaving.current) return;
    leaving.current = true;
    const fade = Animated.timing(screen, { toValue: 0, duration: FADE_MS, useNativeDriver: true });
    if (still) {
      fade.start(() => onDone());
      return;
    }
    Animated.sequence([
      Animated.parallel([
        ...lettersOut.map((v, i) =>
          Animated.sequence([
            Animated.delay(i * LETTER_OUT_STAGGER_MS),
            Animated.timing(v, { toValue: 1, duration: LETTER_OUT_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          ]),
        ),
        Animated.sequence([
          Animated.delay(250),
          Animated.timing(catOut, { toValue: 1, duration: CAT_OUT_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.timing(gearsOut, { toValue: 1, duration: GEARS_OUT_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
      fade,
    ]).start(() => onDone());
  };

  useEffect(() => {
    if (loaded && (entered || skip)) leave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, entered, skip]);

  // Rollen: So weit, wie der Kreis rollt, dreht er sich (Umfang = π × Durchmesser)
  const rollIn = screenWidth / 2 + logoWidth / 2;
  const rollOut = screenWidth;
  const turnsIn = rollIn / (Math.PI * catSize);
  const turnsOut = rollOut / (Math.PI * catSize);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: screen }]}>
      <Pressable
        onPress={() => setSkip(true)}
        style={[styles.area, { paddingBottom: insets.bottom + space[32] + gearsSize + space[24] }]}
        accessibilityRole="button"
        accessibilityLabel={t('Weiter')}
      >
        <View accessibilityRole="image" accessibilityLabel="KiezCoins" style={{ width: logoWidth, height: logoHeight }}>
          <Animated.View
            style={[
              styles.part,
              {
                left: CAT.x * scale,
                top: CAT.y * scale,
                transform: [
                  { translateX: Animated.add(catIn.interpolate({ inputRange: [0, 1], outputRange: [-rollIn, 0] }), catOut.interpolate({ inputRange: [0, 1], outputRange: [0, rollOut] })) },
                  { rotate: catIn.interpolate({ inputRange: [0, 1], outputRange: [`${-turnsIn * 360}deg`, '0deg'] }) },
                  { rotate: catOut.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${turnsOut * 360}deg`] }) },
                ],
              },
            ]}
          >
            <SvgXml xml={BILDMARKE_SVG} width={catSize} height={catSize} />
          </Animated.View>
          {WORDMARK_LETTERS.map((l, i) => {
            const w = (l.x1 - l.x0) * scale;
            const tilt = i % 2 ? '-14deg' : '12deg';
            const outTilt = i % 2 ? '18deg' : '-16deg';
            return (
              <Animated.View
                key={`${l.char}-${i}`}
                style={[
                  styles.part,
                  {
                    left: l.x0 * scale,
                    top: 0,
                    opacity: Animated.multiply(
                      lettersIn[i].interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] }),
                      lettersOut[i].interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
                    ),
                    transform: [
                      { translateY: lettersIn[i].interpolate({ inputRange: [0, 1], outputRange: [-logoHeight * 2.2, 0] }) },
                      // Raus: kurz hoch, dann nach unten weg
                      { translateY: lettersOut[i].interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, -logoHeight * 0.4, logoHeight * 3] }) },
                      { rotate: lettersIn[i].interpolate({ inputRange: [0, 1], outputRange: [tilt, '0deg'] }) },
                      { rotate: lettersOut[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', outTilt] }) },
                    ],
                  },
                ]}
              >
                <Svg width={w} height={logoHeight} viewBox={`${l.x0} 0 ${l.x1 - l.x0} ${MARK_H}`}>
                  <Path d={l.d} fill={INK} />
                </Svg>
              </Animated.View>
            );
          })}
        </View>
      </Pressable>
      <View pointerEvents="none" style={[styles.gears, { bottom: insets.bottom + space[32] }]}>
        <GearsLoader size={gearsSize} exit={gearsOut} exitDistance={screenWidth} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: color.bg.screen, zIndex: 10 },
  area: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  part: { position: 'absolute' },
  gears: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
