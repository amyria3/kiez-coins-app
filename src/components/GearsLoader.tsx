import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Text } from './T';
import { SvgXml } from 'react-native-svg';

import { color, space, text } from '../theme/tokens';
import { GEARS_DURATION, GEARS_VIEWBOX, gears } from './icons/gearsSvgs';
import { t } from '../data/texts';

/**
 * Lade-Animation: sechs ineinandergreifende Zahnräder aus Darias SVG (assets/animations/gears-moving.svg).
 * Jedes Zahnrad dreht sich einzeln um seine Mitte, so wie in der SVG-Animation.
 */
/** Kleine Fassung für Buttons: ein einzelnes Rad (Daria, 22.10.2026) */
export const SMALL_GEARS = [0];

export function GearsLoader({
  size = 96,
  tint = color.text.primary,
  only,
}: {
  /** Breite in pt */
  size?: number;
  tint?: string;
  /** Nur diese Räder (Indizes in gearsSvgs), zugeschnitten auf ihren Umriss */
  only?: number[];
}) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration: GEARS_DURATION, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const shown = only ? gears.filter((_, i) => only.includes(i)) : gears;
  const box = only
    ? {
        x: Math.min(...shown.map((g) => g.x)),
        y: Math.min(...shown.map((g) => g.y)),
        width: Math.max(...shown.map((g) => g.x + g.w)) - Math.min(...shown.map((g) => g.x)),
        height: Math.max(...shown.map((g) => g.y + g.h)) - Math.min(...shown.map((g) => g.y)),
      }
    : { x: 0, y: 0, ...GEARS_VIEWBOX };
  const scale = size / box.width;
  return (
    <View
      style={{ width: size, height: box.height * scale }}
      accessibilityRole="progressbar"
      accessibilityLabel={t('Lädt')}
    >
      {shown.map((g, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: (g.x - box.x) * scale,
            top: (g.y - box.y) * scale,
            width: g.w * scale,
            height: g.h * scale,
            transform: [
              { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${g.turnDeg}deg`] }) },
            ],
          }}
        >
          <SvgXml xml={g.svg(tint)} width={g.w * scale} height={g.h * scale} />
        </Animated.View>
      ))}
    </View>
  );
}

/** Ganze Fläche mit Zahnrädern in der Mitte, optional mit kurzem Text darunter. */
export function LoadingScreen({ label }: { label?: string }) {
  return (
    <View style={styles.screen}>
      {/* Beim Start deutlich größer (Daria, 22.10.2026) */}
      <GearsLoader size={200} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[16], backgroundColor: color.bg.screen },
  label: { ...text.caption, color: color.text.secondary },
});
