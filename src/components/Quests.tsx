import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { color, font, radius, space, text } from '../theme/tokens';
import { iconSvgs } from './icons/svgs';
import { Text } from './T';
import { t } from '../data/texts';
import type { Quest } from '../data/erfolge';

/**
 * Ziele mit Fortschrittsbalken und Geschenk (Daria, 29.10.2026), ähnlich „Start a streak“ in Lern-Apps:
 * Titel, lila Balken mit „1 / 1“, rechts das Geschenk. Ist ein Ziel neu erreicht, öffnet sich das Geschenk
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

export function Quests({ quests }: { quests: Quest[] }) {
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
  return (
    <View style={styles.list}>
      {shown.map((q, i) => (
        <QuestRow key={q.key} quest={q} index={i} />
      ))}
    </View>
  );
}

function QuestRow({ quest, index }: { quest: Quest; index: number }) {
  const done = quest.value >= quest.goal;
  const share = Math.min(1, quest.value / quest.goal);
  return (
    <View style={styles.row} accessible accessibilityLabel={`${t(quest.title)}, ${Math.min(quest.value, quest.goal)} / ${quest.goal}`}>
      <View style={styles.texts}>
        <Text style={styles.title}>{t(quest.title)}</Text>
        <View style={styles.bar}>
          <View style={[styles.fill, { width: `${share * 100}%` }]}>
            <View style={styles.shine} />
          </View>
          <Text style={styles.count}>
            {Math.min(quest.value, quest.goal)} / {quest.goal}
          </Text>
        </View>
      </View>
      <Gift open={done} seenKey={quest.seenKey} share={share} index={index} />
    </View>
  );
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

function Gift({ open, seenKey, share, index }: { open: boolean; seenKey: string; share: number; index: number }) {
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
      if (seen || still) {
        lid.setValue(1);
        return;
      }
      AsyncStorage.setItem(SEEN(seenKey), '1').catch(() => {});
      setBurst(true);
      rise.forEach((v) => v.setValue(0));
      Animated.sequence([
        Animated.delay(400),
        // Kurz rütteln, dann springt der Deckel auf
        Animated.sequence([0.06, -0.06, 0.04, 0].map((v) => Animated.timing(lid, { toValue: v, duration: 70, useNativeDriver: native }))),
        Animated.parallel([
          Animated.spring(lid, { toValue: 1, friction: 4, tension: 120, useNativeDriver: native }),
          ...rise.map((v, i) =>
            Animated.timing(v, { toValue: 1, duration: 1300, delay: HEARTS[i].delay, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
          ),
        ]),
      ]).start(() => active && setBurst(false));
    })();
    return () => {
      active = false;
    };
  }, [open, seenKey, lid, rise]);

  // Offenes Geschenk grün (Ziel erreicht), Herzen pink (Daria, 30.10.2026: Geschenk und Herzen in verschiedenen Farben)
  const xml = iconSvgs.gift.svg(open ? color.accent.confirmation : color.text.secondary);
  const heartIcon = iconSvgs.feed;
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
  // Ziele enger zusammen, mehr Luft zum nächsten Abschnitt (Daria, 29.10.2026)
  list: { gap: space[4], marginBottom: space[12] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingTop: space[8],
    paddingBottom: space[12],
    paddingHorizontal: space[12],
    // Etwas eckiger (Daria, 29.10.2026)
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
  },
  texts: { flex: 1, gap: space[6] },
  title: { ...text.cardTitle, fontSize: 15, lineHeight: 19, color: color.text.primary },
  bar: { height: 18, borderRadius: 6, backgroundColor: color.bg.screen, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6, backgroundColor: color.accent.primary },
  // Heller Streifen oben im Balken wie im Vorbild
  shine: { position: 'absolute', left: 6, right: 6, top: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.28)' },
  count: { textAlign: 'center', fontFamily: font.semiBold, fontSize: 11, lineHeight: 14, color: color.text.primary },
  gift: { width: GIFT_W + 8, height: GIFT_H, alignItems: 'center' },
  part: { position: 'absolute', left: 4, width: GIFT_W, overflow: 'hidden' },
  heart: { position: 'absolute', top: GIFT_H * 0.3, left: GIFT_W / 2 - 4 },
});
