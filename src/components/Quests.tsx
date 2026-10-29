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
const GIFT_H = 52;
const GIFT_W = (iconSvgs.gift.width / iconSvgs.gift.height) * GIFT_H;
// Deckel mit Schleife: oberer Teil des Geschenks bis zur Fuge (y ≈ 17 von 35)
const LID = Math.round(GIFT_H * (17.2 / 35));
const SEEN = (key: string) => `kiez-ziel-geoeffnet:${key}`;

export function Quests({ quests }: { quests: Quest[] }) {
  if (!quests.length) return null;
  return (
    <View style={styles.list}>
      {quests.map((q) => (
        <QuestRow key={q.key} quest={q} />
      ))}
    </View>
  );
}

function QuestRow({ quest }: { quest: Quest }) {
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
      <Gift open={done} seenKey={quest.seenKey} />
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

function Gift({ open, seenKey }: { open: boolean; seenKey: string }) {
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

  const xml = iconSvgs.gift.svg(open ? color.accent.affection : color.text.secondary);
  const heartIcon = iconSvgs.feed;
  return (
    <View style={styles.gift}>
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
                    { translateY: rise[i].interpolate({ inputRange: [0, 1], outputRange: [0, -60 - h.size * 2] }) },
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
        <View style={{ marginTop: -LID }}>
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
        <SvgXml xml={xml} width={GIFT_W} height={GIFT_H} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[12] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[16],
    paddingVertical: space[12],
    paddingHorizontal: space[16],
    borderRadius: radius.xl,
    backgroundColor: color.bg.surface,
  },
  texts: { flex: 1, gap: space[8] },
  title: { ...text.cardTitle, color: color.text.primary },
  bar: { height: 24, borderRadius: radius.full, backgroundColor: color.bg.screen, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.full, backgroundColor: color.accent.primary },
  // Heller Streifen oben im Balken wie im Vorbild
  shine: { position: 'absolute', left: 8, right: 8, top: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.28)' },
  count: { textAlign: 'center', fontFamily: font.semiBold, fontSize: 13, lineHeight: 16, color: color.text.primary },
  gift: { width: GIFT_W + 8, height: GIFT_H, alignItems: 'center' },
  part: { position: 'absolute', left: 4, width: GIFT_W, overflow: 'hidden' },
  heart: { position: 'absolute', top: GIFT_H * 0.3, left: GIFT_W / 2 - 4 },
});
