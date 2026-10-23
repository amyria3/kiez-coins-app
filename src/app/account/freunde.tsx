import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from '../../components/T';
import { useFocusEffect, useRouter } from 'expo-router';

import { AuthorRow } from '../../components/AuthorRow';
import { Button } from '../../components/Button';
import { FieldGroup, Notice } from '../../components/Content';
import { SubScreen } from '../../components/Screen';
import { acceptFriend, errorText, loadFriends, removeFriend, type FriendLists } from '../../data/remote';
import { useStore } from '../../data/store';
import type { User } from '../../data/types';
import { color, space, text } from '../../theme/tokens';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `account/freunde` (Push aus „Dein Konto“): Freundschaftsanfragen annehmen oder ablehnen,
 * gesendete Anfragen und Freund:innen. Anfragen stellt man im Profil einer Person.
 */
export default function Friends() {
  const router = useRouter();
  const goBack = useGoBack();
  const { mode, users, currentUserId } = useStore();
  // undefined: lädt, null: Migration fehlt
  const [lists, setLists] = useState<FriendLists | null | undefined>(undefined);

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
            <Text style={styles.secondary}>Noch niemand. Im Profil einer Person fragst Du an.</Text>
          )}
        </FieldGroup>
      ) : null}
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
