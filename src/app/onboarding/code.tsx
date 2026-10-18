import { useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../data/auth';
import { useStore } from '../../data/store';

/** Supabase verschickt je nach Projekteinstellung 6 bis 8 Ziffern (Standard: 6). */
const MIN_DIGITS = 6;
const MAX_DIGITS = 8;

/**
 * Route `onboarding/code`. Figma: `onboarding/code`. Prüft den E-Mail-Code bei Supabase Auth.
 * Danach: bekanntes Konto mit fertigem Onboarding direkt in den Feed, sonst weiter zum Deckname.
 */
export default function Code() {
  const router = useRouter();
  const { existing } = useLocalSearchParams<{ existing?: string }>();
  const { profile } = useStore();
  const { sendCode, verifyCode } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const digits = code.replace(/\D/g, '');

  const confirm = async () => {
    setBusy(true);
    setError(undefined);
    const failure = await verifyCode(profile.email, digits);
    if (failure) {
      setBusy(false);
      setError(failure);
      return;
    }
    // Profil direkt aus der frischen Sitzung lesen, nicht aus dem Store (der wird gerade erst befüllt).
    const { data } = await supabase.auth.getUser();
    setBusy(false);
    if (data.user?.user_metadata?.onboarded) {
      router.dismissAll();
      router.replace('/feed');
      return;
    }
    router.push('/onboarding/deckname');
  };

  const resend = async () => {
    const failure = await sendCode(profile.email, !existing);
    if (failure) setError(failure);
    else Alert.alert('Code neu gesendet', `Schau in Dein Postfach: ${profile.email}`);
  };

  return (
    <SubScreen
      title="Anmelden"
      subtitle="Schritt 1 von 6"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={
        <>
          <Button
            label={busy ? 'Wird geprüft …' : 'Bestätigen'}
            onPress={confirm}
            disabled={digits.length < MIN_DIGITS || busy}
          />
          <Button label="Code neu senden" variant="secondary" onPress={resend} disabled={busy} />
        </>
      }
    >
      <KaterBubble>Der Code ist unterwegs! Schau in Dein Postfach, zur Not auch im Spam-Netz.</KaterBubble>
      <TextField
        label="Code aus der E-Mail"
        helperText={`Gesendet an ${profile.email}. Gilt 10 Minuten.`}
        error={error}
        value={digits.length === 6 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits}
        onChangeText={(v) => {
          setCode(v.replace(/\D/g, '').slice(0, MAX_DIGITS));
          setError(undefined);
        }}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        autoFocus
        onSubmitEditing={() => digits.length >= MIN_DIGITS && !busy && confirm()}
      />
    </SubScreen>
  );
}
