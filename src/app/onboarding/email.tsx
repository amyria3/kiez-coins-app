import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useAuth } from '../../data/auth';
import { loadOwnProfile } from '../../data/remote';
import { useStore } from '../../data/store';
import { supabase } from '../../lib/supabase';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const MIN_PASSWORD = 8;

/**
 * Route `onboarding/email`. Figma: `onboarding/email`.
 * Vorerst Anmeldung mit E-Mail und Passwort, weil es noch keinen Mailversand gibt.
 * Der Code-Login (`onboarding/code`) kommt zurück, sobald eine eigene Domain eingerichtet ist.
 * Danach: bekanntes Konto mit fertigem Onboarding direkt in den Feed, sonst weiter zum Deckname.
 */
export default function Email() {
  const router = useRouter();
  const { existing } = useLocalSearchParams<{ existing?: string }>();
  const { profile, dispatch } = useStore();
  const { signUpWithPassword, signInWithPassword } = useAuth();
  const [email, setEmail] = useState(profile.email);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const valid = isEmail(email) && password.length >= (existing ? 1 : MIN_PASSWORD);

  const submit = async () => {
    const address = email.trim().toLowerCase();
    setBusy(true);
    setError(undefined);
    // „Ich hab schon ein Konto“ meldet nur an, „Anheuern“ legt ein neues Konto an.
    const failure = existing
      ? await signInWithPassword(address, password)
      : await signUpWithPassword(address, password);
    if (failure) {
      setBusy(false);
      setError(failure);
      return;
    }
    dispatch({ type: 'updateProfile', patch: { email: address } });
    // Profil direkt aus der Datenbank lesen, nicht aus dem Store (der wird gerade erst befüllt).
    const { data } = await supabase.auth.getUser();
    const stored = data.user ? await loadOwnProfile(data.user.id).catch(() => null) : null;
    setBusy(false);
    if (stored?.onboarded) {
      router.dismissAll();
      router.replace('/feed');
      return;
    }
    router.push('/onboarding/deckname');
  };

  const label = existing ? (busy ? 'Wird geprüft …' : 'Anmelden') : busy ? 'Wird angelegt …' : 'Konto anlegen';

  return (
    <SubScreen
      title="Anmelden"
      subtitle="Schritt 1 von 6"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={<Button label={label} onPress={submit} disabled={!valid || busy} />}
    >
      <KaterBubble>
        {existing
          ? 'Willkommen zurück an Bord! Deine Flaschenpost-Adresse und Dein Passwort, bitte.'
          : 'Erst mal Deine Flaschenpost-Adresse und ein Passwort, das nur Du kennst.'}
      </KaterBubble>
      <TextField
        label="E-Mail"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setError(undefined);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        autoFocus
      />
      <TextField
        label="Passwort"
        helperText={existing ? undefined : `Mindestens ${MIN_PASSWORD} Zeichen.`}
        error={error}
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setError(undefined);
        }}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={existing ? 'current-password' : 'new-password'}
        textContentType={existing ? 'password' : 'newPassword'}
        onSubmitEditing={() => valid && !busy && submit()}
      />
    </SubScreen>
  );
}
