import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Button } from './Button';
import { AskedQuestion, CHAT_GAP_CHANGE, CHAT_GAP_SAME, ChatReply, Notice, QuestionHint } from './Content';
import { SwitchRow, TextField, Toggle } from './Form';
import { Text } from './T';
import {
  connectCrosspost,
  CROSSPOST_PLATFORMS,
  disconnectCrosspost,
  expiresSoon,
  isLivePlatform,
  loadCrosspostAccounts,
  loadCrosspostSelection,
  loadTelegramChats,
  removeTelegramChat,
  saveCrosspostSelection,
  startLinkedin,
  startTelegram,
  type TelegramChat,
  useCrosspostInterest,
  type CrosspostAccount,
  tokenOnly,
  type LivePlatform,
  viaLogin,
} from '../data/crosspost';
import { FULL_CROSSPOST_LOOK, loadCrosspostLook, saveCrosspostLook, type CrosspostLook } from '../data/crosspostLook';
import { useFeature } from '../data/unlock';
import { errorText } from '../data/remote';
import { t } from '../data/texts';
import { color, radius, space, stroke, text } from '../theme/tokens';
import { useAccentColor } from '../theme/signal';

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
    '5. Instanz und Zugangs-Token unten eintragen. Die Instanz ist der Teil Deiner Adresse nach dem zweiten @: Aus @kiezkatz@mastodon.social wird mastodon.social. Die Adresse steht auf Deinem Profil unter dem Namen.',
  instagram:
    '1. In Instagram: Einstellungen › Kontotyp › auf Business- oder Creator-Konto umstellen.\n' +
    '2. Auf developers.facebook.com eine App anlegen (Typ Business, Anwendungsfall Instagram-API mit Instagram-Login).\n' +
    '3. In der App unter Rollen Dein Instagram-Konto als Tester eintragen und die Einladung in Instagram annehmen.\n' +
    '4. Im App-Dashboard einen Zugangs-Token erzeugen, mit dem Recht instagram_business_content_publish, und unten eintragen.\n' +
    'Instagram nimmt nur Posts mit Foto. Der Link steht als Text in der Bildunterschrift.',
  facebook:
    'Facebook erlaubt das Weiterposten nur auf eine Seite, nicht auf Dein privates Profil.\n' +
    '1. Eine Facebook-Seite anlegen oder eine vorhandene nutzen (Facebook › Seiten › Neue Seite).\n' +
    '2. Auf developers.facebook.com eine App anlegen (Typ Business).\n' +
    '3. Im Graph API Explorer diese App wählen, bei „Benutzer oder Seite“ Deine Seite auswählen und die Rechte pages_manage_posts und pages_read_engagement anhaken.\n' +
    '4. „Generate Access Token“ antippen, bestätigen und den Seiten-Zugangs-Token unten eintragen.\n' +
    'Mit Foto erscheint der Post als Foto, ohne Foto als Text mit Link.',
  linkedin:
    'KiezCoins postet auf Dein persönliches LinkedIn-Profil, nicht auf eine Unternehmensseite.\n' +
    'Die Verbindung hält 60 Tage. Danach meldest Du Dich mit zwei Tipps neu an.\n' +
    '1. Unten auf „Mit LinkedIn verbinden“ tippen.\n' +
    '2. Bei LinkedIn anmelden und „Zulassen“ tippen. LinkedIn bringt Dich zurück zu KiezCoins.',
  telegram:
    'KiezCoins schickt jeden Post, den Du weiterpostest, fertig mit Foto, Text und Link in Deinen Chat mit dem KiezCoins-Bot. Von dort leitest Du ihn in Deine Gruppen weiter, auch in mehrere auf einmal.\n' +
    'Nimmst Du den Bot in Deinen Kanal auf, postet KiezCoins dort direkt mit.\n' +
    '1. Unten auf „Mit Telegram verbinden“ tippen. Telegram öffnet den Chat mit dem KiezCoins-Bot.\n' +
    '2. In Telegram „Starten“ tippen und zurück zu KiezCoins wechseln. KiezCoins merkt die Verbindung von selbst.',
};

/**
 * Erste Nachricht der Einrichtung: wie viele Schritte und was vorausgesetzt ist, dann die Frage (Daria, 2026-11-09).
 * Erst nach „Ja, los!“ folgen die Schritte und die Felder.
 */
const INTRO: Record<LivePlatform, string> = {
  bluesky: 'Das Verbinden hat 3 Schritte. Du brauchst dafür Dein BlueSky-Konto. Möchtest Du jetzt loslegen?',
  mastodon: 'Das Verbinden hat 5 Schritte. Du brauchst dafür Dein Mastodon-Konto. Möchtest Du jetzt loslegen?',
  instagram:
    'Das Verbinden hat 4 Schritte. Du brauchst dafür Dein Instagram-Konto und ein Konto bei Meta for Developers. Möchtest Du jetzt loslegen?',
  facebook:
    'Das Verbinden hat 4 Schritte. Du brauchst dafür Dein Facebook-Konto und ein Konto bei Meta for Developers. Möchtest Du jetzt loslegen?',
  linkedin: 'Das Verbinden hat 2 Schritte. Du brauchst dafür Dein LinkedIn-Konto. Möchtest Du jetzt loslegen?',
  telegram: 'Das Verbinden hat 2 Schritte. Du brauchst dafür Telegram auf diesem Gerät oder am Computer. Möchtest Du jetzt loslegen?',
};

/** Nach dem Öffnen von Telegram: alle 3 Sekunden nachsehen, ob „Starten“ getippt ist, höchstens 10 Minuten (Gültigkeit des Codes) */
const TELEGRAM_POLL_MS = 3000;
const TELEGRAM_POLL_MAX = 200;

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

  // Mit oder ohne Rahmen, mit oder ohne Logo (Daria, 13.11.2026). Gilt seit 15.11.2026 auch fürs Teilen (ShareDialog). Zwei Funktionen (`weiterposten_rahmen`,
  // `weiterposten_ohne_logo`), im Moment für alle an. Die Edge Function prüft beides noch einmal.
  const canFrame = useFeature('weiterposten_rahmen');
  const canRemoveLogo = useFeature('weiterposten_ohne_logo');
  const [look, setLook] = useState<CrosspostLook>(FULL_CROSSPOST_LOOK);
  const changeLook = (next: CrosspostLook) => {
    setLook(next);
    saveCrosspostLook(next);
  };

  const reload = useCallback(() => {
    loadCrosspostAccounts().then(setAccounts);
    loadCrosspostSelection().then(setSelected);
    loadCrosspostLook().then(setLook);
  }, []);
  useEffect(reload, [reload]);
  // Rückkehr von der Anmeldung bei LinkedIn: ?linkedin=ok oder fehler (Daria, 2026-11-28)
  const { linkedin } = useLocalSearchParams<{ linkedin?: string }>();
  useEffect(() => {
    if (linkedin === 'ok') {
      // Frisch verbunden: Weiterposten gleich an, zur gespeicherten Auswahl dazu
      loadCrosspostAccounts().then(setAccounts);
      loadCrosspostSelection().then((saved) => {
        const next: LivePlatform[] = [...saved.filter((p) => p !== 'linkedin'), 'linkedin'];
        setSelected(next);
        saveCrosspostSelection(next);
      });
    } else if (linkedin === 'fehler') {
      Alert.alert(t('LinkedIn verbinden hat nicht geklappt'), t('Versuche es bitte noch mal.'));
    }
  }, [linkedin]);
  const enable = (platform: LivePlatform, on: boolean) => {
    const next = on ? [...selected.filter((p) => p !== platform), platform] : selected.filter((p) => p !== platform);
    setSelected(next);
    saveCrosspostSelection(next);
  };

  return (
    <View style={styles.list}>
      <QuestionHint question="Was postet KiezCoins für mich weiter?" answer="Deine öffentlichen Posts, mit Foto und einem Link zu KiezCoins. Private Posts und Posts in Gruppen bleiben in der App." />
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
      {canFrame ? (
        <View style={styles.look}>
          <SwitchRow
            label="Mit Rahmen und Namen"
            description="Weißer Rand mit Deinem Namen. Gilt auch, wenn Du ein Bild teilst."
            value={look.frame}
            onValueChange={(frame) => changeLook({ ...look, frame })}
          />
          {look.frame && canRemoveLogo ? (
            <SwitchRow
              label="KiezCoins-Logo im Rahmen"
              description="Kater und KiezCoins unten im Rahmen"
              value={look.watermark}
              onValueChange={(watermark) => changeLook({ ...look, watermark })}
            />
          ) : null}
        </View>
      ) : null}
      <View style={styles.row}>
        <View style={styles.texts}>
          <Text noTranslate style={styles.label}>X</Text>
          <Text style={styles.caption}>Kommt bald</Text>
        </View>
      </View>
      {counted ? (
        <Text style={styles.thanks}>Du hast abgestimmt, dass Du die API für X-Konten nutzen möchtest. Danke! Wir zählen Dich mit.</Text>
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
  // Einstellungen offen: verbunden mit grünem Punkt und Trennen, sonst die Einrichtung (Daria, 2026-11-09)
  const [open, setOpen] = useState(false);
  // Verbundenes Konto neu verbinden: dieselbe Einrichtung, das neue Konto ersetzt das alte
  const [reconnect, setReconnect] = useState(false);
  // Akzent des Themes (Daria, 2026-11-14)
  const accent = useAccentColor();
  // Wie viele Schritte schon zu sehen sind; 0: noch nicht losgelegt
  const [shown, setShown] = useState(0);
  const [first, setFirst] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  // Telegram ist offen, KiezCoins wartet auf „Starten“ (Daria, 2026-11-28)
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    if (!waiting) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (tries > TELEGRAM_POLL_MAX) {
        setWaiting(false);
        return;
      }
      loadCrosspostAccounts().then((list) => {
        if (!list.some((a) => a.platform === platform)) return;
        setWaiting(false);
        setOpen(false);
        setReconnect(false);
        // Frisch verbunden: Weiterposten gleich an
        onEnable(true);
        onChange();
      });
    }, TELEGRAM_POLL_MS);
    return () => clearInterval(timer);
    // onEnable und onChange wechseln bei jedem Zeichnen; entscheidend ist nur das Warten
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, platform]);

  const connect = async () => {
    setBusy(true);
    setError(undefined);
    try {
      if (platform === 'telegram') {
        // Weiter geht es nach „Starten“ in Telegram; beim Neu-Verbinden ersetzt der neue Chat den alten
        await startTelegram();
        setWaiting(true);
        return;
      }
      if (viaLogin(platform)) {
        // Weiter geht es nach der Rückkehr von LinkedIn (?linkedin=ok)
        await startLinkedin();
        return;
      }
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
      setOpen(false);
      setReconnect(false);
      // Frisch verbunden: Weiterposten gleich an
      onEnable(true);
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Ein Knopf für beides: Neu verbinden öffnet die Einrichtung, Trennen löscht die Verbindung (Daria, 2026-11-09)
  const manage = () =>
    Alert.alert(t('{label} trennen oder neu verbinden?', { label }), 'Deine bisherigen Weiterposts bleiben dort stehen.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Neu verbinden', onPress: () => (setReconnect(true), setShown(0)) },
      {
        text: 'Trennen',
        style: 'destructive',
        onPress: () =>
          disconnectCrosspost(platform)
            .then(() => {
              setOpen(false);
              onChange();
            })
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
  // Die Einrichtung im Chat wartet erst auf den Tipp auf die Frage (Daria, 2026-11-11); geschlossen beginnt sie neu
  const setupOpen = open && (!account || reconnect);
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    if (!setupOpen) setAsked(false);
  }, [setupOpen]);
  const done = shown >= steps.length;
  const on = account ? enabled : open;

  return (
    <View>
      <View style={styles.row}>
        {/* Ein Tipp auf den Namen öffnet die Einstellungen; der Schalter schaltet nur das Weiterposten (Daria, 2026-11-09) */}
        <Pressable
          style={({ pressed }) => [styles.texts, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={t('{label}: Einstellungen', { label })}
          onPress={() => (open ? (setOpen(false), setShown(0), setReconnect(false)) : setOpen(true))}
        >
          <Text noTranslate style={styles.label}>{label}</Text>
          {account ? (
            <Text noTranslate style={styles.caption}>
              {account.handle}
            </Text>
          ) : null}
          {account && expiresSoon(account) ? <Text style={styles.caption}>Läuft bald ab. Bitte neu verbinden.</Text> : null}
        </Pressable>
        <Toggle
          label={label}
          value={on}
          onValueChange={(v) => (account ? onEnable(v) : v ? setOpen(true) : (setOpen(false), setShown(0)))}
        />
      </View>
      {account && open ? (
        // Status mit grünem Punkt, daneben ein Knopf für Trennen oder neu verbinden (Daria, 2026-11-09).
        // Ist die Einrichtung zum Neu-Verbinden offen, ist er lila und schließt sie wieder.
        <View style={[styles.setup, styles.connected]}>
          <View style={styles.dot} />
          <Text style={[styles.connectedText, styles.flex]}>Verbunden</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => (reconnect ? (setReconnect(false), setShown(0)) : manage())}
            style={({ pressed }) => [styles.chip, reconnect && { backgroundColor: accent, borderColor: accent }, pressed && styles.pressed]}
          >
            <Text style={[styles.chipText, reconnect && styles.chipTextOn]}>Trennen oder neu verbinden</Text>
          </Pressable>
        </View>
      ) : null}
      {account && open && platform === 'telegram' && !reconnect ? <TelegramChats /> : null}
      {setupOpen ? (
        <View style={styles.setup}>
          {/* Wie im Chat: erst was weitergepostet wird, dann Umfang und Voraussetzungen mit Frage, dann „Ja, los!“,
              dann die Schritte. Davor die Frage, denn jede Erklärung beginnt mit einer Frage (Daria, 2026-11-11) */}
          <AskedQuestion question={t('Wie verbinde ich {label}?', { label })} asked={asked} onAsk={() => setAsked(true)} />
          {asked ? (
            <>
              <View style={styles.steps}>
                {scope.map((line) => (
                  <Notice key={line} message={line} />
                ))}
                <Notice message={INTRO[platform]} />
              </View>
              <View style={styles.reply}>
                <ChatReply label="Ja, los!" sent={started} onPress={() => setShown(1)} />
              </View>
            </>
          ) : null}
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
          {done && viaLogin(platform) ? (
            <>
              {error ? <Notice message={error} /> : null}
              {waiting ? <Notice message="KiezCoins wartet auf „Starten“ in Telegram." /> : null}
              <Button
                busy={busy}
                label={waiting ? t('{label} noch mal öffnen', { label }) : t('Mit {label} verbinden', { label })}
                onPress={connect}
                disabled={busy}
              />
            </>
          ) : done ? (
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

/**
 * Telegram verbunden (Daria, 2026-11-28): Kanäle und Gruppen, in die KiezCoins direkt mitpostet, je mit „Entfernen“.
 * Darunter, wie ein Kanal dazukommt und wie das Weiterleiten in Gruppen ohne Bots geht.
 */
function TelegramChats() {
  const [state, setState] = useState<{ bot: string; chats: TelegramChat[] }>();
  useEffect(() => {
    loadTelegramChats().then(setState);
  }, []);
  const bot = state?.bot ? `@${state.bot}` : t('den KiezCoins-Bot');
  const remove = (chat: TelegramChat) =>
    Alert.alert(t('Nicht mehr in „{title}“ posten?', { title: chat.title }), t('Der KiezCoins-Bot verlässt den Kanal oder die Gruppe.'), [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Entfernen',
        style: 'destructive',
        onPress: () =>
          removeTelegramChat(chat.chat_id)
            .then((chats) => setState((s) => ({ bot: s?.bot ?? '', chats })))
            .catch((e) => Alert.alert('Hat nicht geklappt', errorText(e))),
      },
    ]);
  return (
    <View style={styles.setup}>
      {state?.chats.length ? (
        <>
          <Text style={styles.caption}>KiezCoins postet direkt mit in</Text>
          {state.chats.map((chat) => (
            <View key={chat.chat_id} style={styles.connected}>
              <Text noTranslate style={[styles.connectedText, styles.flex]}>
                {chat.title || (chat.username ? `@${chat.username}` : 'Telegram')}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => remove(chat)} style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
                <Text style={styles.chipText}>Entfernen</Text>
              </Pressable>
            </View>
          ))}
        </>
      ) : null}
      <QuestionHint
        question="Wie postet KiezCoins direkt in meinen Kanal?"
        answer={t(
          'Nimm {bot} in Deinem Kanal als Admin auf, mit dem Recht, Nachrichten zu posten. In einer Gruppe, die Bots erlaubt, genügt Mitglied; aufnehmen musst Du ihn dort als Admin der Gruppe. Der Kanal erscheint dann hier.',
          { bot },
        )}
      />
      <QuestionHint
        question="Wie poste ich in Gruppen ohne Bots?"
        answer="Jeder Weiterpost liegt fertig in Deinem Chat mit dem KiezCoins-Bot. Nachricht lange drücken, Weiterleiten tippen und die Gruppen wählen, auch mehrere auf einmal. Mit „Absender ausblenden“ erscheint der Post als Deiner."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[8] },
  // Rahmen und Logo gelten für alle Plattformen: abgesetzt unter den Plattformen
  look: { gap: space[8], paddingTop: space[8], borderTopWidth: stroke.thin, borderTopColor: color.line.hairline },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[4] },
  texts: { flex: 1, gap: space[2] },
  label: { ...text.body, color: color.text.primary },
  caption: { ...text.caption, color: color.text.secondary },
  connected: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  // Grüner Punkt: Konto verbunden
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.accent.confirmation },
  connectedText: { ...text.body, color: color.text.primary },
  flex: { flex: 1 },
  // Kleine Knöpfe mit Rand, damit sie als Knöpfe erkennbar sind
  chip: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: space[12],
    borderRadius: radius.full,
    borderWidth: stroke.thin,
    borderColor: color.text.secondary,
  },
  chipText: { ...text.caption, color: color.text.primary },
  chipTextOn: { color: color.text.onAccent },
  pressed: { opacity: 0.7 },
  setup: { gap: space[12], paddingTop: space[8], paddingBottom: space[16] },
  steps: { gap: CHAT_GAP_SAME },
  // Die Einrichtung hat 12 Abstand; Wechsel zwischen App und eigener Antwort wie im Chat
  reply: { marginTop: CHAT_GAP_CHANGE - space[12] },
  afterReply: { marginTop: CHAT_GAP_CHANGE - space[12] },
  replyInGroup: { marginTop: CHAT_GAP_CHANGE },
  thanks: { ...text.body, color: color.accent.confirmation, textAlign: 'center' },
});
