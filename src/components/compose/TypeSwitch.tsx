import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { t } from '../../data/texts';
import { color, font, isInstagram, motion, radius, stroke } from '../../theme/tokens';
import { Text } from '../T';

/**
 * Schalter für den Beitragstyp beim Erstellen (Daria, 23.10.2026): Challenge, Vorher-Nachher, Bild.
 * Look „Kiez“: Pille mit getönter Markierung. Look „Instagram“: Reiter mit Strich darunter.
 * Die Markierung gleitet mit der Bewegung „Schranke“.
 */
export function TypeSwitch<K extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}) {
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(index)).current;
  useEffect(() => {
    Animated.timing(x, {
      toValue: index,
      duration: motion.barrier.duration,
      easing: Easing.bezier(...motion.barrier.bezier),
      useNativeDriver: true,
    }).start();
  }, [index, x]);
  const inner = width - (isInstagram ? 0 : PAD * 2);
  const segment = inner / options.length;
  return (
    <View
      style={styles.track}
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { width: segment, transform: [{ translateX: Animated.multiply(x, segment) }] }]}
        />
      ) : null}
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.key)}
            style={styles.option}
          >
            <Text style={[styles.label, selected && styles.selected]} numberOfLines={1}>
              {t(o.label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const PAD = 3;

const styles = StyleSheet.create({
  track: isInstagram
    ? { flexDirection: 'row', borderBottomWidth: stroke.thin, borderBottomColor: color.line.hairline }
    : { flexDirection: 'row', padding: PAD, borderRadius: radius.full, backgroundColor: color.bg.surface },
  indicator: isInstagram
    ? { position: 'absolute', left: 0, bottom: -stroke.thin, height: 1.5, backgroundColor: color.text.primary }
    : {
        position: 'absolute',
        left: PAD,
        top: PAD,
        bottom: PAD,
        borderRadius: radius.full,
        backgroundColor: `${color.accent.primary}2E`,
      },
  option: { flex: 1, minHeight: isInstagram ? 44 : 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: isInstagram ? 0 : 4 },
  label: isInstagram
    ? // Drei Begriffe in Großbuchstaben passen auch auf 360 pt Breite
      { fontFamily: font.semiBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.3, textTransform: 'uppercase', color: color.text.secondary }
    : { fontFamily: font.regular, fontSize: 13, lineHeight: 16, color: color.text.secondary },
  selected: isInstagram ? { color: color.text.primary } : { color: color.accent.primary, fontFamily: font.medium },
});
