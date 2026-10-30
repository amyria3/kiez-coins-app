import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { color } from '../theme/tokens';
import { iconSvgs } from './icons/svgs';

/**
 * Herz-Animation nach dem Posten (Daria, 26.10.2026): Ein Herz springt groß auf, kleine Herzen steigen auf,
 * dann schwebt alles nach oben weg. Liegt über allen Seiten und fängt keine Berührung ab.
 * Mit „Bewegung reduzieren“ blendet das Herz nur kurz ein und aus.
 * Normales Herz statt Doppelherz, denn das Doppelherz steht für den Feed. Die Herzen starten im oberen Viertel,
 * damit sie den Kater auf der Erfolgsseite nicht verdecken (Daria, 30.10.2026).
 */
let fire: (() => void) | null = null;
/** Nach einem erfolgreichen Posten aufrufen */
export const celebratePost = () => fire?.();

const BIG = 96;
const SMALL = [
  { x: -70, delay: 80, size: 26 },
  { x: 58, delay: 160, size: 22 },
  { x: -28, delay: 260, size: 18 },
  { x: 84, delay: 320, size: 16 },
  { x: 20, delay: 420, size: 20 },
];
const native = Platform.OS !== 'web';
const heart = (h: number) => {
  const icon = iconSvgs.heart;
  return <SvgXml xml={icon.svg(color.accent.affection)} width={(icon.width / icon.height) * h} height={h} />;
};

export function HeartBurst() {
  const [run, setRun] = useState(0);
  const reduce = useRef(false);
  const pop = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(0)).current;
  const rise = useRef(SMALL.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => (reduce.current = v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => (reduce.current = v));
    fire = () => setRun((n) => n + 1);
    return () => {
      fire = null;
      sub?.remove();
    };
  }, []);

  useEffect(() => {
    if (!run) return;
    pop.setValue(0);
    out.setValue(0);
    rise.forEach((v) => v.setValue(0));
    const fadeOut = Animated.timing(out, { toValue: 1, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: native });
    const anim = reduce.current
      ? Animated.sequence([
          Animated.timing(pop, { toValue: 1, duration: 160, useNativeDriver: native }),
          Animated.delay(600),
          fadeOut,
        ])
      : Animated.parallel([
          Animated.sequence([
            Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: native }),
            Animated.delay(280),
            fadeOut,
          ]),
          ...rise.map((v, i) =>
            Animated.timing(v, {
              toValue: 1,
              delay: SMALL[i].delay,
              duration: 900,
              easing: Easing.out(Easing.quad),
              useNativeDriver: native,
            }),
          ),
        ]);
    anim.start(({ finished }) => finished && setRun(0));
    return () => anim.stop();
  }, [run, pop, out, rise]);

  if (!run) return null;
  const moving = !reduce.current;
  const opacity = Animated.multiply(pop.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }), out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }));
  const bigStyle = {
    opacity,
    transform: moving
      ? [
          { translateY: out.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) },
          { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
        ]
      : [],
  };
  return (
    <View style={styles.layer} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {moving
        ? SMALL.map((s, i) => (
            <Animated.View
              key={i}
              style={[
                styles.small,
                {
                  opacity: rise[i].interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 0.8, 0] }),
                  transform: [
                    { translateX: s.x },
                    { translateY: rise[i].interpolate({ inputRange: [0, 1], outputRange: [20, -150] }) },
                    { scale: rise[i].interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1, 0.9] }) },
                  ],
                },
              ]}
            >
              {heart(s.size)}
            </Animated.View>
          ))
        : null}
      <Animated.View style={bigStyle}>{heart(BIG)}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Mitte der Ebene bei einem Viertel der Höhe, über dem Kater der Erfolgsseite
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: '50%', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  small: { position: 'absolute' },
});
