import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from '../../components/T';
import { useFocusEffect, useRouter } from 'expo-router';

import { AuthorRow } from '../../components/AuthorRow';
import { Button } from '../../components/Button';
import { FieldGroup, Notice } from '../../components/Content';
import { CopyField, TextField } from '../../components/Form';
import { useNudge } from '../../components/Nudge';
import { FriendInviteQr } from '../../components/FriendInviteQr';
import { SubScreen } from '../../components/Screen';
import { FRIEND_CODE_LENGTH, friendInviteLink, friendInviteMessage, parseFriendCode } from '../../data/friendInvites';
import { acceptFriend, acceptFriendInvite, errorText, loadFriends, myFriendInvite, removeFriend, type FriendLists } from '../../data/remote';
import { useStore } from '../../data/store';
import type { User } from '../../data/types';
import { color, space, text } from '../../theme/tokens';
import { t } from '../../data/texts';
import { useGoBack } from '../../lib/goBack';
import { shareText } from '../../lib/share';

/** Code in den Beispieldaten, ohne Datenbank */
const DEMO_INVITE_CODE = 'K7M2QXA';

/**
 * Route `account/freunde` (Push aus „Dein Konto“): Freundschaftsanfragen annehmen oder ablehnen,
 * gesendete Anfragen und Freund:innen. Anfragen stellt man im Profil einer Person.
 * Einladen per Link, QR-Code oder Code (Daria, 24.10.2026): Wer die Einladung annimmt, ist sofort befreundet.
 */
export default function Friends() {
  const router = useRouter();
  const goBack = useGoBack();
  const { mode, users, currentUserId } = useStore();
  // undefined: lädt, null: Migration fehlt
  const [lists, setLists] = useState<FriendLists | null | undefined>(undefined);
  // undefined: lädt, null: Migration fehlt
  const [inviteCode, setInviteCode] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (mode !== 'live') {
      setInviteCode(DEMO_INVITE_CODE);
      return;
    }
    myFriendInvite()
      .then(setInviteCode)
      .catch(() => setInviteCode(null));
  }, [mode]);

  const renewCode = () =>
    Alert.alert('Neuen Code erzeugen?', 'Der bisherige Link, QR-Code und Code funktionieren danach nicht mehr.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Neu erzeugen',
        style: 'destructive',
        onPress: async () => {
          if (mode !== 'live') return;
          try {
            setInviteCode(await myFriendInvite(true));
          } catch (error) {
            Alert.alert('Nicht geklappt', errorText(error));
          }
        },
      },
    ]);

  const refresh = useCallback(async () => {
    if (mode !== 'live') {
      const others = users.filter((u) => u.id !== currentUserId);
      setLists((l) => l ?? { incoming: others.slice(0, 1), friends: others.slice(1, 3), outgoing: [] });
      return;
    }
    setLists(await loadFriends(currentUserId));
  }, [mode, users, currentUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  // Zurück aus einem Profil: Stand neu laden
  useFocusEffect(
    useCallback(() => {
      if (mode === 'live') refresh();
    }, [mode, refresh]),
  );

  const run = async (change: (l: FriendLists) => FriendLists, action: () => Promise<void>) => {
    if (!lists) return;
    const before = lists;
    setLists(change(lists));
    if (mode !== 'live') return;
    try {
      await action();
    } catch (error) {
      setLists(before);
      Alert.alert('Nicht geklappt', errorText(error));
    }
  };
  const without = (list: User[], user: User) => list.filter((u) => u.id !== user.id);
  const accept = (user: User) =>
    run((l) => ({ ...l, incoming: without(l.incoming, user), friends: [user, ...l.friends] }), () => acceptFriend(currentUserId, user.id));
  const decline = (user: User) =>
    run((l) => ({ ...l, incoming: without(l.incoming, user) }), () => removeFriend(currentUserId, user.id));
  const withdraw = (user: User) =>
    run((l) => ({ ...l, outgoing: without(l.outgoing, user) }), () => removeFriend(currentUserId, user.id));
  const open = (user: User) => router.push({ pathname: '/user/[id]', params: { id: user.id } });

  // Einladungscode gleich hier eintippen, ohne eigene Seite (UX-Audit, Daria, 27.10.2026)
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const codeField = useNudge();
  const cleanCode = code.replace(/\s+/g, '').toUpperCase();
  const acceptInvite = async () => {
    setJoining(true);
    try {
      const already = (inviterId: string) => !!lists?.friends.some((f) => f.id === inviterId);
      const inviter = mode === 'live' ? await acceptFriendInvite(cleanCode) : null;
      if (inviter && already(inviter.id)) {
        Alert.alert('Schon befreundet', t('Du und {name} seid schon befreundet.', { name: inviter.name }));
      } else {
        Alert.alert(
          'Ihr seid befreundet',
          inviter ? t('Du und {name} seid jetzt befreundet.', { name: inviter.name }) : 'Die Einladung ist angenommen.',
        );
      }
      setCode('');
      await refresh();
    } catch (error) {
      Alert.alert('Annehmen hat nicht geklappt', errorText(error));
    } finally {
      setJoining(false);
    }
  };

  return (
    <SubScreen title="Freundschaften" navigation="back" onLeadingPress={goBack}>
      {lists === null ? (
        <Notice message="Freundschaften sind noch nicht freigeschaltet. Die Datenbank braucht dafür ein Update." />
      ) : null}
      {lists && lists.incoming.length ? (
        <FieldGroup label="Anfragen">
          {lists.incoming.map((user) => (
            <View key={user.id} style={styles.item}>
              <AuthorRow user={user} location={user.location} onPress={() => open(user)} />
              <View style={styles.buttons}>
                <Button label="Annehmen" onPress={() => accept(user)} style={styles.flex} />
                <Button label="Ablehnen" variant="secondary" onPress={() => decline(user)} />
              </View>
            </View>
          ))}
        </FieldGroup>
      ) : null}
      {lists ? (
        <FieldGroup label="Freund:innen">
          {lists.friends.length ? (
            lists.friends.map((user) => <AuthorRow key={user.id} user={user} location={user.location} onPress={() => open(user)} />)
          ) : (
            <Text style={styles.secondary}>Noch niemand. Lade Leute per Link, QR-Code oder Code ein.</Text>
          )}
        </FieldGroup>
      ) : null}
      {inviteCode ? (
        <FieldGroup label="Einladen">
          <Text style={styles.secondary}>Wer Deine Einladung annimmt, ist sofort mit Dir befreundet.</Text>
          <FriendInviteQr value={friendInviteLink(inviteCode)} />
          <CopyField label="Einladungslink" value={friendInviteLink(inviteCode)} />
          <CopyField label="Einladungscode" value={inviteCode} />
          <Button label="Einladung teilen" icon="friends" onPress={() => shareText(friendInviteMessage(inviteCode))} />
          <Button label="Neuen Code erzeugen" variant="secondary" onPress={renewCode} />
        </FieldGroup>
      ) : null}
      <FieldGroup label="Einladung annehmen">
        <TextField
          label="Einladungscode"
          nudge={codeField}
          helperText="7 Zeichen. Du kannst auch den ganzen Link oder die Nachricht einfügen."
          value={code}
          onChangeText={(value) => setCode(parseFriendCode(value) ?? value.slice(0, 9))}
          onSubmitEditing={() => cleanCode.length === FRIEND_CODE_LENGTH && acceptInvite()}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
        />
        <Button
          busy={joining}
          label={joining ? 'Nehme an …' : 'Annehmen'}
          variant="secondary"
          onPress={acceptInvite}
          disabled={joining || cleanCode.length !== FRIEND_CODE_LENGTH}
          whyDisabled={() => !joining && codeField.nudge('Der Code hat 7 Zeichen.')}
        />
      </FieldGroup>
      {lists && lists.outgoing.length ? (
        <FieldGroup label="Gesendet">
          {lists.outgoing.map((user) => (
            <View key={user.id} style={styles.item}>
              <AuthorRow user={user} location={user.location} onPress={() => open(user)} />
              <Button label="Anfrage zurückziehen" variant="secondary" onPress={() => withdraw(user)} />
            </View>
          ))}
        </FieldGroup>
      ) : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  item: { gap: space[8] },
  buttons: { flexDirection: 'row', gap: space[8] },
  flex: { flex: 1 },
  secondary: { ...text.body, color: color.text.secondary },
});
