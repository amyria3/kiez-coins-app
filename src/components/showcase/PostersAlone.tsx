import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { CHAT_GAP_CHANGE, CHAT_GAP_SAME, ChatReply, Notice } from '../Content';

/**
 * „Wer darf posten?“, solange niemand sonst in der Gruppe des Schaufensters ist (Daria, 2026-11-23): zwei Nachrichten
 * der App, dann eine Antwort zum Antippen. Mit Gruppe „Lass mich Leute einladen“, ohne Gruppe „Lass mich eine Gruppe
 * erstellen“. Die Antwort der App darauf führt mit einem Link zur Einladung bzw. zu „Neue Gruppe“.
 */
export function PostersAlone({ groupId }: { groupId?: string }) {
  const [asked, setAsked] = useState(false);
  return (
    <View>
      <View style={styles.same}>
        <Notice message={groupId ? 'Noch bist Du allein in der Gruppe.' : 'Zu diesem Schaufenster gibt es noch keine Gruppe.'} />
        <Notice message="Treten andere Deiner Gruppe bei, kannst Du ihnen hier erlauben, auch zu posten." />
      </View>
      <View style={styles.change}>
        <ChatReply label={groupId ? 'Lass mich Leute einladen' : 'Lass mich eine Gruppe erstellen'} sent={asked} onPress={() => setAsked(true)} />
      </View>
      {asked ? (
        <View style={styles.change}>
          {groupId ? (
            <Notice
              message="Lade sie mit Link, QR-Code oder Code in die Gruppe ein. Wer beitritt, steht danach hier mit einem Schalter."
              action={{ label: 'Leute einladen', onPress: () => router.push(`/groups/${groupId}/invite`) }}
            />
          ) : (
            <Notice
              message="Erstelle eine Gruppe und lade Leute ein. Wer beitritt, kann danach mitposten, wenn Du es erlaubst."
              action={{ label: 'Gruppe erstellen', onPress: () => router.push('/groups/new') }}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  same: { gap: CHAT_GAP_SAME },
  change: { marginTop: CHAT_GAP_CHANGE },
});
