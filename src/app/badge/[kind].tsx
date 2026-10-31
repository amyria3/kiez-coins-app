import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { BadgeIcon } from '../../components/BadgeIcon';
import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { SubScreen } from '../../components/Screen';
import { Text } from '../../components/T';
import { BADGES, badgeMeta, badgeTitle, useMyBadges, type BadgeKind } from '../../data/badges';
import { useGoBack } from '../../lib/goBack';
import { color, space, text } from '../../theme/tokens';

/**
 * Route `badge/[kind]`: Hinweis bei einem neuen Abzeichen (Daria, 2026-10-31). Öffnet BadgeNotice.
 * Beim Öffnen gilt das Abzeichen als gesehen.
 */
export default function NewBadgeScreen() {
  const goBack = useGoBack();
  const { kind: raw } = useLocalSearchParams<{ kind: string }>();
  const kind = (BADGES.some((b) => b.kind === raw) ? raw : 'pionier') as BadgeKind;
  const { mine, update } = useMyBadges();
  const own = mine?.badges.find((b) => b.badge === kind);
  const meta = badgeMeta(kind);

  useEffect(() => {
    if (own && !own.seen) update(kind, { seen: true }).catch(() => undefined);
  }, [own, kind, update]);

  const choose = async () => {
    await update(kind, { selected: true, visible: true }).catch(() => undefined);
    goBack();
  };

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
      <View style={styles.hero}>
        <BadgeIcon kind={kind} number={own?.number} size={120} />
        <Text noTranslate style={styles.name}>
          {badgeTitle(kind, own?.number)}
        </Text>
      </View>
      <KaterBubble>{meta.kater}</KaterBubble>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space[16], paddingTop: space[24], paddingBottom: space[8] },
  name: { ...text.title, fontSize: 26, lineHeight: 32, color: color.text.primary, textAlign: 'center' },
});
