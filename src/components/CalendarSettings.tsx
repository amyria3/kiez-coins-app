import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { Button } from './Button';
import { Notice, QuestionHint } from './Content';
import { TextField, Toggle } from './Form';
import { SetupSteps } from './SetupSteps';
import { Text } from './T';
import {
  addLinkedCalendar,
  calendarUrl,
  chooseDeviceCalendars,
  chosenDeviceCalendars,
  deviceCalendars,
  deviceCalendarsSupported,
  feedExported,
  feedLinks,
  loadLinkedCalendars,
  removeLinkedCalendar,
  renameLinkedCalendar,
  setFeedExported,
  setLinkedCalendarShown,
  type DeviceCalendar,
  type LinkedCalendar,
} from '../data/calendar';
import { t } from '../data/texts';
import { color, radius, space, stroke, text } from '../theme/tokens';

/**
 * Anleitung zum Abonnieren (Daria, 2026-11-10): erst die Frage (2026-11-11), dann Anzahl der Schritte und
 * Voraussetzungen, dann Schritt für Schritt, wie beim Weiterposten.
 */
const SUBSCRIBE_QUESTION = 'Wie kommen meine Termine in meinen Kalender?';
const SUBSCRIBE_INTRO =
  'Das Abonnieren umfasst 3 Schritte und setzt voraus, dass Du in Deinem Kalender angemeldet bist, zum Beispiel bei Apple, Google oder Outlook. Möchtest Du jetzt loslegen?';
const SUBSCRIBE_STEPS = [
  '1. Tippe oben auf Deinen Kalender: Apple, Google oder Outlook. Er öffnet sich mit dem Abo, Du bestätigst nur noch. Fehlt Dein Kalender in der Liste, kopiere den Abo-Link.',
  '2. Öffne Deinen Kalender und such das Abonnieren per Link. Google Kalender: Im Browser links bei „Weitere Kalender“ auf + und „Per URL“. Outlook: „Kalender hinzufügen“ › „Aus dem Internet abonnieren“.',
  '3. Füge den Abo-Link ein und bestätige. Deine Termine erscheinen, sobald Dein Kalender den Link abruft. Apple braucht dafür Minuten, Google und Outlook bis zu einen Tag.',
];

/**
 * Ein Knopf je Kalender statt eines webcal-Knopfs für alle (Daria, 2026-11-12): webcal:// öffnet nur auf iPhone und
 * Mac etwas. Unter Android und Windows passierte beim Tippen nichts, ohne Rückmeldung. Google und Outlook nehmen
 * Abos über eigene Adressen im Browser an. Der Kalender des Geräts steht vorn.
 */
type Provider = 'apple' | 'google' | 'outlook';
const PROVIDER_LABEL: Record<Provider, string> = {
  apple: 'Apple Kalender',
  google: 'Google Kalender',
  outlook: 'Outlook',
};
const PROVIDER_ORDER: Provider[] = Platform.OS === 'ios' ? ['apple', 'google', 'outlook'] : ['google', 'apple', 'outlook'];
function subscribeUrl(provider: Provider, feed: { https: string; webcal: string }) {
  if (provider === 'apple') return feed.webcal;
  // Erst die Kontoauswahl von Google, sonst abonniert das gerade aktive Konto (Daria, 2026-11-13)
  if (provider === 'google')
    return `https://accounts.google.com/AccountChooser?continue=${encodeURIComponent(`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(feed.webcal)}`)}`;
  return `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feed.https)}&name=KiezCoins`;
}
/** Rückmeldung nach dem Tippen auf einen Kalender: Was jetzt dort zu tun ist und wann die Termine kommen */
const OPENED_HINT: Record<Provider, string> = {
  apple: 'Bestätige das Abo in der Kalender-App. Deine Termine erscheinen nach wenigen Minuten. Öffnet sich nichts, kopiere den Abo-Link oben mit „Link kopieren“.',
  google:
    'Wähle Dein Google-Konto und bestätige im Google Kalender mit „Hinzufügen“. Google ruft den Link nur alle paar Stunden ab, Deine Termine erscheinen spätestens nach einem Tag. Öffnet sich auf dem Handy nur die App, öffne den Link am Computer im Browser.',
  outlook: 'Melde Dich bei Outlook an und bestätige mit „Importieren“. Outlook ruft den Link alle paar Stunden ab, Deine Termine erscheinen spätestens nach einem Tag.',
};

/** Dienste mit fester Zeile, wie die Plattformen beim Weiterposten (Daria, 2026-11-13) */
type Source = 'google' | 'icloud' | 'outlook';
const SOURCES: { key: Source; label: string; placeholder: string; howTo: string }[] = [
  {
    key: 'google',
    label: 'Google',
    placeholder: 'https://calendar.google.com/…/basic.ics',
    howTo: 'Im Browser: Google Kalender › Einstellungen › Deinen Kalender wählen › „Privatadresse im iCal-Format“ kopieren.',
  },
  {
    key: 'icloud',
    label: 'iCloud',
    placeholder: 'webcal://p…-caldav.icloud.com/…',
    howTo: 'In der Kalender-App beim Kalender auf (i) tippen, „Öffentlicher Kalender“ einschalten, dann „Link teilen“ und kopieren.',
  },
  {
    key: 'outlook',
    label: 'Outlook',
    placeholder: 'https://outlook.live.com/owa/calendar/…/calendar.ics',
    howTo: 'Im Browser: Outlook › Einstellungen › Kalender › Freigegebene Kalender › „Kalender veröffentlichen“, dann den ICS-Link kopieren.',
  },
];

/** Dienst einer iCal-Adresse; `null` für andere Kalender */
function sourceOf(url: string): Source | null {
  const host = hostOf(url).toLowerCase();
  if (host.includes('google')) return 'google';
  if (host.includes('icloud') || host.includes('apple')) return 'icloud';
  if (host.includes('outlook') || host.includes('live.com') || host.includes('office')) return 'outlook';
  return null;
}
const hostOf = (url: string) => url.trim().replace(/^[a-z]+:\/\//i, '').split('/')[0];
const SAVE_FAILED = 'Das hat nicht geklappt. Bitte versuch es noch einmal.';

/**
 * Kalender unter Dein Konto › Funktionen, nach dem Muster vom Weiterposten (Daria, 2026-11-13): je Funktion ein
 * Schalter. „Termine aus KiezCoins exportieren“ und feste Zeilen „Termine aus Google/iCloud/Outlook anzeigen“, dazu
 * weitere verbundene Kalender und auf Android die Kalender des Handys. Ohne Verbindung öffnet der Schalter darunter die
 * Einrichtung; verbunden schaltet er nur an und aus. Ein Tipp auf den Namen öffnet die Einstellungen; dort steht das
 * Zurücksetzen (Link kopieren und neuer Link, Trennen) als eigener Knopf. Scheitert das Speichern, springt der
 * Schalter zurück und eine Meldung erscheint.
 * Mehrere Kalender je Dienst, jeder mit eigenem Namen (Daria, 2026-11-14): Die Kalender eines Dienstes stehen
 * untereinander, darunter „Weiteren …-Kalender verbinden“. Beim Verbinden steht ein Name dabei (leer: der Dienst, beim
 * zweiten „Google 2“), in den Einstellungen eines Kalenders lässt er sich ändern. Dieselbe Adresse zweimal geht nicht. Routine als Ganzes schaltet der Schalter „Routine“ oben unter Funktionen.
 */
export function CalendarSettings() {
  const [feed, setFeed] = useState<{ https: string; webcal: string } | null | undefined>(undefined);
  const [exported, setExported] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [linked, setLinked] = useState<LinkedCalendar[] | null>([]);
  // Offene Zeile: id eines verbundenen Kalenders, ein Dienst ohne Verbindung oder „other“ für einen anderen Kalender
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  // Name eines verbundenen Kalenders beim Umbenennen
  const [rename, setRename] = useState('');
  const [busy, setBusy] = useState(false);
  const [addFailed, setAddFailed] = useState<'fail' | 'dup' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceCalendar[] | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  // Zuletzt gewählter Kalender fürs Abo und ob er sich öffnen ließ
  const [opened, setOpened] = useState<{ provider: Provider; failed: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(() => {
    feedLinks().then(setFeed, () => setFeed(null));
    feedExported().then(setExported);
    loadLinkedCalendars().then(setLinked, () => setLinked(null));
  }, []);
  useFocusEffect(reload);

  useEffect(() => {
    if (!deviceCalendarsSupported) return;
    deviceCalendars(false).then(setDevice);
    chosenDeviceCalendars().then(setChosen);
  }, []);

  const exportSwitch = (on: boolean) => {
    setError(null);
    setExported(on);
    // Frisch eingeschaltet: Einstellungen gleich offen, wie beim Verbinden einer Plattform
    setExportOpen(on);
    setFeedExported(on).then((ok) => {
      if (ok) return;
      setExported(!on);
      setError(SAVE_FAILED);
    });
  };

  const renew = () =>
    Alert.alert(t('Neuen Link erstellen?'), t('Der alte Link funktioniert danach nicht mehr. Abonniere den neuen in Deinem Kalender.'), [
      { text: t('Abbrechen'), style: 'cancel' },
      { text: t('Neuer Link'), style: 'destructive', onPress: () => feedLinks(true).then(setFeed) },
    ]);

  const copyLink = async () => {
    if (!feed) return;
    await Clipboard.setStringAsync(feed.https);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const subscribe = (provider: Provider) => {
    if (!feed) return;
    Linking.openURL(subscribeUrl(provider, feed)).then(
      () => setOpened({ provider, failed: false }),
      () => setOpened({ provider, failed: true }),
    );
  };

  const showLinked = (c: LinkedCalendar, shown: boolean) => {
    setError(null);
    setLinked((list) => list && list.map((x) => (x.id === c.id ? { ...x, shown } : x)));
    setLinkedCalendarShown(c.id, shown).then((ok) => {
      if (ok) return;
      setError(SAVE_FAILED);
      loadLinkedCalendars().then(setLinked);
    });
  };

  const disconnect = (c: LinkedCalendar) =>
    Alert.alert(t('„{name}“ trennen?', { name: c.name }), t('Termine aus „{name}“ erscheinen dann nicht mehr in Routine.', { name: c.name }), [
      { text: t('Abbrechen'), style: 'cancel' },
      {
        text: t('Trennen'),
        style: 'destructive',
        onPress: () => removeLinkedCalendar(c.id).then(() => (setOpenKey(null), loadLinkedCalendars().then(setLinked))),
      },
    ]);

  // Einrichtung öffnen oder schließen; Felder beginnen jedes Mal leer
  const toggleOpen = (key: string, open: boolean) => {
    setOpenKey(open ? key : null);
    setUrl('');
    setName('');
    setAddFailed(null);
  };

  // Einstellungen eines verbundenen Kalenders; das Namensfeld beginnt mit seinem Namen
  const openLinked = (c: LinkedCalendar) => {
    setOpenKey((k) => (k === c.id ? null : c.id));
    setRename(c.name);
  };

  /** Freier Name: der Dienst selbst oder mit Zahl („Google 2“) */
  const nameFor = (label: string) => {
    const taken = new Set((linked ?? []).map((c) => c.name));
    if (!taken.has(label)) return label;
    let n = 2;
    while (taken.has(`${label} ${n}`)) n++;
    return `${label} ${n}`;
  };

  const add = async (fallbackName: string) => {
    if ((linked ?? []).some((c) => calendarUrl(c.url) === calendarUrl(url))) return setAddFailed('dup');
    setBusy(true);
    setAddFailed(null);
    const ok = await addLinkedCalendar(name.trim() || fallbackName, url);
    setBusy(false);
    if (!ok) return setAddFailed('fail');
    toggleOpen('', false);
    loadLinkedCalendars().then(setLinked);
  };

  const saveName = async (c: LinkedCalendar) => {
    setBusy(true);
    setError(null);
    const ok = await renameLinkedCalendar(c.id, rename);
    setBusy(false);
    if (!ok) return setError(SAVE_FAILED);
    setRename(rename.trim());
    loadLinkedCalendars().then(setLinked);
  };

  const toggleDevice = (id: string, on: boolean) => {
    const next = on ? [...chosen.filter((x) => x !== id), id] : chosen.filter((x) => x !== id);
    setChosen(next);
    chooseDeviceCalendars(next);
  };

  const urlOk = !url.trim() || /^(https|webcal):\/\/\S+$/i.test(url.trim());

  /** Einrichtung wie bei BlueSky: Adresse, Hinweis, wo sie steht, Name und „Verbinden“. Ohne Namen gilt `fallbackName`. */
  const setupFields = (fallbackName: string, question: string, placeholder: string, howTo: string) => (
    <View style={styles.setup}>
      <QuestionHint question={question} answer={howTo} />
      <TextField
        label="iCal-Adresse"
        placeholder={placeholder}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        error={urlOk ? undefined : 'Die Adresse beginnt mit https:// oder webcal://'}
      />
      <TextField label="Name" placeholder={fallbackName} value={name} onChangeText={setName} maxLength={40} />
      <Button label="Verbinden" busy={busy} disabled={busy || !url.trim() || !urlOk} onPress={() => add(fallbackName)} />
      {addFailed ? (
        <Notice variant="warning" message={addFailed === 'dup' ? 'Dieser Kalender ist schon verbunden.' : 'Das hat nicht geklappt. Prüfe bitte die Adresse.'} />
      ) : null}
    </View>
  );

  /** Zeile eines verbundenen Kalenders: Schalter fürs Anzeigen, Tipp auf den Namen zeigt Name, „Verbunden“ und „Trennen“ */
  const linkedRow = (c: LinkedCalendar) => {
    const changed = !!rename.trim() && rename.trim() !== c.name;
    return (
      <View key={c.id}>
        <SettingRow
          label={t('Termine aus {name} anzeigen', { name: c.name })}
          caption={c.shown ? hostOf(c.url) : t('Aus. {name} bleibt verbunden.', { name: c.name })}
          value={c.shown}
          open={openKey === c.id}
          onPressLabel={() => openLinked(c)}
          onToggle={(v) => showLinked(c, v)}
        />
        {openKey === c.id ? (
          <View style={styles.setup}>
            <TextField label="Name" placeholder={c.name} value={rename} onChangeText={setRename} maxLength={40} />
            {changed ? <Button label="Name speichern" variant="secondary" busy={busy} disabled={busy} onPress={() => saveName(c)} /> : null}
            <Status label="Verbunden" action="Trennen" onPress={() => disconnect(c)} />
          </View>
        ) : null}
      </View>
    );
  };

  const list = linked ?? [];
  // Kalender ohne bekannten Dienst stehen über „Termine aus einem anderen Kalender anzeigen“
  const others = list.filter((c) => !sourceOf(c.url));

  return (
    <View style={styles.list}>
      <QuestionHint
        question="Was kann der Kalender?"
        answer="Deine Termine aus KiezCoins erscheinen in Deinem Kalender, und Termine aus Deinen Kalendern erscheinen in Routine. Jede Richtung und jeder Kalender hat einen eigenen Schalter."
      />
      {error ? <Notice variant="warning" message={error} onClose={() => setError(null)} /> : null}

      {/* Export */}
      <SettingRow
        label="Termine aus KiezCoins exportieren"
        caption={exported ? 'Dein Kalender zeigt Deine Termine aus KiezCoins.' : 'Aus. Das Abo bleibt, Dein Kalender zeigt keine Termine aus KiezCoins.'}
        value={exported}
        open={exportOpen}
        onPressLabel={() => setExportOpen((o) => !o)}
        onToggle={exportSwitch}
      />
      {exportOpen ? (
        <View style={styles.setup}>
          {feed === undefined ? null : feed === null ? (
            <Notice variant="warning" message="Der Link lädt gerade nicht. Versuch es bitte gleich noch einmal." />
          ) : (
            <>
              {/* Kopieren neben dem Zustand, der neue Link steht als Zurücksetzen unten (Daria, 2026-11-13) */}
              <Status label="Abo-Link aktiv" action={copied ? 'Kopiert' : 'Link kopieren'} onPress={copyLink} />
              <Text style={styles.lead}>Wähle Deinen Kalender:</Text>
              {PROVIDER_ORDER.map((p, i) => (
                <Button key={p} label={PROVIDER_LABEL[p]} variant={i === 0 ? 'primary' : 'secondary'} onPress={() => subscribe(p)} />
              ))}
              {opened ? (
                <Notice
                  variant={opened.failed ? 'warning' : 'info'}
                  message={opened.failed ? 'Dein Gerät hat keine App für diesen Kalender. Kopiere den Abo-Link und füge ihn in Deinem Kalender ein.' : OPENED_HINT[opened.provider]}
                  onClose={() => setOpened(null)}
                />
              ) : null}
              <SetupSteps question={SUBSCRIBE_QUESTION} intro={SUBSCRIBE_INTRO} steps={SUBSCRIBE_STEPS} />
              <QuestionHint
                question="Was erscheint in meinem Kalender?"
                answer="Termine, Aufgaben mit Datum und Erinnerungen an festen Wochentagen. Erinnerungen mit „x-mal pro Woche“ haben keine feste Zeit und bleiben in Routine. Halte den Link geheim: Wer ihn hat, sieht Deine Termine."
              />
              <Button label="Neuen Link erstellen" variant="ghost" onPress={renew} />
            </>
          )}
        </View>
      ) : null}

      {linked === null ? <Notice variant="warning" message="Deine Kalender laden gerade nicht. Versuch es bitte gleich noch einmal." /> : null}

      {/* Je Dienst: ohne Verbindung eine feste Zeile, deren Schalter die Einrichtung öffnet; verbunden alle Kalender
          des Dienstes mit eigenem Schalter und darunter „Weiteren …-Kalender verbinden“ */}
      {SOURCES.map((src) => {
        const mine = list.filter((c) => sourceOf(c.url) === src.key);
        const open = openKey === src.key;
        const setup = open
          ? setupFields(nameFor(src.label), t('Wo finde ich die iCal-Adresse von {name}?', { name: src.label }), src.placeholder, src.howTo)
          : null;
        if (!mine.length)
          return (
            <View key={src.key}>
              <SettingRow
                label={t('Termine aus {name} anzeigen', { name: src.label })}
                caption="Nicht verbunden"
                value={open}
                open={open}
                onPressLabel={() => toggleOpen(src.key, !open)}
                onToggle={(v) => toggleOpen(src.key, v)}
              />
              {setup}
            </View>
          );
        return (
          <View key={src.key}>
            {mine.map(linkedRow)}
            <Button
              label={t('Weiteren {name}-Kalender verbinden', { name: src.label })}
              variant="ghost"
              onPress={() => toggleOpen(src.key, !open)}
            />
            {setup}
          </View>
        );
      })}

      {/* Kalender ohne bekannten Dienst, z. B. von einem Verein, mit eigenem Namen */}
      {others.map(linkedRow)}

      {/* Kalender auf dem Handy (Android-App), je einer mit eigenem Schalter */}
      {deviceCalendarsSupported ? (
        device === null ? (
          <View style={styles.setup}>
            <Text style={styles.lead}>Routine kann Termine aus den Kalendern auf Deinem Handy zeigen. Sie verlassen Dein Handy nicht.</Text>
            <Button label="Zugriff erlauben" variant="secondary" onPress={() => deviceCalendars(true).then(setDevice)} />
          </View>
        ) : (
          device.map((c) => (
            <SettingRow
              key={c.id}
              label={t('Termine aus {name} anzeigen', { name: c.title })}
              caption="Auf diesem Handy"
              value={chosen.includes(c.id)}
              onToggle={(v) => toggleDevice(c.id, v)}
            />
          ))
        )
      ) : null}

      {/* Anderer Kalender, z. B. von einem Verein oder einer Schule */}
      <SettingRow
        label="Termine aus einem anderen Kalender anzeigen"
        caption="Mit iCal-Adresse"
        value={openKey === 'other'}
        open={openKey === 'other'}
        onPressLabel={() => toggleOpen('other', openKey !== 'other')}
        onToggle={(v) => toggleOpen('other', v)}
      />
      {openKey === 'other'
        ? setupFields(nameFor(t('Kalender')), t('Wo finde ich die iCal-Adresse?'), 'https://…/kalender.ics', 'In den Einstellungen Deines Kalenders, oft unter „Teilen“, „Veröffentlichen“ oder „iCal“.')
        : null}
    </View>
  );
}

/** Zeile wie beim Weiterposten: Name und Zustand, daneben der Schalter. Ein Tipp auf den Namen öffnet die Einstellungen. */
function SettingRow({
  label,
  caption,
  value,
  open,
  onPressLabel,
  onToggle,
}: {
  label: string;
  caption: string;
  value: boolean;
  open?: boolean;
  onPressLabel?: () => void;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [styles.texts, pressed && !!onPressLabel && styles.pressed]}
        disabled={!onPressLabel}
        accessibilityRole={onPressLabel ? 'button' : undefined}
        accessibilityState={onPressLabel ? { expanded: !!open } : undefined}
        accessibilityLabel={onPressLabel ? t('{label}: Einstellungen', { label }) : undefined}
        onPress={onPressLabel}
      >
        {/* Texte mit Platzhalter kommen schon übersetzt an; die Suche nach ihnen findet nichts und lässt sie stehen */}
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.caption}>{caption}</Text>
      </Pressable>
      <Toggle label={label} value={value} onValueChange={onToggle} />
    </View>
  );
}

/** Zustand mit grünem Punkt und Knopf zum Zurücksetzen, wie „Verbunden“ beim Weiterposten */
function Status({ label, action, onPress }: { label: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.connected}>
      <View style={styles.dot} />
      <Text style={[styles.connectedText, styles.flex]}>{label}</Text>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
        <Text style={styles.chipText}>{action}</Text>
      </Pressable>
    </View>
  );
}

// Abstände und Zeilen wie in CrosspostSwitches
const styles = StyleSheet.create({
  list: { gap: space[8] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[4] },
  texts: { flex: 1, gap: space[2] },
  label: { ...text.body, color: color.text.primary },
  caption: { ...text.caption, color: color.text.secondary },
  lead: { ...text.body, color: color.text.secondary },
  setup: { gap: space[12], paddingTop: space[8], paddingBottom: space[16] },
  connected: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  // Grüner Punkt: eingerichtet
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.accent.confirmation },
  connectedText: { ...text.body, color: color.text.primary },
  flex: { flex: 1 },
  chip: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: space[12],
    borderRadius: radius.full,
    borderWidth: stroke.thin,
    borderColor: color.text.secondary,
  },
  chipText: { ...text.caption, color: color.text.primary },
  pressed: { opacity: 0.7 },
});
