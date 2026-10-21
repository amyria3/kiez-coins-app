import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterCard } from '../../components/Content';
import { EdensteinIcon } from '../../components/icons/Brand';
import { Icon } from '../../components/icons/Icon';
import { SubScreen } from '../../components/Screen';
import { MAX_GROUPS, myEdensteine } from '../../data/groups';
import { useStore } from '../../data/store';
import { color, radius, size, space, text } from '../../theme/tokens';
import { explain } from '../../components/Nudge';

/** Route `gruppen` („Deine Gruppen“): Liste, Gründen, Beitreten. Erreichbar aus dem Feed-Reiter und aus dem Konto. */
export default function Groups() {
  const router = useRouter();
  const { groups, challenges, currentUserId } = useStore();
  const full = groups.length >= MAX_GROUPS;
  const tooMany = () =>
    explain('Gruppen voll', `Du bist schon in ${MAX_GROUPS} Gruppen. Verlass eine, dann kannst Du einer neuen beitreten oder eine gründen.`);

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
        <Pressable
          key={g.id}
          accessibilityRole="button"
          accessibilityLabel={`${g.name} öffnen`}
          onPress={() => router.push(`/gruppen/${g.id}`)}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>
              {g.name}
            </Text>
            <Text style={styles.meta}>
              {g.members.length === 1 ? '1 Mitglied' : `${g.members.length} Mitglieder`}
              {g.founderId === currentUserId ? ' · Du hast sie gegründet' : ''}
            </Text>
          </View>
          <View style={styles.eden}>
            <EdensteinIcon height={16} />
            <Text style={styles.edenValue}>{myEdensteine(g, challenges, currentUserId)}</Text>
          </View>
          <Icon name="chevron-right" size={size.icon} color={color.text.secondary} />
        </Pressable>
      ))}
      {full ? <Text style={styles.meta}>Du bist in {MAX_GROUPS} Gruppen. Mehr geht nicht.</Text> : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    padding: space[16],
    borderRadius: radius.xl,
    backgroundColor: color.bg.surface,
  },
  pressed: { opacity: 0.7 },
  flex: { flex: 1, gap: space[4] },
  name: { ...text.cardTitle, color: color.text.primary },
  meta: { ...text.caption, color: color.text.secondary },
  eden: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  edenValue: { ...text.metric, fontSize: 18, color: color.accent.confirmation },
});
