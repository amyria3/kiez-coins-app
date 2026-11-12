import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { Explanation, Notice, QuestionHint } from '../../components/Content';
import { CopyField, SwitchRow, TextField } from '../../components/Form';
import { NavigationBar } from '../../components/NavigationBar';
import { SubScreen } from '../../components/Screen';
import { Text } from '../../components/T';
import { useAuth } from '../../data/auth';
import { loadOwnProfile } from '../../data/remote';
import { createShowcase, handleFromShowcase, myShowcases, showcasePublicLink, type Showcase } from '../../data/showcase';
import { useStore } from '../../data/store';
import { t } from '../../data/texts';
import { supabase } from '../../lib/supabase';
import { color, radius, space, text } from '../../theme/tokens';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/**
 * Pfeil zurück: Aus der App (z. B. „Dein Konto › Schaufenster“) zurück dorthin. Wer die Seite direkt über
 * kiezcoins.de/schaufenster öffnet, hat keinen Verlauf; dann bleibt der Pfeil ohne Wirkung wie vorher.
 */
function useBack() {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) router.back();
  };
}

/**
 * Route `schaufenster` (kiezcoins.de/schaufenster, Daria, 2026-11-10): Läden, Vereine und Clubs legen ihr Schaufenster
 * an und pflegen es, ohne den Umweg über die Social App. Dabei entsteht ein normales KiezCoins-Konto; die Seite führt
 * nur nicht durch Deckname, Kiez und Feed. Anmelden wie in der App: Code per E-Mail oder Passwort.
 * Das Schaufenster gehört intern zu einer Gruppe, die beim Anlegen mit entsteht.
 */
export default function ShowcaseHub() {
  const back = useBack();
  const { session } = useAuth();
  const [consented, setConsented] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!session) return setConsented(undefined);
    loadOwnProfile(session.user.id).then(
      (p) => setConsented(!!p?.termsAcceptedAt),
      () => setConsented(false),
    );
  }, [session]);

  // Pfeil zurück in die App, wenn es einen Verlauf gibt (z. B. „Dein Konto › Schaufenster“). Der eigene Kopf
  // ersetzt die NavigationBar, deshalb fehlte der Pfeil bisher ganz (Daria, 2026-11-10).
  // Sobald es ein Schaufenster gibt, ist sein Name der Titel. „Schaufenster“ (nicht „Dein“, es gehört zur Gruppe, Daria, 2026-11-12) steht dann aus der App in Inter in
  // der Kopfzeile neben dem Pfeil, wie auf der Seite des Schaufensters selbst (Daria, 2026-11-11); ohne Verlauf
  // (direkt über kiezcoins.de) klein darüber. Ohne Schaufenster (Anmelden, Zustimmung, Anlegen) bleibt es groß.
  const router = useRouter();
  const makeHeader = (compact: boolean) =>
    compact && router.canGoBack() ? (
      <NavigationBar title="Schaufenster" variant="back" onLeadingPress={back} />
    ) : (
      <View>
        {router.canGoBack() ? <NavigationBar title="" variant="back" onLeadingPress={back} /> : null}
        <View style={compact ? styles.headerCompact : styles.header}>
          <Text style={compact ? styles.kicker : styles.headline}>Schaufenster</Text>
        </View>
      </View>
    );
  const header = makeHeader(false);

  if (!session) return <Login header={header} />;
  if (consented === undefined) {
    return (
      <SubScreen title="Schaufenster" navigation="back" onLeadingPress={back} header={header}>
        <ActivityIndicator color={color.text.secondary} />
      </SubScreen>
    );
  }
  if (!consented) return <Consent header={header} onDone={() => setConsented(true)} />;
  return <Mine header={header} compactHeader={makeHeader(true)} />;
}

// ---------- Anmelden ----------

function Login({ header }: { header: React.ReactNode }) {
  const back = useBack();
  const router = useRouter();
  const { sendCode, verifyCode, signInOrUpWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'email' | 'code' | 'password'>('email');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const address = email.trim().toLowerCase();

  const run = async (action: () => Promise<string | null>, next?: () => void) => {
    setBusy(true);
    setError(undefined);
    const failure = await action();
    setBusy(false);
    if (failure) setError(failure);
    else next?.();
  };

  return (
    <SubScreen
      title="Schaufenster"
      navigation="back"
      onLeadingPress={back}
      header={header}
      actions={
        mode === 'email' ? (
          <Button label="Code per E-Mail" busy={busy} disabled={!isEmail(email)} onPress={() => run(() => sendCode(address, true), () => setMode('code'))} />
        ) : mode === 'code' ? (
          <Button label="Anmelden" busy={busy} disabled={code.replace(/\D/g, '').length < 6} onPress={() => run(() => verifyCode(address, code.replace(/\D/g, '')))} />
        ) : (
          <Button label="Anmelden" busy={busy} disabled={!isEmail(email) || password.length < 8} onPress={() => run(() => signInOrUpWithPassword(address, password))} />
        )
      }
    >
      <Explanation
        question="Was ist ein Schaufenster?"
        answer="Eine kleine Webseite für Deinen Laden, Verein oder Club im Kiez. Kostenlos, mit Posts und Terminen."
      />
      <TextField
        label="E-Mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        placeholder="hallo@kiezblick.de"
      />
      {mode === 'code' ? (
        <TextField label="Code aus der E-Mail" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" maxLength={8} />
      ) : null}
      {mode === 'password' ? (
        <TextField label="Passwort" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" helperText="Mindestens 8 Zeichen. Ohne Konto legt KiezCoins eins an." />
      ) : null}
      {/* Datenschutzhinweis bei der Erhebung (Art. 13 DSGVO): Mit der E-Mail entsteht schon das Konto (Rechtsprüfung 11.11.2026) */}
      <Text style={styles.meta}>Ohne Konto legt KiezCoins beim Anmelden eins an. Wie KiezCoins Deine Daten verarbeitet, steht in der Datenschutzerklärung.</Text>
      <Pressable accessibilityRole="link" onPress={() => router.push('/legal/datenschutz')} hitSlop={8}>
        <Text style={styles.link}>Datenschutz lesen</Text>
      </Pressable>
      {error ? <Notice variant="warning" message={error} /> : null}
      {mode === 'password' ? (
        <Button label="Doch lieber Code per E-Mail" variant="ghost" onPress={() => setMode('email')} />
      ) : (
        <Button label="Mit Passwort anmelden" variant="ghost" onPress={() => setMode('password')} />
      )}
      <QuestionHint
        question="Brauche ich die KiezCoins App?"
        answer="Du musst die App nicht nutzen, weil Du Dein Schaufenster hier pflegen kannst. Du bist hiermit über Google auffindbar."
      />
      <QuestionHint
        question="Ich will die App vielleicht doch nutzen – wie kann ich beitreten?"
        answer="Mit der Registrierung fürs Schaufenster entsteht automatisch ein Account – Deine Persona im Social Network KiezCoins. Du kannst Dich mit denselben Zugangsdaten in der App einloggen und mit anderen Nutzer:innen interagieren."
      />
    </SubScreen>
  );
}

// ---------- Zustimmung ----------

function Consent({ header, onDone }: { header: React.ReactNode; onDone: () => void }) {
  const back = useBack();
  const router = useRouter();
  const { dispatch } = useStore();
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  const [rules, setRules] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  return (
    <SubScreen
      title="Schaufenster"
      navigation="back"
      onLeadingPress={back}
      header={header}
      actions={
        <Button
          label="Zustimmen und weiter"
          disabled={!(age && terms && rules && privacy)}
          onPress={() => {
            const now = new Date().toISOString();
            // Wie im Onboarding (onboarding/code-of-conduct); das Profil speichert die Zeitstempel
            dispatch({ type: 'updateProfile', patch: { ageConfirmedAt: now, termsAcceptedAt: now, privacyAcceptedAt: now } });
            onDone();
          }}
        />
      }
    >
      <Notice message="Noch das Kleingedruckte." />
      <SwitchRow required label="Ich bin mindestens 18 Jahre alt" value={age} onValueChange={setAge} />
      <SwitchRow
        required
        label="Ich akzeptiere die Nutzungsbedingungen für die Testphase"
        description="Bedingungen lesen"
        onDescriptionPress={() => router.push('/legal/bedingungen')}
        value={terms}
        onValueChange={setTerms}
      />
      <SwitchRow
        required
        label="Ich halte mich an die Community-Regeln"
        description="Regeln lesen"
        onDescriptionPress={() => router.push('/legal/regeln')}
        value={rules}
        onValueChange={setRules}
      />
      <SwitchRow
        required
        label="Ich habe die Datenschutzerklärung gelesen"
        description="Datenschutz lesen"
        onDescriptionPress={() => router.push('/legal/datenschutz')}
        value={privacy}
        onValueChange={setPrivacy}
      />
    </SubScreen>
  );
}

// ---------- Eigene Schaufenster ----------

function Mine({ header, compactHeader }: { header: React.ReactNode; compactHeader: React.ReactNode }) {
  const back = useBack();
  const router = useRouter();
  const { signOut } = useAuth();
  const { currentUserId, groupApi, dispatch } = useStore();
  const [list, setList] = useState<Showcase[] | undefined>(undefined);
  const [name, setName] = useState('');
  const [kiez, setKiez] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  // Schaufenster, bei dem jemand auf das ausgegraute „Im Web ansehen“ getippt hat
  const [webHint, setWebHint] = useState<string | null>(null);
  // Gruppe aus einem gescheiterten Versuch; ein zweiter Versuch legt keine weitere Gruppe an
  const groupRef = useRef<string | null>(null);

  const reload = useCallback(() => {
    if (currentUserId) myShowcases(currentUserId).then(setList, () => setList([]));
  }, [currentUserId]);
  useFocusEffect(reload);

  const create = async () => {
    setBusy(true);
    setFailed(null);
    try {
      // Deckname = Name des Schaufensters; auch im Store, sonst überschreibt das nächste Speichern des Profils ihn.
      // Zuerst, denn eine Gruppe anlegen geht nur mit Decknamen (create_group: „Leg zuerst Deinen Decknamen fest.“).
      const handle = await handleFromShowcase(currentUserId, name, kiez.trim() || undefined);
      if (!handle) throw new Error(t('Diesen Namen nutzt schon jemand bei KiezCoins. Probier einen anderen, zum Beispiel mit Deinem Kiez dahinter.'));
      dispatch({ type: 'updateProfile', patch: { handle } });
      // Intern gehört jedes Schaufenster zu einer Gruppe; die Person ist ihre Gründer:in
      const groupId = groupRef.current ?? (await groupApi.create(name.trim()));
      groupRef.current = groupId;
      const id = await createShowcase(groupId, name.trim());
      if (kiez.trim()) await supabase.from('showcases').update({ kiez: kiez.trim() }).eq('id', id);
      groupRef.current = null;
      router.push({ pathname: '/schaufenster/[id]/bearbeiten', params: { id, von: 'schaufenster' } });
    } catch (error) {
      setFailed((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Nur wer die Seite direkt über kiezcoins.de/schaufenster öffnet (ohne Verlauf), braucht den Weg in die App und
  // das Abmelden, z. B. am Rechner im Laden. Aus der App heraus hätte „Abmelden“ die ganze App abgemeldet
  // (Daria, 2026-11-12: „Wieso Log Out?“).
  const footer = router.canGoBack() ? null : (
    <View style={styles.footer}>
      <Button label="Zur KiezCoins App" variant="ghost" onPress={() => router.push('/')} />
      <Button label="Abmelden" variant="ghost" onPress={() => signOut()} />
    </View>
  );

  if (list === undefined) {
    return (
      <SubScreen title="Schaufenster" navigation="back" onLeadingPress={back} header={header}>
        <ActivityIndicator color={color.text.secondary} />
      </SubScreen>
    );
  }

  if (!list.length) {
    return (
      <SubScreen
        title="Schaufenster"
        navigation="back"
        onLeadingPress={back}
        header={header}
        actions={<Button label="Schaufenster anlegen" busy={busy} disabled={!name.trim()} onPress={create} />}
      >
        <Notice message="Wie heißt Dein Laden, Verein oder Club?" />
        <TextField label="Name" required value={name} onChangeText={setName} maxLength={40} placeholder="Café Kiezblick" />
        <TextField label="Kiez" value={kiez} onChangeText={setKiez} maxLength={80} placeholder="Connewitz" />
        <Text style={styles.meta}>Bilder, Adresse, Öffnungszeiten und Links ergänzt Du im nächsten Schritt.</Text>
        {failed ? <Notice variant="warning" message={failed} /> : null}
        {footer}
      </SubScreen>
    );
  }

  return (
    <SubScreen title="Schaufenster" navigation="back" onLeadingPress={back} header={compactHeader}>
      {list.map((s) => (
        <View key={s.id} style={styles.showcase}>
          {/* Der Name ist der eigentliche Titel: groß, in der Display-Schrift (Daria, 2026-11-11) */}
          <Text style={[styles.showcaseName, !router.canGoBack() && styles.showcaseNameUnderKicker]} accessibilityRole="header" noTranslate>
            {s.name}
          </Text>
          {/* Luft unter dem Namen und ein Satz der Krabbe, was hier passiert (Daria, 2026-11-12) */}
          <Notice message="Hier pflegst Du Deine Seite. Was Du postest, sehen Leute im Web und in der KiezCoins App." />
          {s.cover ? <Image source={s.cover} style={styles.cover} contentFit="cover" /> : null}
          {s.visibility === 'public' ? <CopyField label="Deine Seite" value={showcasePublicLink(s.slug)} /> : null}
          {!s.switches.online ? <Notice variant="warning" message="Dieses Schaufenster ist offline." /> : null}
          {s.switches.posten ? (
            <>
              <Button label="Post erstellen" icon="plus" onPress={() => router.push({ pathname: '/schaufenster/[id]/post', params: { id: s.id } })} />
              <Button label="Termin erstellen" variant="secondary" onPress={() => router.push({ pathname: '/schaufenster/[id]/termin', params: { id: s.id } })} />
            </>
          ) : null}
          <Button label="Seite bearbeiten" variant="secondary" onPress={() => router.push({ pathname: '/schaufenster/[id]/bearbeiten', params: { id: s.id, von: 'schaufenster' } })} />
          {/* Zwei Ansichten (Daria, 2026-11-12): in der App wie ein KiezCoins-Mitglied, im Web wie jede Besucher:in
              unter kiezcoins.de/s/…. Die Webseite gibt es nur öffentlich und online. */}
          <View style={styles.viewButtons}>
            <Button label="In der App ansehen" variant="secondary" onPress={() => router.push({ pathname: '/schaufenster/[id]', params: { id: s.id } })} />
            <Button
              label="Im Web ansehen"
              variant="secondary"
              disabled={!(s.visibility === 'public' && s.switches.online)}
              whyDisabled={() => setWebHint(s.id)}
              onPress={() => Linking.openURL(showcasePublicLink(s.slug))}
            />
          </View>
          {webHint === s.id ? (
            <Notice
              message={
                s.switches.online
                  ? 'Im Web erscheint Dein Schaufenster erst, wenn es öffentlich ist. Das stellst Du unter „Seite bearbeiten“ ein.'
                  : 'Solange Dein Schaufenster offline ist, gibt es keine Webseite dazu.'
              }
              onClose={() => setWebHint(null)}
            />
          ) : null}
        </View>
      ))}
      {footer}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space[20], paddingTop: space[16], paddingBottom: space[8] },
  headline: { ...text.display, color: color.text.primary },
  headerCompact: { paddingHorizontal: space[16], paddingTop: space[4] },
  kicker: { fontFamily: text.display.fontFamily, fontSize: 15, lineHeight: 20, color: color.text.secondary },
  // Abstände wie auf den anderen Seiten (Inhalt hat gap 16), Daria 2026-11-11
  showcase: { gap: space[16] },
  showcaseName: { ...text.display, color: color.text.primary, marginBottom: space[8] },
  showcaseNameUnderKicker: { marginTop: -space[8] },
  meta: { ...text.caption, color: color.text.secondary },
  link: { ...text.caption, color: color.text.primary, textDecorationLine: 'underline' },
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.xl },
  viewButtons: { gap: space[8] },
  footer: { gap: space[8], marginTop: space[16] },
});
