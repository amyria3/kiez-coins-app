import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from '../../components/T';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { AuthorRow } from '../../components/AuthorRow';
import { Button } from '../../components/Button';
import { FieldGroup, Notice } from '../../components/Content';
import { CopyField, TextField } from '../../components/Form';
import { useNudge } from '../../components/Nudge';
import { InviteQr } from '../../components/InviteQr';
import { SubScreen } from '../../components/Screen';
import { FRIEND_CODE_LENGTH, friendInviteLink, friendInviteMessage, parseFriendCode } from '../../data/friendInvites';
import { acceptFriend, acceptFriendInvite, errorDetail, errorText, loadFriends, myFriendInvite, removeFriend, requestFriend, type FriendLists } from '../../data/remote';
import { useStore } from '../../data/store';
import type { User } from '../../data/types';
import { color, space, text } from '../../theme/tokens';
import { t } from '../../data/texts';
import { useGoBack } from '../../lib/goBack';
import { shareText } from '../../lib/share';
import { BlockedList } from '../../components/BlockedList';
import { Segments } from '../../components/FeedHeader';

type ContactTab = 'invite' | 'friends' | 'groups' | 'blocked';

/** Code in den Beispieldaten, ohne Datenbank */
const DEMO_INVITE_CODE = 'K7M2QXA';

/**
 * Route `account/friends`, Seite „Kontakte“ (Daria, 2026-11-17): Umschalter Einladen | Freund:innen | Menschen in
 * Gruppen | Gesperrt.
 * Freundschaftsanfragen annehmen oder ablehnen,
 * gesendete Anfragen und Freund:innen. Anfragen stellt man im Profil einer Person.
 * Einladen per Link, QR-Code oder Code (Daria, 24.10.2026): Wer die Einladung annimmt, ist sofort befreundet.
 */
export default function Friends() {
  // Kontakte mit Umschalter Einladen | Freund:innen | Gesperrt (Daria, 2026-11-17). `reiter` wählt ihn beim Öffnen,
  // z. B. `einladen` aus den Nachrichten, `gesperrt` aus „Blockierte Personen“. `einladen=1` gilt weiter.
  const { einladen, reiter } = useLocalSearchParams<{ einladen?: string; reiter?: string }>();
  const [section, setSection] = useState<ContactTab>(
    einladen === '1' || reiter === 'einladen' ? 'invite' : reiter === 'gesperrt' ? 'blocked' : reiter === 'gruppen' ? 'groups' : 'friends',
  );
  const router = useRouter();
  const goBack = useGoBack();
  const { mode, users, currentUserId, groups, blockedIds } = useStore();
  // undefined: lädt, null: Fehler
  const [lists, setLists] = useState<FriendLists | null | undefined>(undefined);
  // undefined: lädt, null: Fehler
  const [inviteCode, setInviteCode] = useState<string | null | undefined>(undefined);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'live') {
      setInviteCode(DEMO_INVITE_CODE);
      return;
    }
    myFriendInvite()
      .then(setInviteCode)
      .catch((error) => {
        setInviteCode(null);
        setInviteError(errorDetail(error));
      });
  }, [mode]);

  const renewCode = () =>
    Alert.alert('Neuen Passcode erzeugen?', 'Der bisherige Link, die Instant-Verbindung und der Passcode funktionieren danach nicht mehr.', [
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

  // Passcode gleich hier eintippen, ohne eigene Seite (UX-Audit, Daria, 27.10.2026)
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

  const inviteBlock = (
    <>
      {inviteError ? <Notice message={`${t('Deine Einladung nicht geladen.')} (${inviteError})`} /> : null}
      {inviteCode ? (
        <FieldGroup heading label="Deine Einladung">
          <Text style={styles.secondary}>Wer Deine Einladung annimmt, ist sofort mit Dir befreundet.</Text>
          <InviteQr value={friendInviteLink(inviteCode)} label={t('Instant-Verbindung zum Scannen')} />
          <CopyField label="Einladungslink" value={friendInviteLink(inviteCode)} />
          <CopyField label="Passcode" value={inviteCode} />
          <Button label="Einladung teilen" icon="friends" onPress={() => shareText(friendInviteMessage(inviteCode))} />
          <Button label="Neuen Passcode erzeugen" variant="secondary" onPress={renewCode} />
        </FieldGroup>
      ) : null}
    </>
  );

  // Einladen: eigene Einladung und eine fremde annehmen
  const invitePage = (
    <>
      {inviteBlock}
      <FieldGroup heading label="Einladung annehmen">
        <TextField
          label="Passcode"
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
          whyDisabled={() => !joining && codeField.nudge('Der Passcode hat 7 Zeichen.')}
        />
      </FieldGroup>
    </>
  );

  // Menschen in Gruppen (Daria, 2026-11-17): alle aus Deinen Gruppen, damit Du Einzelnen eine Freundschaftsanfrage
  // senden kannst. Gruppen sind nie öffentlich, nur Mitglieder sehen einander. Ohne Dich und ohne Blockierte.
  const groupPeople = (() => {
    const byId = new Map<string, { user: User; groups: string[] }>();
    for (const g of groups) {
      for (const m of g.members) {
        if (m.userId === currentUserId || blockedIds.includes(m.userId)) continue;
        const user = users.find((u) => u.id === m.userId);
        if (!user) continue;
        const entry = byId.get(m.userId) ?? { user, groups: [] };
        entry.groups.push(g.name);
        byId.set(m.userId, entry);
      }
    }
    return [...byId.values()].sort((a, b) => a.user.name.localeCompare(b.user.name, 'de'));
  })();
  const isIn = (list: User[] | undefined, user: User) => !!list?.some((u) => u.id === user.id);
  const request = (user: User) =>
    run((l) => ({ ...l, outgoing: [...l.outgoing, user] }), () => requestFriend(user.id));
  const groupsPage = (
    <>
      <Text style={styles.secondary}>Menschen aus Deinen Gruppen. Sende Einzelnen eine Freundschaftsanfrage.</Text>
      {groupPeople.length === 0 ? (
        <Text style={styles.secondary}>In Deinen Gruppen ist noch niemand außer Dir.</Text>
      ) : null}
      {groupPeople.map(({ user, groups: names }) => (
        <View key={user.id} style={styles.item}>
          <AuthorRow user={user} onPress={() => open(user)} />
          <Text noTranslate style={styles.secondary}>
            {names.join(', ')}
          </Text>
          {isIn(lists?.friends, user) ? (
            <Text style={styles.secondary}>Befreundet</Text>
          ) : isIn(lists?.outgoing, user) ? (
            <Button label="Anfrage zurückziehen" variant="secondary" onPress={() => withdraw(user)} />
          ) : isIn(lists?.incoming, user) ? (
            <Button label="Anfrage annehmen" onPress={() => accept(user)} />
          ) : lists ? (
            <Button label="Als Freund:in anfragen" variant="secondary" onPress={() => request(user)} />
          ) : null}
        </View>
      ))}
    </>
  );

  // Freund:innen: Anfragen, Freund:innen, gesendete Anfragen
  const friendsPage = (
    <>
      {lists === null ? (
        <Notice message="Freundschaften sind noch nicht freigeschaltet. Die Datenbank braucht dafür ein Update." />
      ) : null}
      {lists && lists.incoming.length ? (
        <FieldGroup heading label="Anfragen">
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
        lists.friends.length ? (
          <View style={styles.list}>
            {lists.friends.map((user) => (
              <AuthorRow key={user.id} user={user} location={user.location} onPress={() => open(user)} />
            ))}
          </View>
        ) : (
          <Text style={styles.secondary}>Noch niemand. Lade Leute unter „Einladen“ per Instant-Verbindung, Link oder Passcode ein.</Text>
        )
      ) : null}
      {lists && lists.outgoing.length ? (
        <FieldGroup heading label="Gesendet">
          {lists.outgoing.map((user) => (
            <View key={user.id} style={styles.item}>
              <AuthorRow user={user} location={user.location} onPress={() => open(user)} />
              <Button label="Anfrage zurückziehen" variant="secondary" onPress={() => withdraw(user)} />
            </View>
          ))}
        </FieldGroup>
      ) : null}
    </>
  );

  return (
    <SubScreen title="Kontakte" navigation="back" onLeadingPress={goBack}>
      {/* Kontakte mit Umschalter, Einladen ganz links (Daria, 2026-11-17) */}
      <Segments
        tabs={[
          { key: 'invite', label: 'Einladen' },
          { key: 'friends', label: 'Freund:innen' },
          // Kurz, damit vier Reiter in den Umschalter passen; „Menschen in Gruppen“ steht als Satz darunter
          { key: 'groups', label: 'Gruppen' },
          { key: 'blocked', label: 'Gesperrt' },
        ]}
        selectedKey={section}
        onChange={setSection}
        accent
      />
      {section === 'invite' ? invitePage : section === 'blocked' ? <BlockedList /> : section === 'groups' ? groupsPage : friendsPage}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  item: { gap: space[8] },
  list: { gap: space[16] },
  buttons: { flexDirection: 'row', gap: space[8] },
  flex: { flex: 1 },
  secondary: { ...text.body, color: color.text.secondary },
});
