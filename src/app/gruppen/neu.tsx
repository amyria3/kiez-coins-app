import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { Notice } from '../../components/Content';
import { TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { MAX_MEMBERS } from '../../data/groups';
import { useStore } from '../../data/store';
import { t } from '../../data/texts';
import { useNudge } from '../../components/Nudge';

/** Route `gruppen/neu`: Gruppe gründen. Danach geht es direkt zur Gruppe mit dem Einladungscode. */
export default function NewGroup() {
  const router = useRouter();
  const { groupApi } = useStore();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const nameField = useNudge();

  const create = async () => {
    setBusy(true);
    try {
      const id = await groupApi.create(name.trim());
      router.replace(`/gruppen/${id}`);
    } catch (error) {
      Alert.alert('Gruppe nicht gegründet', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SubScreen
      title="Gruppe gründen"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={
        <Button busy={busy} label={busy ? 'Wird gegründet …' : 'Gruppe gründen'} onPress={create} disabled={busy || !name.trim()} whyDisabled={() => !busy && nameField.nudge('Gib Eurer Gruppe einen Namen.')} />
      }
    >
      <TextField
        label="Name der Gruppe" required
        nudge={nameField}
        helperText="Zum Beispiel „WG Kastanienallee“ oder „Familie Brandt“. Max. 40 Zeichen."
        value={name}
        onChangeText={setName}
        maxLength={40}
        autoFocus
      />
      <Notice
        message={t(
          'Nach dem Gründen bekommst Du einen Code mit 6 Zeichen. Den teilst Du mit bis zu {anzahl} Leuten. Einen Kiez braucht es dafür nicht.',
          { anzahl: MAX_MEMBERS - 1 },
        )}
      />
    </SubScreen>
  );
}
