import { useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useAuth } from '../../data/auth';
import { loadOwnProfile } from '../../data/remote';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../data/store';
import { useNudge } from '../../components/Nudge';
import { t } from '../../data/texts';
import { homeAfterOnboarding } from '../../data/pendingInvite';
import { useGoBack } from '../../lib/goBack';

/** Supabase verschickt je nach Projekteinstellung 6 bis 8 Ziffern (Standard: 6). */
const MIN_DIGITS = 6;
const MAX_DIGITS = 8;

/**
 * Route `onboarding/code`. Figma: `onboarding/code`. Prüft den E-Mail-Code bei Supabase Auth.
 * Danach: bekanntes Konto mit fertigem Onboarding direkt in den Feed, sonst weiter zum Deckname.
 */
export default function Code() {
  const router = useRouter();
  const goBack = useGoBack();
  const { existing } = useLocalSearchParams<{ existing?: string }>();
  const { profile } = useStore();
  const { sendCode, verifyCode } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const codeField = useNudge();
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
    // Profil direkt aus der Datenbank lesen, nicht aus dem Store (der wird gerade erst befüllt).
    const { data } = await supabase.auth.getUser();
    const stored = data.user ? await loadOwnProfile(data.user.id).catch(() => null) : null;
    setBusy(false);
    if (stored?.onboarded) {
      const target = await homeAfterOnboarding();
      router.dismissAll();
      router.replace(target);
      return;
    }
    router.push('/onboarding/deckname');
  };

  const resend = async () => {
    const failure = await sendCode(profile.email, !existing);
    if (failure) setError(failure);
    else Alert.alert('Code neu gesendet', t('Schau in Dein Postfach: {email}', { email: profile.email }));
  };

  return (
    <SubScreen
      title="Anmelden"
      subtitle="Schritt 1 von 7"
      navigation="back"
      onLeadingPress={goBack}
      actions={
        <>
          <Button busy={busy}
            label={busy ? 'Wird geprüft …' : 'Bestätigen'}
            onPress={confirm}
            disabled={digits.length < MIN_DIGITS || busy}
            whyDisabled={() => !busy && codeField.nudge(t('Der Code hat {MIN_DIGITS} Ziffern.', { MIN_DIGITS }))}
          />
          <Button label="Code neu senden" variant="secondary" onPress={resend} disabled={busy} />
        </>
      }
    >
      <KaterBubble>Der Code ist unterwegs! Schau in Dein Postfach, zur Not auch im Spam-Netz.</KaterBubble>
      <TextField
        label="Code aus der E-Mail" required
        nudge={codeField}
        helperText={t('Gesendet an {email}. Gilt 20 Minuten.', { email: profile.email })}
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
