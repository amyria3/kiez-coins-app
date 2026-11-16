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
  // Große Räder wie die Icons in #EEE0C9 (Daria, 2026-11-05: „falsches Weiß“)
  tint = color.icon.large,
  only,
  exit,
  exitDistance = 600,
}: {
  /** Breite in pt */
  size?: number;
  tint?: string;
  /** Nur diese Räder (Indizes in gearsSvgs), zugeschnitten auf ihren Umriss */
  only?: number[];
  /**
   * Start (Daria, 2026-11-16): Läuft von 0 auf 1, rollen die Räder einzeln aus dem Bild, in verschiedene Richtungen
   * („die Zahnräder müssen in verschiedene Richtungen davonrollen“): die rechte Hälfte nach rechts, die linke nach
   * links, die äußeren zuerst. Jedes dreht sich dabei so weit, wie es rollt.
   */
  exit?: Animated.Value;
  /** Wie weit sie rollen, in pt */
  exitDistance?: number;
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
      {shown.map((g, i) => {
        const spin = (
          <Animated.View
            style={{
              width: g.w * scale,
              height: g.h * scale,
              transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${g.turnDeg}deg`] }) }],
            }}
          >
            <SvgXml xml={g.svg(tint)} width={g.w * scale} height={g.h * scale} />
          </Animated.View>
        );
        const place = { position: 'absolute' as const, left: (g.x - box.x) * scale, top: (g.y - box.y) * scale };
        if (!exit) return <View key={i} style={place}>{spin}</View>;
        // Richtung nach der Lage des Rads; die äußeren zuerst, je Rad ein eigener Abschnitt des Fortschritts
        const centerX = (g.x + g.w / 2 - box.x) / box.width;
        const dir = centerX >= 0.5 ? 1 : -1;
        const order = [...shown].sort((a, b) => Math.abs(b.x + b.w / 2 - box.x - box.width / 2) - Math.abs(a.x + a.w / 2 - box.x - box.width / 2)).indexOf(g);
        const start = Math.min(order * 0.1, 0.5);
        const range = [start, start + 0.5];
        const turns = (dir * exitDistance) / (Math.PI * g.w * scale);
        return (
          <Animated.View
            key={i}
            style={[
              place,
              {
                transform: [
                  { translateX: exit.interpolate({ inputRange: range, outputRange: [0, dir * exitDistance], extrapolate: 'clamp' }) },
                  { rotate: exit.interpolate({ inputRange: range, outputRange: ['0deg', `${turns * 360}deg`], extrapolate: 'clamp' }) },
                ],
              },
            ]}
          >
            {spin}
          </Animated.View>
        );
      })}
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
