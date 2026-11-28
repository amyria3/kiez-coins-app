import { SectionBlock } from './Content';
import { BARE, paper } from '../theme/kiezPage';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { color, radius, space, stroke, text } from '../theme/tokens';
import { iconSvgs } from './icons/svgs';
import { Text } from './T';
import { t } from '../data/texts';
import type { Quest } from '../data/achievements';

/**
 * Ziele mit Fortschrittsbalken und Geschenk (Daria, 29.10.2026), ähnlich „Start a streak“ in Lern-Apps:
 * Titel, schmaler Balken mit „1 von 1“, rechts das Geschenk. Ist ein Ziel neu erreicht, öffnet sich das Geschenk
 * einmal und pinke Herzen steigen heraus. Danach bleibt es offen. Gemerkt pro Gerät und Ziel.
 */
const native = Platform.OS !== 'web';
const GIFT_H = 40;
const GIFT_W = (iconSvgs.gift.width / iconSvgs.gift.height) * GIFT_H;
// Deckel mit Schleife: oberer Teil des Geschenks bis zur Fuge (y ≈ 17 von 35)
const LID = Math.round(GIFT_H * (17.2 / 35));
const SEEN = (key: string) => `kiez-ziel-geoeffnet:${key}`;

/** Immer nur drei Ziele (Daria, 29.10.2026): neu erreichte zuerst (dann geht das Geschenk auf), dann offene, dann erreichte. */
const SHOWN = 3;

/** `label`: Überschrift des Abschnitts, erscheint nur mit Zielen (Daria, 2026-11-10) */
export function Quests({ quests, label }: { quests: Quest[]; label?: string }) {
  const [seen, setSeen] = useState<Record<string, boolean> | null>(null);
  const keys = quests.map((q) => q.seenKey).join('|');
  useEffect(() => {
    let active = true;
    Promise.all(quests.map((q) => AsyncStorage.getItem(SEEN(q.seenKey)).catch(() => null)))
      .then((values) => active && setSeen(Object.fromEntries(quests.map((q, i) => [q.seenKey, !!values[i]]))))
      .catch(() => active && setSeen({}));
    return () => {
      active = false;
    };
    // Nur neu lesen, wenn sich die Ziele ändern
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys]);
  if (!quests.length || !seen) return null;
  const done = (q: Quest) => q.value >= q.goal;
  const rank = (q: Quest) => (done(q) && !seen[q.seenKey] ? 0 : !done(q) ? 1 : 2);
  const shown = [...quests].sort((a, b) => rank(a) - rank(b)).slice(0, SHOWN);
  const list = (
    <View style={styles.list}>
      {shown.map((q, i) => (
        <QuestRow key={q.key} quest={q} index={i} />
      ))}
    </View>
  );
  return label ? <SectionBlock label={label}>{list}</SectionBlock> : list;
}

function QuestRow({ quest, index }: { quest: Quest; index: number }) {
  const done = quest.value >= quest.goal;
  const share = Math.min(1, quest.value / quest.goal);
  const steps = { have: Math.min(quest.value, quest.goal), need: quest.goal };
  // Tipp auf ein erreichtes Ziel: Das Geschenk geht noch einmal auf (Daria, 2026-11-28: „Hier fehlt die Animation“)
  const [replay, setReplay] = useState(0);
  const grow = useGrow(share, index);
  const gift = <Gift open={done} seenKey={quest.seenKey} share={share} index={index} replay={replay} />;
  // Kiez: Geschenk vorn wie das Abzeichen in den Listen darunter. Erreicht: ohne Balken, „Geschafft“ statt „1 von 1“
  const kiezDone = BARE && done;
  const body = (
    <>
      {BARE ? gift : null}
      <View style={styles.texts}>
        <View style={styles.head}>
          <Text style={styles.title}>{t(quest.title)}</Text>
          {kiezDone ? <Text style={styles.reached}>Geschafft</Text> : <Text style={styles.count}>{t('{have} von {need}', steps)}</Text>}
        </View>
        {kiezDone ? null : (
          <View style={styles.bar}>
            <Animated.View style={[styles.fill, done && styles.fillDone, { width: grow }]} />
          </View>
        )}
      </View>
      {BARE ? null : gift}
    </>
  );
  const label = `${t(quest.title)}, ${done ? t('Geschafft') : t('{have} von {need}', steps)}`;
  const rowStyle = [styles.row, index > 0 && styles.divider];
  return done ? (
    <Pressable style={rowStyle} accessibilityRole="button" accessibilityLabel={label} onPress={() => setReplay((n) => n + 1)}>
      {body}
    </Pressable>
  ) : (
    <View style={rowStyle} accessible accessibilityLabel={label}>
      {body}
    </View>
  );
}

/** Der Balken wächst beim Öffnen der Seite auf seinen Stand, Zeile für Zeile versetzt. Ohne Bewegung steht er sofort. */
function useGrow(share: number, index: number) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((still) => {
        if (!active) return;
        if (still) value.setValue(share);
        else Animated.timing(value, { toValue: share, duration: 700, delay: 250 + index * 150, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      });
    return () => {
      active = false;
    };
  }, [share, index, value]);
  return value.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
}

const HEARTS = [
  { x: -18, delay: 120, size: 14 },
  { x: 14, delay: 220, size: 18 },
  { x: -2, delay: 320, size: 12 },
  { x: 22, delay: 420, size: 11 },
  { x: -24, delay: 500, size: 10 },
];

/**
 * Geschlossenes Geschenk (Daria, 29.10.2026): wackelt ab und zu, je näher das Ziel, desto kräftiger.
 * Ohne Fortschritt bleibt es ruhig. Die Geschenke wackeln versetzt, nicht alle gleichzeitig.
 */
const WIGGLE_PAUSE = 5200;
function useWiggle(active: boolean, share: number, index: number) {
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active || share <= 0) {
      shake.setValue(0);
      return;
    }
    let loop: Animated.CompositeAnimation | undefined;
    let still = false;
    const timer = setTimeout(async () => {
      try {
        still = await AccessibilityInfo.isReduceMotionEnabled();
      } catch {
        // dann wackeln
      }
      if (still) return;
      const step = (toValue: number, duration: number) => Animated.timing(shake, { toValue, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: native });
      loop = Animated.loop(
        Animated.sequence([step(1, 90), step(-1, 110), step(0.6, 100), step(-0.4, 90), step(0, 120), Animated.delay(WIGGLE_PAUSE)]),
      );
      loop.start();
    }, 900 + index * 1400);
    return () => {
      clearTimeout(timer);
      loop?.stop();
    };
  }, [active, share, index, shake]);
  // Mehr Fortschritt, kräftiger: 4° bis 10°, dazu ein kleiner Hüpfer
  const deg = 4 + 6 * Math.min(1, share);
  return {
    transform: [
      { translateY: shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-2, 0, -3] }) },
      { rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: [`${-deg}deg`, `${deg}deg`] }) },
    ],
  };
}

function Gift({ open, seenKey, share, index, replay = 0 }: { open: boolean; seenKey: string; share: number; index: number; replay?: number }) {
  const wiggle = useWiggle(!open, share, index);
  // 0 = zu, 1 = offen
  const lid = useRef(new Animated.Value(0)).current;
  const rise = useRef(HEARTS.map(() => new Animated.Value(0))).current;
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (!open) {
      lid.setValue(0);
      return;
    }
    let active = true;
    (async () => {
      let seen = false;
      let still = false;
      try {
        [seen, still] = await Promise.all([
          AsyncStorage.getItem(SEEN(seenKey)).then((v) => !!v),
          AccessibilityInfo.isReduceMotionEnabled(),
        ]);
      } catch {
        // dann einfach öffnen
      }
      if (!active) return;
      if (still) {
        lid.setValue(1);
        return;
      }
      // Kurz rütteln, dann springt der Deckel auf
      const pop = (extra: Animated.CompositeAnimation[] = []) => [
        Animated.sequence([0.06, -0.06, 0.04, 0].map((v) => Animated.timing(lid, { toValue: v, duration: 70, useNativeDriver: native }))),
        Animated.parallel([Animated.spring(lid, { toValue: 1, friction: 4, tension: 120, useNativeDriver: native }), ...extra]),
      ];
      lid.setValue(0);
      // Schon gesehen: Der Deckel springt bei jedem Besuch kurz auf, eins nach dem anderen. Herzen nur beim ersten Mal
      // und beim Tipp auf das Ziel.
      if (seen && !replay) {
        Animated.sequence([Animated.delay(700 + index * 350), ...pop()]).start();
        return;
      }
      AsyncStorage.setItem(SEEN(seenKey), '1').catch(() => {});
      setBurst(true);
      rise.forEach((v) => v.setValue(0));
      Animated.sequence([
        Animated.delay(replay ? 0 : 400),
        ...pop(
          rise.map((v, i) =>
            Animated.timing(v, { toValue: 1, duration: 1300, delay: HEARTS[i].delay, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
          ),
        ),
      ]).start(() => active && setBurst(false));
    })();
    return () => {
      active = false;
    };
  }, [open, seenKey, lid, rise, index, replay]);

  // Offenes Geschenk grün (Ziel erreicht), Herzen pink (Daria, 30.10.2026: Geschenk und Herzen in verschiedenen Farben)
  const xml = iconSvgs.gift.svg(open ? color.accent.confirmation : color.text.secondary);
  // Normales Herz wie beim Like, nicht das Doppelherz des Feeds (Daria, 30.10.2026)
  const heartIcon = iconSvgs.heart;
  return (
    <Animated.View style={[styles.gift, wiggle]}>
      {burst
        ? HEARTS.map((h, i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={[
                styles.heart,
                {
                  opacity: rise[i].interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
                  transform: [
                    { translateX: rise[i].interpolate({ inputRange: [0, 1], outputRange: [0, h.x] }) },
                    { translateY: rise[i].interpolate({ inputRange: [0, 1], outputRange: [0, -46 - h.size * 2] }) },
                    { scale: rise[i].interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.1, 0.9] }) },
                  ],
                },
              ]}
            >
              <SvgXml xml={heartIcon.svg(color.accent.affection)} width={(heartIcon.width / heartIcon.height) * h.size} height={h.size} />
            </Animated.View>
          ))
        : null}
      {/* Unterteil: das Geschenk ab der Fuge */}
      <View style={[styles.part, { top: LID, height: GIFT_H - LID }]}>
        <View style={{ marginTop: -LID, width: GIFT_W, height: GIFT_H }}>
          <SvgXml xml={xml} width={GIFT_W} height={GIFT_H} />
        </View>
      </View>
      {/* Deckel mit Schleife: hebt sich und kippt nach hinten */}
      <Animated.View
        style={[
          styles.part,
          { top: 0, height: LID },
          {
            transform: [
              { translateY: lid.interpolate({ inputRange: [-1, 0, 1], outputRange: [6, 0, -14] }) },
              { translateX: lid.interpolate({ inputRange: [-1, 0, 1], outputRange: [-4, 0, 6] }) },
              { rotate: lid.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-10deg', '0deg', '18deg'] }) },
            ],
          },
        ]}
      >
        {/* Eigene Größe wie beim Unterteil: Sonst passt das Web das ganze Geschenk in die Deckelhöhe ein
            (kleines zweites Geschenk obendrauf, Daria, 29.10.2026) */}
        <View style={{ width: GIFT_W, height: GIFT_H }}>
          <SvgXml xml={xml} width={GIFT_W} height={GIFT_H} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Wie „Deine Abzeichen“ darunter: eine Fläche, Zeilen mit feiner Linie, schmaler Balken, „1 von 1“ rechts
  // (Daria, 2026-11-28: lila Balken auf einzelnen Karten „passt stilistisch nicht“)
  list: { borderRadius: radius.md, backgroundColor: color.bg.surface, marginBottom: space[12], ...paper },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[16], paddingHorizontal: BARE ? 0 : space[16] },
  divider: { borderTopWidth: stroke.ultraThin, borderTopColor: color.line.hairline },
  texts: { flex: 1, gap: space[6] },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space[8] },
  title: { ...text.label, flexShrink: 1, color: color.text.primary },
  count: { ...text.caption, color: color.text.secondary },
  reached: { ...text.captionStrong, color: color.accent.confirmation },
  bar: { height: 6, borderRadius: 3, backgroundColor: color.line.hairline, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: color.text.secondary },
  // Erreicht: grün wie das offene Geschenk daneben
  fillDone: { backgroundColor: color.accent.confirmation },
  // Kiez: so breit wie die Abzeichen in den Listen darunter, damit die Titel in einer Flucht stehen
  gift: { width: BARE ? 51 : GIFT_W + 8, height: GIFT_H, alignItems: 'center', marginTop: BARE ? space[12] : 0 },
  part: { position: 'absolute', left: BARE ? (51 - GIFT_W) / 2 : 4, width: GIFT_W, overflow: 'hidden' },
  heart: { position: 'absolute', top: GIFT_H * 0.3, left: (BARE ? 51 : GIFT_W + 8) / 2 - 8 },
});
