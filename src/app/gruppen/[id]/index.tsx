import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { shareText } from '../../../lib/share';
import { Text } from '../../../components/T';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Avatar } from '../../../components/AuthorRow';
import { Button } from '../../../components/Button';
import { FieldGroup, KaterCard } from '../../../components/Content';
import { CopyField, SwitchRow } from '../../../components/Form';
import { LivingCrystal } from '../../../components/icons/Brand';
import { SubScreen } from '../../../components/Screen';
import { inviteLink, inviteMessage, leaderboard, MAX_MEMBERS } from '../../../data/groups';
import { useStore } from '../../../data/store';
import type { User } from '../../../data/types';
import { color, radius, space, text } from '../../../theme/tokens';
import { t } from '../../../data/texts';
import { useGoBack } from '../../../lib/goBack';

/**
 * Route `gruppen/[id]`: Rangliste, Einladungscode, Aufgaben erstellen.
 * Die Gründerin entfernt Mitglieder und überträgt ihre Rolle (Mitglied antippen).
 * In den Gruppeneinstellungen schaltet sie die Rangliste ein und aus. Aus: Mitgliederliste nach Beitritt,
 * jede Person sieht nur ihre eigenen Edensteine.
 */
export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { groups, challenges, users, currentUserId, groupApi } = useStore();
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
  const ranks = leaderboard(group, challenges);
  // Ohne Rangliste: Reihenfolge nach Beitritt, damit die Liste keinen Rang andeutet
  const rows = showRanks ? ranks : group.members.flatMap((m) => ranks.filter((r) => r.userId === m.userId));
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
          Alert.alert('Gründerrolle übertragen?', t('{name} kann dann Mitglieder entfernen. Du bleibst Mitglied.', { name }), [
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
      actions={
        <>
          <Button label="Aufgabe erstellen" onPress={() => router.push(`/gruppen/${group.id}/aufgabe`)} />
          <Button label={openTasks === 1 ? '1 offene Aufgabe ansehen' : openTasks ? t('{openTasks} offene Aufgaben ansehen', { openTasks }) : 'Aufgaben ansehen'} variant="ghost" onPress={() => router.replace({ pathname: '/feed', params: { gruppe: group.id } })} />
        </>
      }
    >
      <FieldGroup label={showRanks ? 'Rangliste' : 'Mitglieder'}>
        <View style={styles.list}>
          {rows.map((r, index) => {
            const member = group.members.find((m) => m.userId === r.userId);
            const user = userOf(r.userId);
            const me = r.userId === currentUserId;
            return (
              <Pressable
                key={r.userId}
                accessibilityRole={isFounder && !me ? 'button' : undefined}
                accessibilityLabel={
                  showRanks
                    ? t('Platz {index}, {name}, {edensteine} Edensteine', { index: index + 1, name: me ? t('Du') : user.name, edensteine: r.edensteine })
                    : me
                      ? t('Du, {edensteine} Edensteine', { edensteine: r.edensteine })
                      : user.name
                }
                onPress={() => memberMenu(r.userId)}
                disabled={!isFounder || me}
                style={({ pressed }) => [styles.row, me && styles.rowMe, pressed && styles.pressed]}
              >
                {showRanks ? <Text style={styles.rank}>{index + 1}</Text> : null}
                <Avatar user={user} diameter={32} />
                <View style={styles.flex}>
                  <Text noTranslate style={styles.name} numberOfLines={1}>
                    {me ? t('Du') : user.name}
                  </Text>
                  <Text style={styles.meta}>
                    {[
                      member?.role === 'founder' ? t('Gründerin') : null,
                      showRanks || me ? (r.done === 1 ? t('1 Aufgabe erledigt') : t('{done} Aufgaben erledigt', { done: r.done })) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                {showRanks || me ? (
                  <>
                    <View style={styles.crystal}>
                      <View style={styles.crystalFloat}>
                        <LivingCrystal height={36} seed={`rang-${user.id}`} />
                      </View>
                    </View>
                    <Text style={styles.eden}>{r.edensteine}</Text>
                  </>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </FieldGroup>
      {isFounder ? <Text style={styles.meta}>Tipp ein Mitglied an, um es zu entfernen oder ihm die Gründerrolle zu geben.</Text> : null}

      {isFounder ? (
        <FieldGroup label="Gruppeneinstellungen">
          <SwitchRow
            label="Rangliste anzeigen"
            description={
              showRanks
                ? 'Alle sehen, wer wie viele Edensteine hat.'
                : 'Alle sehen nur ihre eigenen Edensteine.'
            }
            value={showRanks}
            onValueChange={(show) => run(() => groupApi.setLeaderboard(group.id, show), 'Nicht gespeichert')}
          />
        </FieldGroup>
      ) : null}

      {group.members.length < MAX_MEMBERS ? (
        <FieldGroup label="Leute einladen">
          <CopyField label="Einladungscode" value={group.inviteCode} />
          <CopyField label="Einladungslink" value={inviteLink(group.inviteCode)} />
          <Button label="Einladung teilen" variant="secondary" onPress={() => shareText(inviteMessage(group))} />
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
  // Einzelner Edenstein je Zeile, ragt über die Zeilenhöhe (Daria, 22.10.2026)
  crystal: { width: 24, height: 22, alignItems: 'center' },
  crystalFloat: { position: 'absolute', top: (22 - 36) / 2 },
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
