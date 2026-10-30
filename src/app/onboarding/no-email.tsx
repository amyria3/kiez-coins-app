import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { TextField } from '../../components/Form';
import { LegalLinks } from '../../components/LegalLinks';
import { SubScreen } from '../../components/Screen';
import { MIN_PASSWORD, useAuth } from '../../data/auth';
import { loadOwnProfile } from '../../data/remote';
import { useStore } from '../../data/store';
import { supabase } from '../../lib/supabase';
import { space } from '../../theme/tokens';
import { useNudge } from '../../components/Nudge';
import { t } from '../../data/texts';
import { homeAfterOnboarding } from '../../data/pendingInvite';
import { useGoBack } from '../../lib/goBack';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/**
 * Route `onboarding/no-email`, erreichbar über „Ich möchte meine E-Mail nicht teilen“ (Daria, 27.10.2026).
 * Anmelden mit Deckname und Passwort. Gibt es zum Decknamen kein Konto ohne E-Mail, legt die App eins an.
 * Wer möchte, bekommt Deckname und Passwort einmal per Mail; die Adresse wird nicht gespeichert.
 * Danach: bekanntes Konto mit fertigem Onboarding in den Feed, sonst weiter zu Deckname und Geschlecht
 * (der Deckname steht ja schon).
 */
export default function OhneMail() {
  const router = useRouter();
  const goBack = useGoBack();
  const { dispatch } = useStore();
  const { signInOrUpWithHandle } = useAuth();
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [copyTo, setCopyTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [copyError, setCopyError] = useState<string>();
  const pwField = useNudge();

  const valid = handle.trim().length > 0 && password.length > 0;

  const submit = async () => {
    if (copyTo.trim() && !isEmail(copyTo)) {
      setCopyError('Diese E-Mail-Adresse klappt nicht. Prüfe sie bitte noch mal.');
      return;
    }
    setBusy(true);
    setError(undefined);
    const result = await signInOrUpWithHandle(handle, password, copyTo);
    if (result.error) {
      setBusy(false);
      setError(result.error);
      return;
    }
    if (result.created && copyTo.trim() && !result.copySent) {
      Alert.alert('Keine Kopie verschickt', 'Die Mail ging nicht raus. Notiere Dir Deckname und Passwort bitte selbst.');
    }
    dispatch({ type: 'updateProfile', patch: { handle: handle.trim(), email: '' } });
    const { data } = await supabase.auth.getUser();
    const stored = data.user ? await loadOwnProfile(data.user.id).catch(() => null) : null;
    setBusy(false);
    if (stored?.onboarded) {
      const target = await homeAfterOnboarding();
      router.dismissAll();
      router.replace(target);
      return;
    }
    router.push('/onboarding/handle');
  };

  return (
    <SubScreen title="Ohne E-Mail" subtitle="Schritt 1 von 5" navigation="back" onLeadingPress={goBack}>
      <KaterBubble>
        Geht auch ohne Flaschenpost. Merk Dir Deckname und Passwort gut, ohne E-Mail kann ich Dir kein neues schicken.
      </KaterBubble>
      <View style={styles.fields}>
        <TextField
          label="Deckname"
          required
          helperText="Öffentlich sichtbar. Damit meldest Du Dich an."
          value={handle}
          onChangeText={(v) => {
            setHandle(v);
            setError(undefined);
          }}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          autoFocus
        />
        <TextField
          label="Passwort"
          required
          nudge={pwField}
          helperText={t('Neu hier? Dann legst Du es jetzt fest, mindestens {MIN_PASSWORD} Zeichen.', { MIN_PASSWORD })}
          error={error}
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setError(undefined);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={() => valid && !busy && submit()}
        />
        <TextField
          label="Kopie an E-Mail"
          helperText="Freiwillig. Wir schicken Dir Deckname und Passwort einmal zu und speichern die Adresse nicht."
          error={copyError}
          value={copyTo}
          onChangeText={(v) => {
            setCopyTo(v);
            setCopyError(undefined);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          onSubmitEditing={() => valid && !busy && submit()}
        />
        <Button
          busy={busy}
          label={busy ? 'Wird geprüft …' : 'Weiter'}
          onPress={submit}
          disabled={!valid || busy}
          whyDisabled={() => !busy && pwField.nudge('Gib Deckname und Passwort ein.')}
        />
        <Button label="Doch mit E-Mail" variant="ghost" onPress={goBack} disabled={busy} />
      </View>
      <LegalLinks />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: space[8] },
});
