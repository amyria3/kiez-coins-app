import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { TextField } from '../../../components/Form';
import { SubScreen } from '../../../components/Screen';
import { useAuth } from '../../../data/auth';
import { errorText, sendSupportRequest } from '../../../data/remote';
import { useStore } from '../../../data/store';

/** Route `account/support` (Push aus „Dein Konto“): Support-Anfrage schreiben. */
export default function Support() {
  const router = useRouter();
  const { mode } = useStore();
  const { session } = useAuth();
  const [support, setSupport] = useState('');
  const [sending, setSending] = useState(false);
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
      actions={<Button label={sending ? 'Wird gesendet …' : 'Anfrage senden'} disabled={!support.trim() || sending} onPress={send} />}
    >
      <TextField
        label="Support-Anfrage"
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
