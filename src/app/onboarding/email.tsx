import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { CONFIRM, useAuth } from '../../data/auth';
import { loadOwnProfile } from '../../data/remote';
import { useStore } from '../../data/store';
import { supabase } from '../../lib/supabase';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const MIN_PASSWORD = 8;

/**
 * Route `onboarding/email`. Figma: `onboarding/email`.
 * Zwei Wege: Code per Mail (Standard) oder Passwort. Der Code-Weg schickt einen Code und geht weiter
 * zu `onboarding/code`. Der Passwort-Weg meldet direkt an. Ist „Confirm email“ in Supabase an, legt er
 * das Konto an und geht zur Bestätigung ebenfalls zu `onboarding/code`.
 * Danach: bekanntes Konto mit fertigem Onboarding direkt in den Feed, sonst weiter zum Deckname.
 */
export default function Email() {
  const router = useRouter();
  const { existing } = useLocalSearchParams<{ existing?: string }>();
  const { profile, dispatch } = useStore();
  const { sendCode, signUpWithPassword, signInWithPassword } = useAuth();
  const [mode, setMode] = useState<'code' | 'password'>('code');
  const [email, setEmail] = useState(profile.email);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const withPassword = mode === 'password';
  const valid = isEmail(email) && (!withPassword || password.length >= (existing ? 1 : MIN_PASSWORD));

  const toCode = (signup: boolean) =>
    router.push({
      pathname: '/onboarding/code',
      params: { ...(existing ? { existing: '1' } : {}), ...(signup ? { signup: '1' } : {}) },
    });

  const submit = async () => {
    const address = email.trim().toLowerCase();
    setBusy(true);
    setError(undefined);

    if (!withPassword) {
      // „Anheuern“ darf ein Konto anlegen, „Ich hab schon ein Konto“ nicht.
      const failure = await sendCode(address, !existing);
      setBusy(false);
      if (failure) {
        setError(failure);
        return;
      }
      dispatch({ type: 'updateProfile', patch: { email: address } });
      toCode(false);
      return;
    }

    // „Ich hab schon ein Konto“ meldet nur an, „Anheuern“ legt ein neues Konto an.
    const result = existing
      ? await signInWithPassword(address, password)
      : await signUpWithPassword(address, password);
    if (result === CONFIRM) {
      // Konto steht, die Adresse wartet auf den Code aus der Bestätigungsmail.
      setBusy(false);
      dispatch({ type: 'updateProfile', patch: { email: address } });
      toCode(true);
      return;
    }
    if (result) {
      setBusy(false);
      setError(result);
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

  const label = !withPassword
    ? busy
      ? 'Wird gesendet …'
      : 'Code schicken'
    : existing
      ? busy
        ? 'Wird geprüft …'
        : 'Anmelden'
      : busy
        ? 'Wird angelegt …'
        : 'Konto anlegen';

  const bubble = !withPassword
    ? existing
      ? 'Willkommen zurück an Bord! Deine Flaschenpost-Adresse, bitte. Ich schick Dir einen Code.'
      : 'Erst mal Deine Flaschenpost-Adresse. Ich schick Dir einen Code.'
    : existing
      ? 'Willkommen zurück an Bord! Deine Flaschenpost-Adresse und Dein Passwort, bitte.'
      : 'Erst mal Deine Flaschenpost-Adresse und ein Passwort, das nur Du kennst.';

  return (
    <SubScreen
      title="Anmelden"
      subtitle="Schritt 1 von 6"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={
        <>
          <Button label={label} onPress={submit} disabled={!valid || busy} />
          <Button
            label={withPassword ? 'Lieber mit Code' : 'Lieber mit Passwort'}
            variant="ghost"
            onPress={() => {
              setMode(withPassword ? 'code' : 'password');
              setError(undefined);
            }}
            disabled={busy}
          />
        </>
      }
    >
      <KaterBubble>{bubble}</KaterBubble>
      <TextField
        label="E-Mail"
        error={withPassword ? undefined : error}
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
        onSubmitEditing={() => !withPassword && valid && !busy && submit()}
      />
      {withPassword && (
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
      )}
    </SubScreen>
  );
}
