import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';

import { t } from '../../data/texts';
import { color, font, isFashionable, motion, radius, stroke } from '../../theme/tokens';
import { Text } from '../T';
import { Segments } from '../FeedHeader';
import { usePrivateSignal } from '../../theme/signal';

/**
 * Schalter für den Beitragstyp beim Erstellen (Daria, 23.10.2026): Text, Bild, Me-Challenge, We-Challenge.
 * Look „Kiez“: derselbe gezeichnete Umschalter wie der Ort darüber (Privat / Gruppe / Kiez / Überall),
 * also Spur und geneigter Knopf aus `Segments` (Daria, 09.11.2026). Look „Fashionable“: Reiter mit Strich darunter.
 */
export function TypeSwitch<K extends string>({
  options,
  value,
  onChange,
  turn = true,
}: {
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  /**
   * Die Auswahl ist lila, solange die Person den Typ nicht berührt hat und `turn` gilt; danach schwarz-weiß
   * wie der Ort darüber. So sieht man, was eingestellt ist (Daria, 2026-10-31). Im Erstellen-Blatt wird der Typ
   * erst lila, wenn der Ort bestätigt ist.
   */
  turn?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  // Unter „Privat“ bleibt die Auswahl gelb, auch nach dem Berühren (Daria, 2026-11-13)
  const signal = usePrivateSignal();
  const accent = signal || (turn && !touched);
  // Ist der Ort wieder offen (Blatt neu geöffnet), beginnt auch der Typ von vorn
  useEffect(() => {
    if (!turn) setTouched(false);
  }, [turn]);
  const pick = (key: K) => {
    setTouched(true);
    onChange(key);
  };
  if (!isFashionable) return <Segments tabs={options.map((o) => ({ key: o.key, label: o.label }))} selectedKey={value} onChange={pick} accent={accent} />;
  return <UnderlineTypeSwitch options={options} value={value} onChange={pick} accent={accent} />;
}

/** Look „Fashionable“: drei bis vier Begriffe in Großbuchstaben, Strich gleitet mit „Schranke“ */
function UnderlineTypeSwitch<K extends string>({
  options,
  value,
  onChange,
  accent,
}: {
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  accent: boolean;
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
        // Gemessene Lagen zählen von links, auch bei Rechts nach links; die Ebene rechnet deshalb auch von links
        <View pointerEvents="none" style={styles.physical}>
          <Animated.View pointerEvents="none" style={[styles.indicator, accent && styles.indicatorAccent, { width: w, transform: [{ translateX: x }] }]} />
        </View>
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
            <Text style={[styles.label, selected && styles.selected, selected && accent && styles.selectedAccent]} numberOfLines={1}>
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
        backgroundColor: color.text.primary,
      },
  // iOS/Android tauschen sonst links und rechts; im Browser zählt `left` ohnehin von links
  physical: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, ...(Platform.OS === 'web' ? null : { direction: 'ltr' as const }) },
  indicatorAccent: { backgroundColor: color.accent.primary },
  option: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto', minHeight: isFashionable ? 44 : 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: isFashionable ? 8 : 10 },
  label: isFashionable
    ? // Drei Begriffe in Großbuchstaben passen auch auf 360 pt Breite
      { fontFamily: font.semiBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.3, textTransform: 'uppercase', color: color.text.secondary }
    : { fontFamily: font.regular, fontSize: 13, lineHeight: 16, color: color.text.secondary },
  selected: isFashionable ? { color: color.text.primary } : { color: color.bg.screen, fontFamily: font.medium },
  selectedAccent: { color: isFashionable ? color.accent.primary : color.text.onAccent },
});
