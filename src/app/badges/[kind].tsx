import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { BadgeIcon } from '../../components/BadgeIcon';
import { BadgeStepsBar } from '../../components/BadgeOverview';
import { BadgeScene, SCENE_FRAME } from '../../components/BadgeScene';
import { Button } from '../../components/Button';
import { SubScreen } from '../../components/Screen';
import { Text } from '../../components/T';
import { BADGES, badgeMeta, badgeSteps, badgeTitle, useMyBadges, type BadgeKind } from '../../data/badges';
import { useGoBack } from '../../lib/goBack';
import { color, font, isFashionable, space, text } from '../../theme/tokens';

/**
 * Route `badges/[kind]`: ein Abzeichen im Detail, aus „Me“ (Daria, 2026-11-02).
 * Erhalten: Die Illustration schwimmt auf den Wellen. Offen: nur das Meer, dazu der Fortschritt.
 * Darunter, warum die Aufgabe wichtig ist.
 */
export default function BadgeDetailScreen() {
  const goBack = useGoBack();
  const router = useRouter();
  const { kind: raw } = useLocalSearchParams<{ kind: string }>();
  const kind = (BADGES.some((b) => b.kind === raw) ? raw : 'pionier') as BadgeKind;
  const { mine, update } = useMyBadges();
  const own = mine?.badges.find((b) => b.badge === kind);
  const meta = badgeMeta(kind);
  const steps = mine && !own ? badgeSteps(kind, mine.progress) : null;
  const [breite, setBreite] = useState(0);

  const choose = async () => {
    await update(kind, { selected: true, visible: true }).catch(() => undefined);
  };

  return (
    <SubScreen
      title={own ? badgeTitle(kind, own.number) : meta.name}
      navigation="back"
      onLeadingPress={goBack}
      actions={
        own ? (
          <>
            {own.selected ? null : <Button label="Am Avatar zeigen" onPress={choose} />}
            <Button label="Ein- und ausblenden" variant="ghost" onPress={() => router.push({ pathname: '/account/profile', params: { abschnitt: 'abzeichen' } })} />
          </>
        ) : undefined
      }
    >
      {isFashionable ? (
        <View style={styles.icon}>
          <BadgeIcon kind={kind} number={own?.number} size={138} muted={!own} />
        </View>
      ) : (
        <View style={[styles.szene, { backgroundColor: SCENE_FRAME[kind] }]} onLayout={(e) => setBreite(e.nativeEvent.layout.width)}>
          {breite ? <BadgeScene kind={kind} width={Math.round(breite * 0.87)} variant={own ? 'besitz' : 'meer'} /> : null}
        </View>
      )}

      <View style={styles.block}>
        {own ? (
          <>
            <Text style={styles.status}>{meta.earned}</Text>
            {own.selected ? <Text style={styles.hint}>Am Avatar</Text> : null}
          </>
        ) : (
          <>
            <Text style={styles.status}>{meta.rule}</Text>
            {steps ? <BadgeStepsBar steps={steps} /> : null}
          </>
        )}
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Darum ist das wichtig</Text>
        <Text style={styles.why}>{meta.why}</Text>
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: 'center', paddingVertical: space[24] },
  szene: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  block: { gap: space[8] },
  status: { ...text.title, color: color.text.primary },
  hint: { ...text.caption, fontFamily: font.medium, color: color.text.secondary },
  label: { ...text.caption, letterSpacing: 1, textTransform: 'uppercase', color: color.text.secondary },
  why: { ...text.body, fontSize: 15, lineHeight: 22, color: color.text.primary },
});
