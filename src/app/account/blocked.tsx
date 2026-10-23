import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from '../../components/T';

import { AuthorRow } from '../../components/AuthorRow';
import { Button } from '../../components/Button';
import { Notice } from '../../components/Content';
import { SubScreen } from '../../components/Screen';
import { nameInText } from '../../data/format';
import { errorText, loadBlockedUsers } from '../../data/remote';
import { useStore } from '../../data/store';
import type { User } from '../../data/types';
import { color, space, text } from '../../theme/tokens';
import { t } from '../../data/texts';
import { useGoBack } from '../../lib/goBack';

/** Route `account/blocked` (Push aus „Dein Konto“): blockierte Personen, Blockierung aufheben. */
export default function BlockedUsers() {
  const goBack = useGoBack();
  const { mode, blockedIds, users, unblock } = useStore();
  const [blocked, setBlocked] = useState<User[] | null>(null);

  const refresh = useCallback(async () => {
    if (mode !== 'live') {
      setBlocked(users.filter((u) => blockedIds.includes(u.id)));
      return;
    }
    try {
      setBlocked(await loadBlockedUsers());
    } catch (error) {
      Alert.alert('Liste nicht geladen', errorText(error));
      setBlocked([]);
    }
  }, [mode, users, blockedIds]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const ask = (user: User) =>
    Alert.alert('Blockierung aufheben?', t('Du siehst wieder die Challenges und Kommentare von {name}.', { name: nameInText(user) }), [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Aufheben',
        onPress: async () => {
          try {
            await unblock(user.id);
            setBlocked((list) => list?.filter((u) => u.id !== user.id) ?? null);
          } catch (error) {
            Alert.alert('Hat nicht geklappt', (error as Error).message);
          }
        },
      },
    ]);

  return (
    <SubScreen title="Blockierte Personen" navigation="back" onLeadingPress={goBack}>
      <Notice message="Blockierte Personen sehen nicht, dass Du sie blockiert hast. Sie können Deine Challenges weder annehmen noch kommentieren." />
      {blocked && blocked.length === 0 ? <Text style={styles.secondary}>Du hast niemanden blockiert.</Text> : null}
      {blocked?.map((user) => (
        <View key={user.id} style={styles.item}>
          <AuthorRow user={user} location={user.location} />
          <Button label="Blockierung aufheben" variant="secondary" onPress={() => ask(user)} />
        </View>
      ))}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  item: { gap: space[4] },
  secondary: { ...text.body, color: color.text.secondary },
});
