import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { KaterBubble, Notice } from '../../../components/Content';
import { TextField } from '../../../components/Form';
import { SubScreen } from '../../../components/Screen';
import { anrede } from '../../../data/format';
import { hasOpenWork } from '../../../data/openWork';
import { useStore } from '../../../data/store';

/**
 * Route `account/delete`. Figma: `account/delete`. Löscht später Profil, Challenges, Kommentare
 * und Zahlungsdaten (Apple-Pflicht, DSGVO). Im Prototyp wird nur das Profil zurückgesetzt.
 */
export default function DeleteAccount() {
  const router = useRouter();
  const { profile, challenges, currentUserId } = useStore();
  const [confirm, setConfirm] = useState('');

  const remove = () => {
    if (hasOpenWork(challenges, currentUserId)) {
      Alert.alert('Noch nicht möglich', 'Offene Bounties musst Du vorher klären.');
      return;
    }
    router.replace('/account/delete/success');
  };

  return (
    <SubScreen
      title="Konto löschen"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={
        <>
          <Button label="Konto endgültig löschen" onPress={remove} disabled={confirm.trim() !== 'LÖSCHEN'} />
          <Button label="Abbrechen" variant="secondary" onPress={() => router.back()} />
        </>
      }
    >
      <KaterBubble>Du willst von Bord? Schade, {anrede(profile)}. Bevor Du gehst:</KaterBubble>
      <Notice
        variant="warning"
        message="Dein Profil, Deine Challenges, Kommentare und Zahlungsdaten werden gelöscht. Das lässt sich nicht rückgängig machen."
      />
      <Notice message="Offene Bounties musst Du vorher klären. Wenn Du nur eine Pause brauchst, kannst Du Dein Konto auch 3 Monate pausieren." />
      <TextField
        label="Zum Bestätigen LÖSCHEN eintippen"
        helperText="Erst dann wird der Button aktiv."
        value={confirm}
        onChangeText={setConfirm}
        autoCapitalize="characters"
        autoCorrect={false}
      />
    </SubScreen>
  );
}
