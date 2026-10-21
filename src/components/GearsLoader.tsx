import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { color, space, text } from '../theme/tokens';
import { GEARS_DURATION, GEARS_VIEWBOX, gears } from './icons/gearsSvgs';

/**
 * Lade-Animation: sechs ineinandergreifende Zahnräder aus Darias SVG (assets/animations/gears-moving.svg).
 * Jedes Zahnrad dreht sich einzeln um seine Mitte, so wie in der SVG-Animation.
 */
export function GearsLoader({ size = 96, tint = color.text.primary }: { size?: number; tint?: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration: GEARS_DURATION, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const scale = size / GEARS_VIEWBOX.width;
  return (
    <View
      style={{ width: size, height: GEARS_VIEWBOX.height * scale }}
      accessibilityRole="progressbar"
      accessibilityLabel="Lädt"
    >
      {gears.map((g, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: g.x * scale,
            top: g.y * scale,
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
      <GearsLoader />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[16], backgroundColor: color.bg.screen },
  label: { ...text.caption, color: color.text.secondary },
});
