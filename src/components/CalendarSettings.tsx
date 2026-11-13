import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Button } from './Button';
import { FieldGroup, Notice, QuestionHint } from './Content';
import { Chip, ChipGroup, CopyField, TextField, Toggle } from './Form';
import { SetupSteps } from './SetupSteps';
import { Text } from './T';
import {
  addLinkedCalendar,
  chooseDeviceCalendars,
  chosenDeviceCalendars,
  deviceCalendars,
  deviceCalendarsSupported,
  feedLinks,
  loadLinkedCalendars,
  removeLinkedCalendar,
  type DeviceCalendar,
  type LinkedCalendar,
} from '../data/calendar';
import { setCalendarShown, useCalendarShown } from '../data/features';
import { useStore } from '../data/store';
import { t } from '../data/texts';
import { color, radius, space, text } from '../theme/tokens';

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
  if (provider === 'google') return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(feed.webcal)}`;
  return `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feed.https)}&name=KiezCoins`;
}
/** Rückmeldung nach dem Tippen auf einen Kalender: Was jetzt dort zu tun ist und wann die Termine kommen */
const OPENED_HINT: Record<Provider, string> = {
  apple: 'Bestätige das Abo in der Kalender-App. Deine Termine erscheinen nach wenigen Minuten. Öffnet sich nichts, kopiere den Abo-Link unten.',
  google:
    'Bestätige im Google Kalender mit „Hinzufügen“. Google ruft den Link nur alle paar Stunden ab, Deine Termine erscheinen spätestens nach einem Tag. Öffnet sich auf dem Handy nur die App, öffne den Link am Computer im Browser.',
  outlook: 'Melde Dich bei Outlook an und bestätige mit „Importieren“. Outlook ruft den Link alle paar Stunden ab, Deine Termine erscheinen spätestens nach einem Tag.',
};

/**
 * Kalender unter Dein Konto › Funktionen, wie Weiterposten (Daria, 2026-11-10; vorher eigene Seite
 * `account/kalender` unter Einstellungen, davor `routine/kalender`): Termine aus Routine im eigenen Kalender abonnieren
 * und Termine aus eigenen Kalendern in Routine zeigen, als Link (überall) oder vom Handy (Android-App). Oben ein
 * Schalter für den ganzen Kalender, die Einrichtung öffnet sich darunter. Aus blendet die Termine aus Deinen Kalendern
 * in Routine aus, die Einrichtung bleibt erhalten.
 */
export function CalendarSettings() {
  const { currentUserId } = useStore();
  const on = useCalendarShown();
  const [feed, setFeed] = useState<{ https: string; webcal: string } | null | undefined>(undefined);
  const [linked, setLinked] = useState<LinkedCalendar[] | null>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [addFailed, setAddFailed] = useState(false);
  const [device, setDevice] = useState<DeviceCalendar[] | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  // Zuletzt gewählter Kalender fürs Abo und ob er sich öffnen ließ
  const [opened, setOpened] = useState<{ provider: Provider; failed: boolean } | null>(null);
  // Zuletzt hinzugefügter Kalender, als Bestätigung
  const [added, setAdded] = useState<string | null>(null);

  const reload = useCallback(() => {
    feedLinks().then(setFeed, () => setFeed(null));
    loadLinkedCalendars().then(setLinked, () => setLinked(null));
  }, []);
  useFocusEffect(reload);

  useEffect(() => {
    if (!deviceCalendarsSupported) return;
    deviceCalendars(false).then(setDevice);
    chosenDeviceCalendars().then(setChosen);
  }, []);

  const renew = () =>
    Alert.alert(t('Neuen Link erstellen?'), t('Der alte Link funktioniert danach nicht mehr. Abonniere den neuen in Deinem Kalender.'), [
      { text: t('Abbrechen'), style: 'cancel' },
      { text: t('Neuer Link'), style: 'destructive', onPress: () => feedLinks(true).then(setFeed) },
    ]);

  const add = async () => {
    setAdding(true);
    setAddFailed(false);
    setAdded(null);
    const ok = await addLinkedCalendar(name, url);
    setAdding(false);
    if (!ok) return setAddFailed(true);
    setAdded(name.trim() || 'Kalender');
    setName('');
    setUrl('');
    loadLinkedCalendars().then(setLinked);
  };

  const remove = (c: LinkedCalendar) =>
    Alert.alert(t('Kalender entfernen?'), t('Termine aus „{name}“ erscheinen dann nicht mehr in Routine.', { name: c.name }), [
      { text: t('Abbrechen'), style: 'cancel' },
      { text: t('Entfernen'), style: 'destructive', onPress: () => removeLinkedCalendar(c.id).then(() => loadLinkedCalendars().then(setLinked)) },
    ]);

  const toggleDevice = (id: string) => {
    const next = chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id];
    setChosen(next);
    chooseDeviceCalendars(next);
  };

  const subscribe = (provider: Provider) => {
    if (!feed) return;
    Linking.openURL(subscribeUrl(provider, feed)).then(
      () => setOpened({ provider, failed: false }),
      () => setOpened({ provider, failed: true }),
    );
  };

  const urlOk = !url.trim() || /^(https|webcal):\/\/\S+$/i.test(url.trim());

  return (
      <View style={styles.sections}>
      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <Text style={styles.switchLabel}>Kalender verbinden</Text>
          <Text style={styles.url}>{on ? 'Termine aus KiezCoins in Deinem Kalender und Termine aus Deinem Kalender in Routine.' : 'Aus. Deine Einrichtung bleibt erhalten.'}</Text>
        </View>
        <Toggle label="Kalender" value={on} onValueChange={(v) => currentUserId && setCalendarShown(currentUserId, v)} />
      </View>
      {on ? (
      <>
      <FieldGroup label="KiezCoins in Deinem Kalender">
        <Text style={styles.lead}>
          Deine festen Termine aus KiezCoins, also Termine mit einer konkreten Uhrzeit, erscheinen automatisch in Deinem Kalender. Dein Kalender bleibt synchron: Aktualisierst Du einen Termin bei KiezCoins, ruft er die Änderungen ab.
        </Text>
        {feed === undefined ? null : feed === null ? (
          <Notice variant="warning" message="Der Link lädt gerade nicht. Fehlt noch die Migration 20261110000300_kalender?" />
        ) : (
          <>
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
            <CopyField label="Abo-Link für andere Kalender" value={feed.https} />
            <SetupSteps question={SUBSCRIBE_QUESTION} intro={SUBSCRIBE_INTRO} steps={SUBSCRIBE_STEPS} />
            <QuestionHint
              question="Was erscheint in meinem Kalender?"
              answer="Termine, Aufgaben mit Datum und Erinnerungen an festen Wochentagen. Erinnerungen mit „x-mal pro Woche“ haben keine feste Zeit und bleiben in Routine. Halte den Link geheim: Wer ihn hat, sieht Deine Termine."
            />
            <Button label="Neuen Link erstellen" variant="ghost" onPress={renew} />
          </>
        )}
      </FieldGroup>

      <FieldGroup label="Deine Kalender in KiezCoins">
        <Text style={styles.lead}>Termine aus diesen Kalendern zeigt Routine als Termine, für die nächsten 7 Tage.</Text>
        {linked === null ? (
          <Notice variant="warning" message="Deine Kalender laden gerade nicht. Fehlt noch die Migration 20261110000300_kalender?" />
        ) : (
          linked.map((c) => (
            <View key={c.id} style={styles.row}>
              <View style={styles.flex}>
                <Text noTranslate style={styles.name}>
                  {c.name}
                </Text>
                <Text noTranslate style={styles.url} numberOfLines={1}>
                  {c.url}
                </Text>
              </View>
              <Pressable onPress={() => remove(c)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('{name} entfernen', { name: c.name })}>
                <Text style={styles.removeText}>Entfernen</Text>
              </Pressable>
            </View>
          ))
        )}
        <TextField label="Name" placeholder="Privat" value={name} onChangeText={setName} maxLength={40} />
        <TextField
          label="iCal-Adresse"
          placeholder="https://calendar.google.com/…/basic.ics"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          error={urlOk ? undefined : 'Die Adresse beginnt mit https:// oder webcal://'}
        />
        <QuestionHint
          question="Wo finde ich die iCal-Adresse?"
          answer="In den Einstellungen Deines Kalenders. Google Kalender: Im Browser Einstellungen › Deinen Kalender wählen › „Privatadresse im iCal-Format“. iCloud: In der Kalender-App beim Kalender auf (i) tippen, „Öffentlicher Kalender“ einschalten, dann „Link teilen“. Outlook: Einstellungen › Freigegebene Kalender › „Kalender veröffentlichen“, dort den ICS-Link kopieren."
        />
        <Button label="Kalender hinzufügen" variant="secondary" busy={adding} disabled={!url.trim() || !urlOk} onPress={add} />
        {added ? <Notice message={t('„{name}“ ist verbunden. Seine Termine der nächsten 7 Tage erscheinen in Routine.', { name: added })} onClose={() => setAdded(null)} /> : null}
        {addFailed ? <Notice variant="warning" message="Das hat nicht geklappt. Prüfe bitte die Adresse." /> : null}
      </FieldGroup>

      {deviceCalendarsSupported ? (
        <FieldGroup label="Auf diesem Handy">
          {device === null ? (
            <>
              <Text style={styles.lead}>Routine kann Termine aus den Kalendern auf Deinem Handy zeigen. Sie verlassen Dein Handy nicht.</Text>
              <Button label="Zugriff erlauben" variant="secondary" onPress={() => deviceCalendars(true).then(setDevice)} />
            </>
          ) : device.length === 0 ? (
            <Text style={styles.lead}>Auf diesem Handy gibt es keine Kalender.</Text>
          ) : (
            <>
              <Text style={styles.lead}>Wähle, welche Kalender Routine zeigt.</Text>
              <ChipGroup>
                {device.map((c) => (
                  <Chip key={c.id} label={c.title} selected={chosen.includes(c.id)} onPress={() => toggleDevice(c.id)} />
                ))}
              </ChipGroup>
            </>
          )}
        </FieldGroup>
      ) : null}
      </>
      ) : null}
      </View>
  );
}

const styles = StyleSheet.create({
  // Schalter und Teile der Einrichtung, enger als die Abschnitte unter Funktionen
  sections: { gap: space[24] },
  lead: { ...text.body, color: color.text.secondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    padding: space[12],
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
  },
  // Schalter wie unter Funktionen
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[4] },
  switchLabel: { ...text.body, color: color.text.primary },
  flex: { flex: 1, gap: space[2] },
  name: { ...text.bodyStrong, color: color.text.primary },
  url: { ...text.caption, color: color.text.secondary },
  removeText: { ...text.caption, color: color.text.secondary, textDecorationLine: 'underline' },
});
