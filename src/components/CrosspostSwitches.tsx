import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { CHAT_GAP_CHANGE, CHAT_GAP_SAME, ChatReply, Notice, QuestionHint } from './Content';
import { TextField, Toggle } from './Form';
import { Text } from './T';
import {
  connectCrosspost,
  CROSSPOST_PLATFORMS,
  disconnectCrosspost,
  isLivePlatform,
  loadCrosspostAccounts,
  loadCrosspostSelection,
  saveCrosspostSelection,
  useCrosspostInterest,
  type CrosspostAccount,
  tokenOnly,
  type LivePlatform,
} from '../data/crosspost';
import { errorText } from '../data/remote';
import { t } from '../data/texts';
import { color, space, text } from '../theme/tokens';

const HOW_TO: Record<LivePlatform, string> = {
  bluesky:
    '1. In BlueSky: Einstellungen › Datenschutz und Sicherheit › App-Passwörter › App-Passwort hinzufügen. Name zum Beispiel „KiezCoins“.\n' +
    '2. Das angezeigte App-Passwort kopieren (vier Blöcke, z. B. abcd-efgh-ijkl-mnop). Dein normales Passwort brauchst Du hier nicht.\n' +
    '3. Handle und App-Passwort unten eintragen.',
  mastodon:
    '1. In Mastodon: Einstellungen › Entwicklung › Neue Anwendung. Name „KiezCoins“.\n' +
    '2. Bei den Befugnissen nur diese drei anhaken: profile, write:media und write:statuses. Alles andere abwählen, auch read und write.\n' +
    '3. Speichern, die Anwendung öffnen und „Dein Zugangs-Token“ kopieren. Client-Schlüssel und Client-Geheimnis brauchst Du nicht.\n' +
    '4. Hast Du die Befugnisse nachträglich geändert, das Zugangs-Token neu erzeugen.\n' +
    '5. Instanz und Zugangs-Token unten eintragen. Die Instanz ist der Server Deines Kontos: Deine vollständige Adresse steht auf Deinem Profil unter dem Namen, z. B. @kiezkatz@mastodon.social. Die Instanz ist der Teil nach dem zweiten @, also mastodon.social.',
  instagram:
    '1. In Instagram: Einstellungen › Kontotyp › auf Business- oder Creator-Konto umstellen.\n' +
    '2. Auf developers.facebook.com eine App anlegen (Typ Business, Anwendungsfall Instagram-API mit Instagram-Login).\n' +
    '3. In der App unter Rollen Dein Instagram-Konto als Tester eintragen und die Einladung in Instagram annehmen.\n' +
    '4. Im App-Dashboard einen Zugangs-Token erzeugen, mit dem Recht instagram_business_content_publish, und unten eintragen.\n' +
    'Instagram nimmt nur Posts mit Foto. Der Link steht als Text in der Bildunterschrift.',
  facebook:
    'Facebook erlaubt das Weiterposten nur auf eine Seite, nicht auf Dein privates Profil.\n' +
    '1. Lege eine Facebook-Seite an, falls Du noch keine hast (Facebook › Seiten › Neue Seite).\n' +
    '2. Auf developers.facebook.com eine App anlegen (Typ Business).\n' +
    '3. Im Graph API Explorer diese App wählen, bei „Benutzer oder Seite“ Deine Seite auswählen und die Rechte pages_manage_posts und pages_read_engagement anhaken.\n' +
    '4. „Generate Access Token“ antippen, bestätigen und den Seiten-Zugangs-Token unten eintragen.\n' +
    'Mit Foto erscheint der Post als Foto, ohne Foto als Text mit Link.',
};

/**
 * Erste Nachricht der Einrichtung: wie viele Schritte und was vorausgesetzt ist, dann die Frage (Daria, 2026-11-09).
 * Erst nach „Ja, los!“ folgen die Schritte und die Felder.
 */
const INTRO: Record<LivePlatform, string> = {
  bluesky: 'Die Einrichtung umfasst 3 Schritte und setzt voraus, dass Du in BlueSky angemeldet bist. Möchtest Du jetzt loslegen?',
  mastodon: 'Die Einrichtung umfasst 5 Schritte und setzt voraus, dass Du in Mastodon angemeldet bist. Möchtest Du jetzt loslegen?',
  instagram:
    'Die Einrichtung umfasst 4 Schritte und setzt voraus, dass Du in Instagram angemeldet bist und ein Konto bei Meta for Developers hast. Möchtest Du jetzt loslegen?',
  facebook:
    'Die Einrichtung umfasst 4 Schritte und setzt voraus, dass Du in Facebook angemeldet bist und ein Konto bei Meta for Developers hast. Möchtest Du jetzt loslegen?',
};

/**
 * Weiterposten unter Dein Konto › Funktionen (Daria, 2026-11-09): je Plattform ein Schalter. An öffnet darunter die
 * Einrichtung, die Schritte stehen als Systemnachrichten, darunter die Felder. Bei einem verbundenen Konto schaltet der
 * Schalter nur das Weiterposten an und aus, das Konto bleibt verbunden; „Trennen“ steht daneben (Daria, 2026-11-09).
 * BlueSky mit Handle und App-Passwort, Mastodon mit Instanz und Zugangs-Token, Instagram mit Zugangs-Token,
 * Facebook mit dem Zugangs-Token einer Seite. X kommt später.
 */
export function CrosspostSwitches() {
  const [accounts, setAccounts] = useState<CrosspostAccount[]>([]);
  const [counted, count] = useCrosspostInterest();
  // Plattformen, auf die weitergepostet wird; dieselbe Wahl wie beim Erstellen eines Posts
  const [selected, setSelected] = useState<LivePlatform[]>([]);

  const reload = useCallback(() => {
    loadCrosspostAccounts().then(setAccounts);
    loadCrosspostSelection().then(setSelected);
  }, []);
  useEffect(reload, [reload]);
  const enable = (platform: LivePlatform, on: boolean) => {
    const next = on ? [...selected.filter((p) => p !== platform), platform] : selected.filter((p) => p !== platform);
    setSelected(next);
    saveCrosspostSelection(next);
  };

  return (
    <View style={styles.list}>
      <QuestionHint question="Was wird weitergepostet?" answer="Weiterposten teilt Deine öffentlichen Posts mit Foto und Link zu KiezCoins. Private Posts und Gruppen bleiben immer in der App." />
      {CROSSPOST_PLATFORMS.filter((p) => isLivePlatform(p.key)).map((p) => (
        <PlatformSwitch
          key={p.key}
          platform={p.key as LivePlatform}
          label={p.label}
          account={accounts.find((a) => a.platform === p.key)}
          enabled={selected.includes(p.key as LivePlatform)}
          onEnable={(on) => enable(p.key as LivePlatform, on)}
          onChange={reload}
        />
      ))}
      <View style={styles.row}>
        <View style={styles.texts}>
          <Text noTranslate style={styles.label}>X</Text>
          <Text style={styles.caption}>Kommt bald</Text>
        </View>
      </View>
      {counted ? (
        <Text style={styles.thanks}>Danke! Wir zählen Dich mit.</Text>
      ) : (
        <Button label="Ich würde diese Funktion für X nutzen" variant="secondary" onPress={count} />
      )}
    </View>
  );
}

function PlatformSwitch({
  platform,
  label,
  account,
  enabled,
  onEnable,
  onChange,
}: {
  platform: LivePlatform;
  label: string;
  account?: CrosspostAccount;
  /** Weiterposten auf diese Plattform an */
  enabled: boolean;
  onEnable: (on: boolean) => void;
  onChange: () => void;
}) {
  const [setup, setSetup] = useState(false);
  // Wie viele Schritte schon zu sehen sind; 0: noch nicht losgelegt
  const [shown, setShown] = useState(0);
  const [first, setFirst] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const connect = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await connectCrosspost(
        platform,
        platform === 'bluesky'
          ? { handle: first, password: secret }
          : platform === 'mastodon'
            ? { instance: first.trim().replace(/^.*@/, ''), token: secret }
            : { token: secret },
      );
      setFirst('');
      setSecret('');
      setSetup(false);
      // Frisch verbunden: Weiterposten gleich an
      onEnable(true);
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () =>
    Alert.alert(t('{label} trennen?', { label }), 'Deine bisherigen Weiterposts bleiben dort stehen.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Trennen',
        style: 'destructive',
        onPress: () =>
          disconnectCrosspost(platform)
            .then(onChange)
            .catch((e) => Alert.alert('Hat nicht geklappt', errorText(e))),
      },
    ]);

  // Erst übersetzen, dann in Nachrichten teilen: Übersetzt ist die ganze Anleitung
  const lines = t(HOW_TO[platform]).split('\n');
  // Hinweise ohne Nummer klären den Umfang und stehen deshalb am Anfang, vor der Frage (Daria, 2026-11-09).
  // Jeder nummerierte Schritt ist eine eigene Nachricht.
  const isStep = (line: string) => /^\d+\./.test(line);
  const scope = lines.filter((line) => !isStep(line));
  const steps = lines.filter(isStep).map((line) => [line]);
  const started = shown > 0;
  const done = shown >= steps.length;
  const on = account ? enabled : setup;

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.texts}>
          <Text noTranslate style={styles.label}>{label}</Text>
          {account ? (
            <View style={styles.connected}>
              <Text noTranslate selectable style={styles.caption}>
                {account.handle}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t('{label} trennen', { label })} onPress={disconnect} hitSlop={8}>
                <Text style={styles.disconnect}>Trennen</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
        <Toggle
          label={label}
          value={on}
          onValueChange={(v) => (account ? onEnable(v) : v ? setSetup(true) : (setSetup(false), setShown(0)))}
        />
      </View>
      {on && !account ? (
        <View style={styles.setup}>
          {/* Wie im Chat: erst was weitergepostet wird, dann Umfang und Voraussetzungen mit Frage, dann „Ja, los!“,
              dann die Schritte */}
          <View style={styles.steps}>
            {scope.map((line) => (
              <Notice key={line} message={line} />
            ))}
            <Notice message={INTRO[platform]} />
          </View>
          <View style={styles.reply}>
            <ChatReply label="Ja, los!" sent={started} onPress={() => setShown(1)} />
          </View>
          {started ? (
            <>
          {/* Schritt für Schritt: nach jedem Schritt „Verstanden, weiter“, erst nach dem letzten die Felder (Daria, 2026-11-09) */}
          {steps.slice(0, shown).map((group, i) => (
            <View key={group.join()} style={styles.afterReply}>
              <View style={styles.steps}>
                {group.map((line) => (
                  <Notice key={line} message={line} />
                ))}
              </View>
              {i < steps.length - 1 ? (
                <View style={styles.replyInGroup}>
                  <ChatReply label="Verstanden, weiter" sent={i < shown - 1} onPress={() => setShown(i + 2)} />
                </View>
              ) : null}
            </View>
          ))}
          {done ? (
            <>
        {tokenOnly(platform) ? null : (
        <TextField
          label={platform === 'bluesky' ? 'Handle' : 'Instanz'}
          placeholder={platform === 'bluesky' ? 'name.bsky.social' : 'mastodon.social'}
          value={first}
          onChangeText={setFirst}
          helperText={
            platform === 'bluesky'
              ? 'Steht in BlueSky auf Deinem Profil unter dem Namen. Ohne @, z. B. kiezkatz.bsky.social'
              : 'Teil Deiner Adresse nach dem zweiten @, ohne https://, z. B. mastodon.social'
          }
          autoCapitalize="none"
          autoCorrect={false}
        />
        )}
        <TextField
          label={platform === 'bluesky' ? 'App-Passwort' : 'Zugangs-Token'}
          helperText={
            platform === 'bluesky'
              ? 'Nicht Dein normales Passwort'
              : platform === 'mastodon'
                ? '„Dein Zugangs-Token“ aus der Anwendung'
                : platform === 'instagram'
                  ? 'Aus dem App-Dashboard bei Meta for Developers'
                  : 'Seiten-Zugangs-Token aus dem Graph API Explorer'
          }
          value={secret}
          onChangeText={setSecret}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          error={error}
        />
        <Button
          busy={busy}
          label={busy ? 'Wird geprüft …' : 'Verbinden'}
          onPress={connect}
          disabled={busy || (!tokenOnly(platform) && !first.trim()) || !secret.trim()}
        />
            </>
          ) : null}
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[8] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[4] },
  texts: { flex: 1, gap: space[2] },
  label: { ...text.body, color: color.text.primary },
  caption: { ...text.caption, color: color.text.secondary },
  connected: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  disconnect: { ...text.caption, color: color.text.secondary, textDecorationLine: 'underline' },
  setup: { gap: space[12], paddingTop: space[8], paddingBottom: space[16] },
  steps: { gap: CHAT_GAP_SAME },
  // Die Einrichtung hat 12 Abstand; Wechsel zwischen App und eigener Antwort wie im Chat
  reply: { marginTop: CHAT_GAP_CHANGE - space[12] },
  afterReply: { marginTop: CHAT_GAP_CHANGE - space[12] },
  replyInGroup: { marginTop: CHAT_GAP_CHANGE },
  thanks: { ...text.body, color: color.accent.confirmation, textAlign: 'center' },
});
