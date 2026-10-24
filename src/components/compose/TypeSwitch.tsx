import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { t } from '../../data/texts';
import { color, font, isFashionable, motion, radius, stroke } from '../../theme/tokens';
import { Text } from '../T';

/**
 * Schalter für den Beitragstyp beim Erstellen (Daria, 23.10.2026): Challenge, Vorher-Nachher, Bild.
 * Look „Kiez“: Pille mit getönter Markierung. Look „Fashionable“: Reiter mit Strich darunter.
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
  // Jedes Feld so breit wie sein Begriff plus gleicher Anteil am Rest (Daria, 24.10.2026: kurze Begriffe
  // bekamen zu viel Platz). Die Markierung folgt den gemessenen Feldern.
  const [boxes, setBoxes] = useState<Record<string, { x: number; width: number }>>({});
  const box = boxes[options[index]?.key ?? ''];
  const x = useRef(new Animated.Value(0)).current;
  const w = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);
  useEffect(() => {
    if (!box) return;
    if (!placed.current) {
      x.setValue(box.x);
      w.setValue(box.width);
      placed.current = true;
      return;
    }
    const timing = { duration: motion.barrier.duration, easing: Easing.bezier(...motion.barrier.bezier), useNativeDriver: false };
    Animated.parallel([Animated.timing(x, { ...timing, toValue: box.x }), Animated.timing(w, { ...timing, toValue: box.width })]).start();
  }, [box, x, w]);
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {box ? (
        <Animated.View pointerEvents="none" style={[styles.indicator, { width: w, transform: [{ translateX: x }] }]} />
      ) : null}
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.key)}
            onLayout={(e) => {
              const { x: ox, width } = e.nativeEvent.layout;
              setBoxes((prev) => (prev[o.key]?.x === ox && prev[o.key]?.width === width ? prev : { ...prev, [o.key]: { x: ox, width } }));
            }}
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
  track: isFashionable
    ? { flexDirection: 'row', borderBottomWidth: stroke.thin, borderBottomColor: color.line.hairline }
    : { flexDirection: 'row', padding: PAD, borderRadius: radius.full, backgroundColor: color.bg.surface },
  indicator: isFashionable
    ? { position: 'absolute', left: 0, bottom: -stroke.thin, height: 1.5, backgroundColor: color.text.primary }
    : {
        position: 'absolute',
        left: 0,
        top: PAD,
        bottom: PAD,
        borderRadius: radius.full,
        backgroundColor: `${color.accent.primary}2E`,
      },
  option: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto', minHeight: isFashionable ? 44 : 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: isFashionable ? 8 : 10 },
  label: isFashionable
    ? // Drei Begriffe in Großbuchstaben passen auch auf 360 pt Breite
      { fontFamily: font.semiBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.3, textTransform: 'uppercase', color: color.text.secondary }
    : { fontFamily: font.regular, fontSize: 13, lineHeight: 16, color: color.text.secondary },
  selected: isFashionable ? { color: color.text.primary } : { color: color.accent.primary, fontFamily: font.medium },
});
