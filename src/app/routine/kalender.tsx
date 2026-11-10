import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Button } from '../../components/Button';
import { FieldGroup, Notice, QuestionHint } from '../../components/Content';
import { Chip, ChipGroup, CopyField, TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { Text } from '../../components/T';
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
} from '../../data/calendar';
import { t } from '../../data/texts';
import { useGoBack } from '../../lib/goBack';
import { color, radius, space, text } from '../../theme/tokens';

/**
 * Route `routine/kalender` (Daria, 2026-11-10): Termine aus Routine im eigenen Kalender abonnieren und Termine aus
 * eigenen Kalendern in Routine zeigen, als Link (überall) oder vom Handy (Android-App). Erstmal nur für Daria.
 */
export default function RoutineCalendar() {
  const goBack = useGoBack();
  const [feed, setFeed] = useState<{ https: string; webcal: string } | null | undefined>(undefined);
  const [linked, setLinked] = useState<LinkedCalendar[] | null>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [addFailed, setAddFailed] = useState(false);
  const [device, setDevice] = useState<DeviceCalendar[] | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);

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
    const ok = await addLinkedCalendar(name, url);
    setAdding(false);
    if (!ok) return setAddFailed(true);
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

  const urlOk = !url.trim() || /^(https|webcal):\/\/\S+$/i.test(url.trim());

  return (
    <SubScreen title="Kalender" navigation="back" onLeadingPress={goBack}>
      <View style={styles.sections}>
      <FieldGroup large label="In Deinen Kalender">
        <Text style={styles.lead}>Deine Termine aus Routine erscheinen in Deinem Kalender und bleiben dort aktuell.</Text>
        {feed === undefined ? null : feed === null ? (
          <Notice variant="warning" message="Der Link lädt gerade nicht. Fehlt noch die Migration 20261110000300_kalender?" />
        ) : (
          <>
            <Button label="Im Kalender abonnieren" onPress={() => Linking.openURL(feed.webcal).catch(() => {})} />
            <CopyField label="Abo-Link" value={feed.https} />
            <QuestionHint
              question="Wie abonniere ich den Link?"
              answer="iPhone und Mac: „Im Kalender abonnieren“ öffnet die Kalender-App. Google Kalender: Im Browser links bei „Weitere Kalender“ auf + tippen, „Per URL“ wählen und den Abo-Link einfügen. Outlook: „Kalender hinzufügen“, dann „Aus dem Internet abonnieren“."
            />
            <QuestionHint
              question="Was kommt in den Kalender?"
              answer="Termine und Aufgaben an einem Tag und Erinnerungen an festen Wochentagen. „x-mal pro Woche“ hat keine feste Zeit und bleibt nur in Routine. Der Link ist geheim: Wer ihn hat, sieht Deine Termine."
            />
            <Button label="Neuen Link erstellen" variant="ghost" onPress={renew} />
          </>
        )}
      </FieldGroup>

      <FieldGroup large label="Aus Deinen Kalendern">
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
          answer="Google Kalender: Im Browser Einstellungen › Deinen Kalender wählen › „Privatadresse im iCal-Format“. iCloud: In der Kalender-App beim Kalender auf (i) tippen, „Öffentlicher Kalender“ einschalten und „Link teilen“. Outlook: Einstellungen › Freigegebene Kalender › „Kalender veröffentlichen“, ICS-Link."
        />
        <Button label="Kalender hinzufügen" variant="secondary" busy={adding} disabled={!url.trim() || !urlOk} onPress={add} />
        {addFailed ? <Notice variant="warning" message="Das hat nicht geklappt. Prüfe bitte die Adresse." /> : null}
      </FieldGroup>

      {deviceCalendarsSupported ? (
        <FieldGroup large label="Auf diesem Handy">
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
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  // Abschnitte deutlich getrennt, wie unter Funktionen
  sections: { gap: space[32] + space[8] },
  lead: { ...text.body, color: color.text.secondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    padding: space[12],
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
  },
  flex: { flex: 1, gap: space[2] },
  name: { ...text.bodyStrong, color: color.text.primary },
  url: { ...text.caption, color: color.text.secondary },
  removeText: { ...text.caption, color: color.text.secondary, textDecorationLine: 'underline' },
});
