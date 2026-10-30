import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { shareText } from '../../../lib/share';
import { Text } from '../../../components/T';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Avatar } from '../../../components/AuthorRow';
import { Button } from '../../../components/Button';
import { FieldGroup, KaterCard } from '../../../components/Content';
import { CopyField, SwitchRow } from '../../../components/Form';
import { SubScreen } from '../../../components/Screen';
import { inviteLink, inviteMessage, MAX_MEMBERS } from '../../../data/groups';
import { useStore } from '../../../data/store';
import type { User } from '../../../data/types';
import { color, radius, space, text } from '../../../theme/tokens';
import { t, tAbout } from '../../../data/texts';
import { useGoBack } from '../../../lib/goBack';

/**
 * Route `groups/[id]`: Mitglieder, Einladungscode, unten „Zurück zum Feed“.
 * Die Gründerin entfernt Mitglieder und überträgt ihre Rolle (Mitglied antippen).
 * In den Gruppeneinstellungen schaltet sie die Rangliste ein und aus. Die Rangliste selbst steht in
 * „Was Du so machst“ unter „In Gruppen“ (UX-Audit, Daria, 27.10.2026); hier stehen die Mitglieder nach Beitritt.
 */
export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { groups, users, currentUserId, groupApi } = useStore();
  const group = groups.find((g) => g.id === id);

  if (!group) {
    return (
      <SubScreen title="Gruppe" navigation="back" onLeadingPress={goBack}>
        <KaterCard>Diese Gruppe gibt es nicht mehr, oder Du bist nicht mehr dabei.</KaterCard>
      </SubScreen>
    );
  }

  const isFounder = group.founderId === currentUserId;
  const showRanks = group.showLeaderboard;
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
        text: 'Rolle übertragen',
        onPress: () =>
          Alert.alert('Rolle übertragen?', tAbout(userOf(userId), '{name} kann dann Mitglieder entfernen. Du bleibst Mitglied.', { name }), [
            { text: 'Abbrechen', style: 'cancel' },
            { text: 'Übertragen', onPress: () => run(() => groupApi.transferFounder(group.id, userId), 'Nicht übertragen') },
          ]),
      },
      {
        text: 'Aus der Gruppe entfernen',
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('{name} entfernen?', { name }), 'Die Edensteine bleiben im Verlauf erhalten.', [
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
      Alert.alert('Erst die Rolle übertragen', 'Tippe ein Mitglied an und übertrage ihm Deine Rolle. Danach kannst Du gehen.');
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
              goBack();
            }, 'Hat nicht geklappt'),
        },
      ],
    );
  };

  return (
    <SubScreen
      title={group.name}
      subtitle={t('{members} von {MAX_MEMBERS} Mitgliedern', { members: group.members.length, MAX_MEMBERS })}
      navigation="back"
      onLeadingPress={() => (goBack())}
      // Daria, 27.10.2026: „Aufgabe erstellen“ und „Aufgaben ansehen“ entfallen, unten steht nur noch der Weg zurück zum Feed
      actions={<Button label="Zurück zum Feed" variant="secondary" icon="this-way" iconFlip onPress={() => router.replace('/feed')} />}
    >
      <FieldGroup label="Mitglieder">
        <View style={styles.list}>
          {group.members.map((member) => {
            const user = userOf(member.userId);
            const me = member.userId === currentUserId;
            return (
              <Pressable
                key={member.userId}
                accessibilityRole={isFounder && !me ? 'button' : undefined}
                accessibilityLabel={me ? t('Du') : user.name}
                onPress={() => memberMenu(member.userId)}
                disabled={!isFounder || me}
                style={({ pressed }) => [styles.row, me && styles.rowMe, pressed && styles.pressed]}
              >
                <Avatar user={user} diameter={32} />
                <View style={styles.flex}>
                  <Text noTranslate style={styles.name} numberOfLines={1}>
                    {me ? t('Du') : user.name}
                  </Text>
                  {member.role === 'founder' ? (
                    // Initiator:in nach dem Geschlecht der Person (Daria, 24.10.2026)
                    <Text style={styles.meta}>{me ? t('Initiator:in') : tAbout(user, 'Initiator:in')}</Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </FieldGroup>
      {isFounder ? <Text style={styles.meta}>Tippe ein Mitglied an, um es zu entfernen oder ihm Deine Rolle zu geben.</Text> : null}

      {isFounder ? (
        <FieldGroup label="Gruppeneinstellungen">
          <SwitchRow
            label="Rangliste anzeigen"
            description={
              showRanks
                ? 'Alle sehen in „Was Du so machst“, wer wie viele Edensteine hat.'
                : 'Alle sehen in „Was Du so machst“ nur ihre eigenen Edensteine.'
            }
            value={showRanks}
            onValueChange={(show) => run(() => groupApi.setLeaderboard(group.id, show), 'Nicht gespeichert')}
          />
        </FieldGroup>
      ) : null}

      {group.members.length < MAX_MEMBERS ? (
        <FieldGroup label="Leute einladen">
          <CopyField label="Beitrittscode" value={group.inviteCode} />
          <CopyField label="Einladungslink" value={inviteLink(group.inviteCode)} />
          <Button label="Einladung teilen" variant="secondary" icon="friends" onPress={() => shareText(inviteMessage(group))} />
        </FieldGroup>
      ) : (
        <Text style={styles.meta}>{t('Die Gruppe ist voll. Mehr als {MAX_MEMBERS} Mitglieder geht nicht.', { MAX_MEMBERS })}</Text>
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
  flex: { flex: 1, gap: space[2] },
  name: { ...text.title, fontSize: 16, color: color.text.primary },
  meta: { ...text.caption, color: color.text.secondary },
});
