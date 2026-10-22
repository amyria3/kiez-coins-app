import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/T';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterCard } from '../../components/Content';
import { GroupCard } from '../../components/GroupCard';
import { SubScreen } from '../../components/Screen';
import { MAX_GROUPS, myEdensteine } from '../../data/groups';
import { useStore } from '../../data/store';
import { color, radius, size, space, stroke, text } from '../../theme/tokens';
import { explain } from '../../components/Nudge';
import { t } from '../../data/texts';

/** Route `gruppen` („Deine Gruppen“): Liste, Gründen, Beitreten. Erreichbar aus dem Feed-Reiter und aus dem Konto. */
export default function Groups() {
  const router = useRouter();
  const { groups, challenges, currentUserId } = useStore();
  const full = groups.length >= MAX_GROUPS;
  const tooMany = () =>
    explain('Gruppen voll', t('Du bist schon in {MAX_GROUPS} Gruppen. Verlass eine, dann kannst Du einer neuen beitreten oder eine gründen.', { MAX_GROUPS }));

  return (
    <SubScreen
      title="Deine Gruppen"
      navigation="back"
      onLeadingPress={() => (router.canGoBack() ? router.back() : router.replace('/feed'))}
      actions={
        <>
          <Button label="Gruppe gründen" onPress={() => router.push('/gruppen/neu')} disabled={full} whyDisabled={tooMany} />
          <Button label="Mit Code beitreten" variant="ghost" onPress={() => router.push('/gruppen/beitreten')} disabled={full} whyDisabled={tooMany} />
        </>
      }
    >
      {groups.length === 0 ? (
        <KaterCard title="Gemeinsam statt einsam">
          In einer Gruppe verteilt Ihr Aufgaben unter Euch, etwa in der WG, der Familie oder im Verein. Statt Euro gibt
          es Edensteine.
        </KaterCard>
      ) : null}
      {groups.map((g) => (
        <GroupCard
          key={g.id}
          group={g}
          onFeed={() => router.dismissTo({ pathname: '/feed', params: { gruppe: g.id } })}
          onManage={() => router.push(`/gruppen/${g.id}`)}
        />
      ))}
      {full ? <Text style={styles.meta}>{t('Du bist in {MAX_GROUPS} Gruppen. Mehr geht nicht.', { MAX_GROUPS })}</Text> : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    backgroundColor: color.bg.surface,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: space[12], padding: space[16] },
  links: { flexDirection: 'row', borderTopWidth: stroke.ultraThin, borderTopColor: color.line.hairline },
  link: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[8], minHeight: 52 },
  linkText: { ...text.body, color: color.text.primary },
  divider: { width: stroke.ultraThin, backgroundColor: color.line.hairline, marginVertical: space[12] },
  crystal: { width: 30, height: 24, alignItems: 'center' },
  crystalFloat: { position: 'absolute', top: (24 - 52) / 2 },
  pressed: { opacity: 0.7 },
  flex: { flex: 1, gap: space[4] },
  name: { ...text.cardTitle, color: color.text.primary },
  meta: { ...text.caption, color: color.text.secondary },
  eden: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  edenValue: { ...text.metric, fontSize: 18, color: color.accent.confirmation },
});
