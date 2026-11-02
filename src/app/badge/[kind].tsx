import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { BadgeIcon } from '../../components/BadgeIcon';
import { BadgeScene } from '../../components/BadgeScene';
import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { SubScreen } from '../../components/Screen';
import { Text } from '../../components/T';
import { BADGES, badgeMeta, badgeTitle, useMyBadges, type BadgeKind } from '../../data/badges';
import { useGoBack } from '../../lib/goBack';
import { color, isFashionable, radius, space, text } from '../../theme/tokens';

// Darias Entwürfe (Übergabe/Abzeichen-Hinweis, 01.11.2026): Lots:in und Anführer:in zeigen die Karte,
// in die die Szene hineinragt; die übrigen zeigen die Szene mit der Kater-Sprechblase.
// Verlauf der Karte: oben die Farbe hinter der Szene, unten die Tiefe des Meeres.
const KARTE: Partial<Record<BadgeKind, string[]>> = {
  lotse: ['#4B4A1F', '#3A4422', '#0C3236', '#0A1F4A', '#081457'],
  anfuehrer: ['#6A5418', '#4E4A22', '#17414A', '#123056', '#1A1F52'],
};

/**
 * Route `badge/[kind]`: Hinweis bei einem neuen Abzeichen (Daria, 2026-10-31). Öffnet BadgeNotice.
 * Beim Öffnen gilt das Abzeichen als gesehen. Im Kiez-Look mit Darias animierter Szene (02.11.2026).
 */
export default function NewBadgeScreen() {
  const goBack = useGoBack();
  const { kind: raw } = useLocalSearchParams<{ kind: string }>();
  const kind = (BADGES.some((b) => b.kind === raw) ? raw : 'pionier') as BadgeKind;
  const { mine, update } = useMyBadges();
  const own = mine?.badges.find((b) => b.badge === kind);
  const meta = badgeMeta(kind);
  const [breite, setBreite] = useState(0);

  useEffect(() => {
    if (own && !own.seen) update(kind, { seen: true }).catch(() => undefined);
  }, [own, kind, update]);

  const choose = async () => {
    await update(kind, { selected: true, visible: true }).catch(() => undefined);
    goBack();
  };

  const titel = badgeTitle(kind, own?.number);
  const karte = KARTE[kind];

  let inhalt;
  if (isFashionable) {
    inhalt = (
      <>
        <View style={styles.hero}>
          <BadgeIcon kind={kind} number={own?.number} size={120} />
          <Text noTranslate style={styles.name}>
            {titel}
          </Text>
        </View>
        <KaterBubble>{meta.kater}</KaterBubble>
      </>
    );
  } else if (karte) {
    const szene = Math.round(breite * 0.86);
    inhalt = (
      <View style={[styles.karte, { marginTop: Math.round(szene * 0.5) }]} onLayout={(e) => setBreite(e.nativeEvent.layout.width)}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="karte" x1="0" y1="0" x2="0" y2="1">
              {karte.map((c, i) => (
                <Stop key={c} offset={[0, 0.3, 0.55, 0.78, 1][i]} stopColor={c} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" rx={radius.sheet} fill="url(#karte)" />
        </Svg>
        {breite ? (
          <View style={{ marginTop: -Math.round(szene * 0.5) }}>
            <BadgeScene kind={kind} width={szene} />
          </View>
        ) : null}
        <Text style={styles.ueber}>Neues Abzeichen</Text>
        <Text noTranslate style={styles.kartenName}>
          {titel}
        </Text>
        <Text style={styles.kartenText}>{meta.kater}</Text>
      </View>
    );
  } else {
    inhalt = (
      <>
        <View style={styles.szene} onLayout={(e) => setBreite(e.nativeEvent.layout.width)}>
          {breite ? <BadgeScene kind={kind} width={breite} /> : null}
        </View>
        <KaterBubble>{meta.kater}</KaterBubble>
      </>
    );
  }

  return (
    <SubScreen
      title="Neues Abzeichen"
      navigation="close"
      onLeadingPress={goBack}
      actions={
        <>
          {own?.selected ? null : <Button label="Am Avatar zeigen" onPress={choose} />}
          <Button label={own?.selected ? 'Weiter' : 'Später'} variant="ghost" onPress={goBack} />
        </>
      }
    >
      {inhalt}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space[16], paddingTop: space[24], paddingBottom: space[8] },
  name: { ...text.title, fontSize: 26, lineHeight: 32, color: color.text.primary, textAlign: 'center' },
  szene: { width: '100%', paddingTop: space[8] },
  karte: {
    alignItems: 'center',
    gap: space[8],
    paddingHorizontal: space[24],
    paddingBottom: space[32],
    borderRadius: radius.sheet,
  },
  ueber: { ...text.body, color: color.text.secondary, textAlign: 'center', marginTop: space[8] },
  kartenName: { ...text.headline, fontSize: 32, lineHeight: 38, color: color.text.primary, textAlign: 'center' },
  kartenText: { ...text.body, fontSize: 15, lineHeight: 21, color: color.text.primary, textAlign: 'center', opacity: 0.85 },
});
