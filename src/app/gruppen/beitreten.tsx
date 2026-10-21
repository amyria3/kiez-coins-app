import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useStore } from '../../data/store';
import { useNudge } from '../../components/Nudge';

/** Route `gruppen/beitreten`: Einladungscode eingeben. */
export default function JoinGroup() {
  const router = useRouter();
  const { groupApi } = useStore();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const codeField = useNudge();
  const clean = code.replace(/\s+/g, '').toUpperCase();

  const join = async () => {
    setBusy(true);
    try {
      const id = await groupApi.join(clean);
      router.replace(`/gruppen/${id}`);
    } catch (error) {
      Alert.alert('Beitreten hat nicht geklappt', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SubScreen
      title="Gruppe beitreten"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={<Button label={busy ? 'Trete bei …' : 'Beitreten'} onPress={join} disabled={busy || clean.length !== 6} whyDisabled={() => !busy && codeField.nudge('Der Code hat 6 Zeichen.')} />}
    >
      <TextField
        label="Einladungscode" required
        nudge={codeField}
        helperText="6 Zeichen, die Du von der Gruppe bekommen hast."
        value={code}
        onChangeText={setCode}
        maxLength={8}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
      />
    </SubScreen>
  );
}
