import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useStore } from '../../data/store';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/** Route `onboarding/email`. Figma: `onboarding/email`. Anmeldung ohne Passwort (E-Mail-Code). */
export default function Email() {
  const router = useRouter();
  const { existing } = useLocalSearchParams<{ existing?: string }>();
  const { profile, dispatch } = useStore();
  const [email, setEmail] = useState(profile.email);

  const send = () => {
    dispatch({ type: 'updateProfile', patch: { email: email.trim() } });
    router.push({ pathname: '/onboarding/code', params: existing ? { existing } : {} });
  };

  return (
    <SubScreen
      title="Anmelden"
      subtitle="Schritt 1 von 6"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={<Button label="Code senden" onPress={send} disabled={!isEmail(email)} />}
    >
      <KaterBubble>
        Erst mal Deine Flaschenpost-Adresse. Ich schick Dir einen Code. Passwörter sind was für Landratten.
      </KaterBubble>
      <TextField
        label="E-Mail"
        helperText="Kein Passwort nötig. Du bekommst einen 6-stelligen Code."
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        autoFocus
        onSubmitEditing={() => isEmail(email) && send()}
      />
    </SubScreen>
  );
}
