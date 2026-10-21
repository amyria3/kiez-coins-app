import { useRef, useState } from 'react';
import { Alert, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { TextField } from '../../components/Form';
import { LegalLinks } from '../../components/LegalLinks';
import { SubScreen } from '../../components/Screen';
import { useAuth } from '../../data/auth';
import { loadOwnProfile } from '../../data/remote';
import { useStore } from '../../data/store';
import { supabase } from '../../lib/supabase';
import { color, motion, space, text } from '../../theme/tokens';
import { useAppDimensions } from '../../theme/layout';
import { useNudge } from '../../components/Nudge';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const MIN_PASSWORD = 8;
/** Supabase verschickt je nach Projekteinstellung 6 bis 8 Ziffern (Standard: 6). */
const MIN_DIGITS = 6;
const MAX_DIGITS = 8;
/** Abstand über der E-Mail, solange beide Wege zur Wahl stehen. Danach rutscht die E-Mail hoch. */
const LIFT = space[32];

type Mode = 'choose' | 'code' | 'password';

/**
 * Route `onboarding/email`. Figma: `onboarding/email`.
 * Zuerst nur die E-Mail. Darunter „Mit Code registrieren“ (bzw. „Mit Code anmelden“) und als zweite Wahl
 * „Passwort festlegen“ (bzw. „Mit Passwort anmelden“). Nach der Wahl gleiten die Buttons zur Seite,
 * die E-Mail rutscht hoch, und an ihrer Stelle erscheint das Feld für den Code oder das Passwort.
 * Code-Versand über Brevo als registration.noreply@kiezcoins.de.
 * Danach: bekanntes Konto mit fertigem Onboarding direkt in den Feed, sonst weiter zum Deckname.
 */
export default function Email() {
  const router = useRouter();
  const { existing } = useLocalSearchParams<{ existing?: string }>();
  const { width } = useAppDimensions();
  const { profile, dispatch } = useStore();
  const { signUpWithPassword, signInWithPassword, sendCode, verifyCode } = useAuth();
  const [email, setEmail] = useState(profile.email);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<Mode>('choose');
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState<string>();
  const [error, setError] = useState<string>();
  const codeField = useNudge();
  const pwField = useNudge();

  const address = email.trim().toLowerCase();
  const emailValid = isEmail(email);
  const digits = code.replace(/\D/g, '');

  // 0 = Wahl sichtbar, 1 = Buttons zur Seite geglitten, E-Mail oben
  const away = useRef(new Animated.Value(0)).current;
  // 0 = neues Feld unsichtbar, 1 = sichtbar
  const reveal = useRef(new Animated.Value(0)).current;

  const leaving = useRef(false);

  const switchTo = (next: Mode) => {
    if (next === 'choose') {
      if (leaving.current) return;
      leaving.current = true;
      Animated.timing(reveal, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => {
        leaving.current = false;
        setMode('choose');
        setError(undefined);
        Animated.spring(away, { toValue: 0, useNativeDriver: false, ...motion.barrierSpring }).start();
      });
      return;
    }
    Animated.timing(away, {
      toValue: 1,
      duration: 320,
      easing: Easing.bezier(...motion.barrier.bezier),
      useNativeDriver: false,
    }).start(() => {
      setMode(next);
      reveal.setValue(0);
      Animated.spring(reveal, { toValue: 1, useNativeDriver: false, ...motion.barrierSpring }).start();
    });
  };

  const finish = async () => {
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

  const requestCode = async () => {
    if (!emailValid) {
      setEmailError('Diese E-Mail-Adresse klappt nicht. Prüf sie bitte noch mal.');
      return;
    }
    setBusy(true);
    setEmailError(undefined);
    // „Ich hab schon ein Konto“ legt kein neues Konto an.
    const failure = await sendCode(address, !existing);
    setBusy(false);
    if (failure) {
      setEmailError(failure);
      return;
    }
    setCode('');
    switchTo('code');
  };

  const choosePassword = () => {
    if (!emailValid) {
      setEmailError('Diese E-Mail-Adresse klappt nicht. Prüf sie bitte noch mal.');
      return;
    }
    setEmailError(undefined);
    switchTo('password');
  };

  const confirmCode = async () => {
    setBusy(true);
    setError(undefined);
    const failure = await verifyCode(address, digits);
    if (failure) {
      setBusy(false);
      setError(failure);
      return;
    }
    await finish();
  };

  const submitPassword = async () => {
    setBusy(true);
    setError(undefined);
    const failure = existing ? await signInWithPassword(address, password) : await signUpWithPassword(address, password);
    if (failure) {
      setBusy(false);
      setError(failure);
      return;
    }
    await finish();
  };

  const resend = async () => {
    const failure = await sendCode(address, !existing);
    if (failure) setError(failure);
    else Alert.alert('Code neu gesendet', `Schau in Dein Postfach: ${address}`);
  };

  const passwordValid = password.length >= (existing ? 1 : MIN_PASSWORD);

  const lift = away.interpolate({ inputRange: [0, 1], outputRange: [LIFT, 0] });
  const out = (direction: -1 | 1) => ({
    opacity: away.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.3, 0] }),
    transform: [{ translateX: away.interpolate({ inputRange: [0, 1], outputRange: [0, direction * width] }) }],
  });
  const enter = {
    opacity: reveal,
    transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [space[24], 0] }) }],
  };

  return (
    <SubScreen title="Anmelden" subtitle="Schritt 1 von 6" navigation="back" onLeadingPress={() => router.back()}>
      <KaterBubble>
        {existing
          ? 'Willkommen zurück an Bord! Deine Flaschenpost-Adresse, bitte.'
          : 'Erst mal Deine Flaschenpost-Adresse. Dann schick ich Dir einen Code, oder Du legst ein Passwort fest.'}
      </KaterBubble>
      <Animated.View style={{ height: lift }} />
      <TextField
        label="E-Mail"
        error={emailError}
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setEmailError(undefined);
          // Neue Adresse: zurück zur Wahl, der alte Code gilt nicht mehr
          if (mode !== 'choose') switchTo('choose');
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        autoFocus
        onSubmitEditing={() => mode === 'choose' && !busy && requestCode()}
      />

      {mode === 'choose' ? (
        <View style={styles.choices}>
          <Animated.View style={out(-1)}>
            <Button
              label={busy ? 'Wird gesendet …' : existing ? 'Mit Code anmelden' : 'Mit Code registrieren'}
              onPress={requestCode}
              disabled={busy}
            />
          </Animated.View>
          <Animated.View style={out(1)}>
            <Button
              label={existing ? 'Mit Passwort anmelden' : 'Passwort festlegen'}
              variant="secondary"
              onPress={choosePassword}
              disabled={busy}
            />
          </Animated.View>
        </View>
      ) : null}

      {mode === 'code' ? (
        <Animated.View style={[styles.choices, enter]}>
          <Text style={styles.note}>Der Code ist unterwegs an {address}. Schau zur Not auch im Spam-Netz.</Text>
          <TextField
            label="Code aus der E-Mail"
        nudge={codeField}
            helperText="Gilt 20 Minuten."
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
            onSubmitEditing={() => digits.length >= MIN_DIGITS && !busy && confirmCode()}
          />
          <Button
            label={busy ? 'Wird geprüft …' : 'Bestätigen'}
            onPress={confirmCode}
            disabled={digits.length < MIN_DIGITS || busy}
            whyDisabled={() => !busy && codeField.nudge(`Der Code hat ${MIN_DIGITS} Ziffern.`)}
          />
          <Button label="Code neu senden" variant="ghost" onPress={resend} disabled={busy} />
          <Button
            label={existing ? 'Doch mit Passwort' : 'Stattdessen Passwort festlegen'}
            variant="ghost"
            onPress={() => switchTo('password')}
            disabled={busy}
          />
        </Animated.View>
      ) : null}

      {mode === 'password' ? (
        <Animated.View style={[styles.choices, enter]}>
          <TextField
            label={existing ? 'Passwort' : 'Neues Passwort'}
            nudge={pwField}
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
            // Ohne „new-password“: Sonst legt iOS automatisch einen Passwort-Vorschlag über die Tastatur.
            autoComplete="current-password"
            textContentType="password"
            autoFocus
            onSubmitEditing={() => passwordValid && !busy && submitPassword()}
          />
          <Button
            label={busy ? (existing ? 'Wird geprüft …' : 'Wird angelegt …') : existing ? 'Anmelden' : 'Konto anlegen'}
            onPress={submitPassword}
            disabled={!passwordValid || busy}
            whyDisabled={() => !busy && pwField.nudge(existing ? 'Gib Dein Passwort ein.' : `Mindestens ${MIN_PASSWORD} Zeichen.`)}
          />
          <Button
            label={existing ? 'Passwort vergessen? Code per Mail' : 'Stattdessen mit Code'}
            variant="ghost"
            onPress={requestCode}
            disabled={busy}
          />
        </Animated.View>
      ) : null}

      <LegalLinks />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  choices: { gap: space[8] },
  note: { ...text.body, color: color.text.secondary },
});
