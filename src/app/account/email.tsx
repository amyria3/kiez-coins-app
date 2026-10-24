import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useAuth } from '../../data/auth';
import { t } from '../../data/texts';
import { useNudge } from '../../components/Nudge';
import { useGoBack } from '../../lib/goBack';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const MIN_DIGITS = 6;
const MAX_DIGITS = 8;

/**
 * Route `account/email` (Push aus „Zugangsdaten“): E-Mail-Adresse ändern.
 * Supabase schickt einen Code an die neue Adresse (Vorlage „Change Email Address“ mit `{{ .Token }}`).
 */
export default function ChangeEmail() {
  const router = useRouter();
  const goBack = useGoBack();
  const { session, requestEmailChange, confirmEmailChange } = useAuth();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const codeField = useNudge();
  const emailField = useNudge();
  const digits = code.replace(/\D/g, '');
  const address = email.trim().toLowerCase();
  const same = address === session?.user.email;

  const send = async () => {
    setBusy(true);
    setError(undefined);
    const failure = await requestEmailChange(address);
    setBusy(false);
    if (failure) setError(failure);
    else setSentTo(address);
  };

  const confirm = async () => {
    if (!sentTo) return;
    setBusy(true);
    setError(undefined);
    const failure = await confirmEmailChange(sentTo, digits);
    setBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    Alert.alert('Adresse geändert', t('Ab jetzt meldest Du Dich mit {sentTo} an.', { sentTo }));
    goBack();
  };

  return (
    <SubScreen
      title="E-Mail ändern"
      navigation="back"
      onLeadingPress={goBack}
      actions={
        sentTo ? (
          <Button busy={busy}
            label={busy ? 'Wird geprüft …' : 'Bestätigen'}
            onPress={confirm}
            disabled={digits.length < MIN_DIGITS || busy}
            whyDisabled={() => !busy && codeField.nudge(t('Der Code hat {MIN_DIGITS} Ziffern.', { MIN_DIGITS }))}
          />
        ) : (
          <Button busy={busy}
            label={busy ? 'Wird gesendet …' : 'Code senden'}
            onPress={send}
            disabled={!isEmail(email) || same || busy}
            whyDisabled={() => !busy && !same && emailField.nudge('Gib eine gültige E-Mail-Adresse ein.')}
          />
        )
      }
    >
      <KaterBubble>
        {sentTo
          ? t('Der Code ist unterwegs an {adresse}. Schaue auch im Spam-Netz.', { adresse: sentTo })
          : t('Gerade nutzt Du {adresse}. An die neue schick ich Dir einen Code.', {
              adresse: session?.user.email ?? 'keine Adresse',
            })}
      </KaterBubble>
      {sentTo ? (
        <TextField
          label="Code aus der E-Mail" required
        nudge={codeField}
          error={error}
          value={digits}
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
      ) : (
        <TextField
          label="Neue E-Mail" required
        nudge={emailField}
          error={error ?? (same ? 'Das ist schon Deine Adresse.' : undefined)}
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
          onSubmitEditing={() => isEmail(email) && !same && !busy && send()}
        />
      )}
    </SubScreen>
  );
}
