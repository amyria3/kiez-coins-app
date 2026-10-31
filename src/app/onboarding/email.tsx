import { useRef, useState } from 'react';
import { Alert, Animated, Easing, StyleSheet, View } from 'react-native';
import { Text } from '../../components/T';
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
import { color, motion, space, text } from '../../theme/tokens';
import { useAppDimensions } from '../../theme/layout';
import { useNudge } from '../../components/Nudge';
import { t } from '../../data/texts';
import { homeAfterOnboarding } from '../../data/pendingInvite';
import { useGoBack } from '../../lib/goBack';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
/** Supabase verschickt je nach Projekteinstellung 6 bis 8 Ziffern (Standard: 6). */
const MIN_DIGITS = 6;
const MAX_DIGITS = 8;
/** Abstand über der E-Mail, solange beide Wege zur Wahl stehen. Danach rutscht die E-Mail hoch. */
const LIFT = space[32];

type Mode = 'choose' | 'code' | 'password';

/**
 * Route `onboarding/email`. Figma: `onboarding/email`.
 * Ein Weg für neue und bekannte Konten (Daria, 24.10.2026). Zuerst die E-Mail, darunter „Code per Mail“
 * und „Mit Passwort anmelden“. Nach der Wahl gleiten die Buttons zur Seite, die E-Mail rutscht hoch, und
 * darunter erscheint das Feld für den Code oder das Passwort. Das Passwortfeld erscheint auch ohne E-Mail.
 * Beim Passwort prüft die App: Konto mit diesem Passwort → anmelden, kein Konto → anlegen.
 * Code-Versand über Brevo als registration.noreply@kiezcoins.de.
 * Danach: bekanntes Konto mit fertigem Onboarding direkt in den Feed, sonst weiter zum Deckname.
 */
export default function Email() {
  const router = useRouter();
  const goBack = useGoBack();
  const { width } = useAppDimensions();
  const { profile, dispatch } = useStore();
  const { signInOrUpWithPassword, sendCode, verifyCode } = useAuth();
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
    const show = () => {
      setMode(next);
      setError(undefined);
      reveal.setValue(0);
      Animated.spring(reveal, { toValue: 1, useNativeDriver: false, ...motion.barrierSpring }).start();
    };
    // Von Code zu Passwort (oder zurück): Die Wahl ist schon weggeglitten. Gleich das neue Feld zeigen
    // (Daria, 23.10.2026: „Doch mit Passwort“ zeigte in Safari nichts).
    if (mode !== 'choose') {
      show();
      return;
    }
    Animated.timing(away, {
      toValue: 1,
      duration: 320,
      easing: Easing.bezier(...motion.barrier.bezier),
      useNativeDriver: false,
    }).start(show);
  };

  const finish = async () => {
    dispatch({ type: 'updateProfile', patch: { email: address } });
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
    router.push('/onboarding/handle');
  };

  const requestCode = async () => {
    if (!emailValid) {
      setEmailError('Diese E-Mail-Adresse klappt nicht. Prüfe sie bitte noch mal.');
      return;
    }
    setBusy(true);
    setEmailError(undefined);
    const failure = await sendCode(address, true);
    setBusy(false);
    if (failure) {
      setEmailError(failure);
      return;
    }
    setCode('');
    switchTo('code');
  };

  const choosePassword = () => {
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
    if (!emailValid) {
      setEmailError('Diese E-Mail-Adresse klappt nicht. Prüfe sie bitte noch mal.');
      return;
    }
    setBusy(true);
    setError(undefined);
    const failure = await signInOrUpWithPassword(address, password);
    if (failure) {
      setBusy(false);
      setError(failure);
      return;
    }
    await finish();
  };

  const resend = async () => {
    const failure = await sendCode(address, true);
    if (failure) setError(failure);
    else Alert.alert('Code neu gesendet', t('Schaue in Dein Postfach: {address}', { address }));
  };

  const passwordValid = password.length > 0;

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
    <SubScreen title="Anmelden" subtitle="Schritt 1 von 5" navigation="back" onLeadingPress={goBack}>
      <KaterBubble>
        Zuerst Deine E-Mail-Adresse. Du bekommst einen Code und legst Dein Passwort fest.
      </KaterBubble>
      <Animated.View style={{ height: lift }} />
      <TextField
        label="E-Mail" required
        error={emailError}
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setEmailError(undefined);
          // Neue Adresse: Der alte Code gilt nicht mehr. Das Passwortfeld bleibt stehen.
          if (mode === 'code') switchTo('choose');
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        autoFocus
        onSubmitEditing={() => {
          if (busy) return;
          if (mode === 'choose') requestCode();
          else if (mode === 'password' && passwordValid) submitPassword();
        }}
      />

      {mode === 'choose' ? (
        <View style={styles.choices}>
          <Animated.View style={out(-1)}>
            <Button busy={busy}
              label={busy ? 'Wird gesendet …' : 'Code per Mail'}
              onPress={requestCode}
              disabled={busy}
            />
          </Animated.View>
          <Animated.View style={out(1)}>
            <Button
              label="Mit Passwort anmelden"
              variant="secondary"
              onPress={choosePassword}
              disabled={busy}
            />
          </Animated.View>
          {/* Konto mit Deckname und Passwort, ohne gespeicherte E-Mail (Daria, 27.10.2026) */}
          <Animated.View style={out(-1)}>
            <Button
              label="Ich möchte meine E-Mail nicht teilen"
              variant="ghost"
              onPress={() => router.push('/onboarding/no-email')}
              disabled={busy}
            />
          </Animated.View>
        </View>
      ) : null}

      {mode === 'code' ? (
        <Animated.View style={[styles.choices, enter]}>
          <Text style={styles.note}>Der Code ist unterwegs! Schaue in Dein Postfach.</Text>
          <TextField
            label="Code aus der E-Mail" required
        nudge={codeField}
            helperText={t('Gesendet an {email}. Gilt 5 Minuten.', { email: address })}
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
          <Button busy={busy}
            label={busy ? 'Wird geprüft …' : 'Bestätigen'}
            onPress={confirmCode}
            disabled={digits.length < MIN_DIGITS || busy}
            whyDisabled={() => !busy && codeField.nudge(t('Der Code hat {MIN_DIGITS} Ziffern.', { MIN_DIGITS }))}
          />
          <Button label="Neuen Code schicken" variant="ghost" onPress={resend} disabled={busy} />
          <Button
            label="Doch mit Passwort"
            variant="ghost"
            onPress={() => switchTo('password')}
            disabled={busy}
          />
        </Animated.View>
      ) : null}

      {mode === 'password' ? (
        <Animated.View style={[styles.choices, enter]}>
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
            // Ohne „new-password“: Sonst legt iOS automatisch einen Passwort-Vorschlag über die Tastatur.
            autoComplete="current-password"
            textContentType="password"
            // Ohne E-Mail bleibt der Fokus in der E-Mail.
            autoFocus={emailValid}
            onSubmitEditing={() => passwordValid && !busy && submitPassword()}
          />
          <Button busy={busy}
            label={busy ? 'Wird geprüft …' : 'Weiter'}
            onPress={submitPassword}
            disabled={!passwordValid || busy}
            whyDisabled={() => !busy && pwField.nudge('Gib Dein Passwort ein.')}
          />
          <Button
            label="Passwort vergessen? Code per Mail"
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
