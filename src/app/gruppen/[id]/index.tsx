import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Avatar } from '../../../components/AuthorRow';
import { Button } from '../../../components/Button';
import { FieldGroup, KaterCard } from '../../../components/Content';
import { CopyField } from '../../../components/Form';
import { EdensteinIcon } from '../../../components/icons/Brand';
import { SubScreen } from '../../../components/Screen';
import { inviteMessage, leaderboard, MAX_MEMBERS } from '../../../data/groups';
import { useStore } from '../../../data/store';
import type { User } from '../../../data/types';
import { color, radius, space, text } from '../../../theme/tokens';

/**
 * Route `gruppen/[id]`: Rangliste, Einladungscode, Aufgaben erstellen.
 * Die Gründerin entfernt Mitglieder und überträgt ihre Rolle (Mitglied antippen).
 */
export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { groups, challenges, users, currentUserId, groupApi } = useStore();
  const group = groups.find((g) => g.id === id);

  if (!group) {
    return (
      <SubScreen title="Gruppe" navigation="back" onLeadingPress={() => router.back()}>
        <KaterCard>Diese Gruppe gibt es nicht mehr, oder Du bist nicht mehr dabei.</KaterCard>
      </SubScreen>
    );
  }

  const isFounder = group.founderId === currentUserId;
  const ranks = leaderboard(group, challenges);
  const openTasks = challenges.filter((c) => c.groupId === group.id && c.status === 'open').length;
  const userOf = (userId: string): User =>
    users.find((u) => u.id === userId) ?? { id: userId, name: 'Unbekannt', firstName: 'Unbekannt' };

  const run = async (action: () => Promise<void>, failTitle: string) => {
    try {
      await action();
    } catch (error) {
      Alert.alert(failTitle, (error as Error).message);
    }
  };

  const memberMenu = (userId: string) => {
    if (!isFounder || userId === currentUserId) return;
    const name = userOf(userId).name;
    Alert.alert(name, undefined, [
      {
        text: 'Gründerrolle übertragen',
        onPress: () =>
          Alert.alert('Gründerrolle übertragen?', `${name} kann dann Mitglieder entfernen. Du bleibst Mitglied.`, [
            { text: 'Abbrechen', style: 'cancel' },
            { text: 'Übertragen', onPress: () => run(() => groupApi.transferFounder(group.id, userId), 'Nicht übertragen') },
          ]),
      },
      {
        text: 'Aus der Gruppe entfernen',
        style: 'destructive',
        onPress: () =>
          Alert.alert(`${name} entfernen?`, 'Die Edensteine bleiben im Verlauf erhalten.', [
            { text: 'Abbrechen', style: 'cancel' },
            { text: 'Entfernen', style: 'destructive', onPress: () => run(() => groupApi.removeMember(group.id, userId), 'Nicht entfernt') },
          ]),
      },
      { text: 'Abbrechen', style: 'cancel' },
    ]);
  };

  const leave = () => {
    const alone = group.members.length === 1;
    if (isFounder && !alone) {
      Alert.alert('Erst die Rolle übertragen', 'Tipp ein Mitglied an und übertrag ihm die Gründerrolle. Danach kannst Du gehen.');
      return;
    }
    Alert.alert(
      alone ? 'Gruppe auflösen?' : 'Gruppe verlassen?',
      alone
        ? 'Du bist allein in der Gruppe. Sie verschwindet samt Aufgaben. Das lässt sich nicht rückgängig machen.'
        : 'Deine Edensteine bleiben im Verlauf der Gruppe erhalten.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: alone ? 'Auflösen' : 'Verlassen',
          style: 'destructive',
          onPress: () =>
            run(async () => {
              await groupApi.leave(group.id);
              router.back();
            }, 'Hat nicht geklappt'),
        },
      ],
    );
  };

  return (
    <SubScreen
      title={group.name}
      subtitle={`${group.members.length} von ${MAX_MEMBERS} Mitgliedern`}
      navigation="back"
      onLeadingPress={() => (router.canGoBack() ? router.back() : router.replace('/gruppen'))}
      actions={
        <>
          <Button label="Aufgabe erstellen" onPress={() => router.push(`/gruppen/${group.id}/aufgabe`)} />
          <Button label={openTasks === 1 ? '1 offene Aufgabe ansehen' : openTasks ? `${openTasks} offene Aufgaben ansehen` : 'Aufgaben ansehen'} variant="ghost" onPress={() => router.replace({ pathname: '/feed', params: { gruppe: group.id } })} />
        </>
      }
    >
      <FieldGroup label="Rangliste">
        <View style={styles.list}>
          {ranks.map((r, index) => {
            const member = group.members.find((m) => m.userId === r.userId);
            const user = userOf(r.userId);
            const me = r.userId === currentUserId;
            return (
              <Pressable
                key={r.userId}
                accessibilityRole={isFounder && !me ? 'button' : undefined}
                accessibilityLabel={`Platz ${index + 1}, ${me ? 'Du' : user.name}, ${r.edensteine} Edensteine`}
                onPress={() => memberMenu(r.userId)}
                disabled={!isFounder || me}
                style={({ pressed }) => [styles.row, me && styles.rowMe, pressed && styles.pressed]}
              >
                <Text style={styles.rank}>{index + 1}</Text>
                <Avatar user={user} diameter={32} />
                <View style={styles.flex}>
                  <Text style={styles.name} numberOfLines={1}>
                    {me ? 'Du' : user.name}
                  </Text>
                  <Text style={styles.meta}>
                    {member?.role === 'founder' ? 'Gründerin · ' : ''}
                    {r.done === 1 ? '1 Aufgabe erledigt' : `${r.done} Aufgaben erledigt`}
                  </Text>
                </View>
                <EdensteinIcon height={14} />
                <Text style={styles.eden}>{r.edensteine}</Text>
              </Pressable>
            );
          })}
        </View>
      </FieldGroup>
      {isFounder ? <Text style={styles.meta}>Tipp ein Mitglied an, um es zu entfernen oder ihm die Gründerrolle zu geben.</Text> : null}

      {group.members.length < MAX_MEMBERS ? (
        <FieldGroup label="Leute einladen">
          <CopyField label="Einladungscode" value={group.inviteCode} />
          <Button label="Code teilen" variant="secondary" onPress={() => Share.share({ message: inviteMessage(group) })} />
        </FieldGroup>
      ) : (
        <Text style={styles.meta}>Die Gruppe ist voll. Mehr als {MAX_MEMBERS} Mitglieder geht nicht.</Text>
      )}

      <Button
        label={isFounder && group.members.length === 1 ? 'Gruppe auflösen' : 'Gruppe verlassen'}
        variant="danger"
        onPress={leave}
      />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[8] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[12],
    paddingHorizontal: space[12],
    borderRadius: radius.xl,
    backgroundColor: color.bg.surface,
  },
  rowMe: { borderWidth: 1, borderColor: color.accent.confirmation },
  pressed: { opacity: 0.7 },
  rank: { ...text.metric, fontSize: 18, width: 22, textAlign: 'center', color: color.text.secondary },
  flex: { flex: 1, gap: space[2] },
  name: { ...text.title, fontSize: 16, color: color.text.primary },
  meta: { ...text.caption, color: color.text.secondary },
  eden: { ...text.metric, fontSize: 18, color: color.accent.confirmation, minWidth: 24, textAlign: 'right' },
});
