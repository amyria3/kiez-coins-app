import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useAuth } from '../../data/auth';

const MIN_PASSWORD = 8;

/**
 * Route `account/password` (Push aus „Zugangsdaten“): Passwort hinterlegen oder ändern.
 * Auch der Weg bei vergessenem Passwort: per Code anmelden, dann hier ein neues festlegen.
 */
export default function Password() {
  const router = useRouter();
  const { setPassword, hasPassword } = useAuth();
  const [password, setValue] = useState('');
  const [repeat, setRepeat] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const mismatch = repeat.length > 0 && repeat !== password;
  const valid = password.length >= MIN_PASSWORD && repeat === password;

  const save = async () => {
    setSaving(true);
    setError(undefined);
    const failure = await setPassword(password);
    setSaving(false);
    if (failure) {
      setError(failure);
      return;
    }
    Alert.alert('Passwort gespeichert', 'Ab jetzt meldest Du Dich mit E-Mail und Passwort oder per Code an.');
    router.back();
  };

  return (
    <SubScreen
      title={hasPassword ? 'Passwort ändern' : 'Passwort hinterlegen'}
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={<Button label={saving ? 'Wird gespeichert …' : 'Passwort speichern'} disabled={!valid || saving} onPress={save} />}
    >
      <KaterBubble>
        {hasPassword
          ? 'Wähl ein neues Passwort. Das alte gilt danach nicht mehr.'
          : 'Leg ein Passwort fest, das nur Du kennst. Den Code per Mail kannst Du weiter nutzen.'}
      </KaterBubble>
      <TextField
        label="Neues Passwort"
        helperText={`Mindestens ${MIN_PASSWORD} Zeichen.`}
        value={password}
        onChangeText={(v) => {
          setValue(v);
          setError(undefined);
        }}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        autoFocus
      />
      <TextField
        label="Passwort wiederholen"
        error={error ?? (mismatch ? 'Die Passwörter stimmen nicht überein.' : undefined)}
        value={repeat}
        onChangeText={(v) => {
          setRepeat(v);
          setError(undefined);
        }}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={() => valid && !saving && save()}
      />
    </SubScreen>
  );
}
