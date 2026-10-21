import { useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { TextField } from '../../../components/Form';
import { SubScreen } from '../../../components/Screen';
import { useAuth } from '../../../data/auth';
import { errorText, sendSupportRequest } from '../../../data/remote';
import { useStore } from '../../../data/store';
import { useNudge } from '../../../components/Nudge';

/**
 * Route `account/support` (Push aus „Dein Konto“): Support-Anfrage schreiben.
 * `text` füllt das Feld vor, zum Beispiel aus „Deine Challenges“, wenn Löschen nicht mehr geht.
 */
export default function Support() {
  const router = useRouter();
  const { text: preset } = useLocalSearchParams<{ text?: string }>();
  const { mode } = useStore();
  const { session } = useAuth();
  const [support, setSupport] = useState(preset ?? '');
  const [sending, setSending] = useState(false);
  const field = useNudge();
  const live = mode === 'live' && !!session;

  const send = async () => {
    if (live) {
      setSending(true);
      try {
        await sendSupportRequest(support);
      } catch (error) {
        Alert.alert('Nicht gesendet', errorText(error));
        return;
      } finally {
        setSending(false);
      }
    }
    setSupport('');
    router.replace('/account/support/success');
  };

  return (
    <SubScreen
      title="Support"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={<Button label={sending ? 'Wird gesendet …' : 'Anfrage senden'} disabled={!support.trim() || sending} whyDisabled={() => !sending && field.nudge('Schreib kurz, worum es geht.')} onPress={send} />}
    >
      <TextField
        label="Support-Anfrage" required
        nudge={field}
        helperText="Schreib uns, was nicht klappt. Wir antworten per E-Mail."
        value={support}
        onChangeText={setSupport}
        multiline
        maxLength={1000}
        autoFocus
      />
    </SubScreen>
  );
}
