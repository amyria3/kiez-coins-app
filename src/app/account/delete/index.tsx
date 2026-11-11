import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { KaterCard, Notice, QuestionHint } from '../../../components/Content';
import { TextField } from '../../../components/Form';
import { SubScreen } from '../../../components/Screen';
import { anrede } from '../../../data/format';
import { hasOpenWork } from '../../../data/openWork';
import { deleteMyAccount, errorText } from '../../../data/remote';
import { useStore } from '../../../data/store';
import { t } from '../../../data/texts';
import { useNudge } from '../../../components/Nudge';
import { useGoBack } from '../../../lib/goBack';

/**
 * Route `account/delete`. Figma: `account/delete`. Löscht Fotos, Profil, Challenges, Kommentare
 * und Zahlungsdaten (Apple-Pflicht, DSGVO) über die Datenbankfunktion `delete_my_account`.
 */
export default function DeleteAccount() {
  const router = useRouter();
  const goBack = useGoBack();
  const { profile, challenges, currentUserId, mode } = useStore();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const confirmField = useNudge();

  const remove = async () => {
    if (hasOpenWork(challenges, currentUserId)) {
      Alert.alert('Noch nicht möglich', 'Offene Coins musst Du vorher klären.');
      return;
    }
    if (mode === 'live') {
      setBusy(true);
      try {
        await deleteMyAccount();
      } catch (error) {
        Alert.alert('Konto nicht gelöscht', errorText(error));
        return;
      } finally {
        setBusy(false);
      }
    }
    router.replace('/account/delete/success');
  };

  return (
    <SubScreen
      title="Konto löschen"
      navigation="back"
      onLeadingPress={goBack}
      actions={
        <>
          <Button busy={busy} label="Konto endgültig löschen" onPress={remove} disabled={confirm.trim() !== 'LÖSCHEN' || busy}
            whyDisabled={() => !busy && confirmField.nudge('Tippe LÖSCHEN in Großbuchstaben ein.')}
          />
          <Button label="Abbrechen" variant="secondary" onPress={() => goBack()} />
        </>
      }
    >
      <KaterCard>{t('Du willst von Bord? Schade, {anrede}. Bevor Du gehst:', { anrede: anrede(profile) })}</KaterCard>
      <Notice
        variant="warning"
        message="Dein Profil, Deine Fotos, Challenges, Kommentare und Zahlungsdaten werden gelöscht. Das lässt sich nicht rückgängig machen."
      />
      <QuestionHint question="Was passiert mit offenen Coins?" answer="Kläre offene Coins, bevor Du Dein Konto löschst. Brauchst Du nur eine Pause? Dann pausiere Dein Konto für 3 Monate." />
      <TextField
        label="Zum Bestätigen LÖSCHEN eintippen" required
        nudge={confirmField}
        helperText="Erst dann wird der Button aktiv."
        value={confirm}
        onChangeText={setConfirm}
        autoCapitalize="characters"
        autoCorrect={false}
      />
    </SubScreen>
  );
}
