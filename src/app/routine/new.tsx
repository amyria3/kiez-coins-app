import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { FieldGroup, Notice, QuestionHint } from '../../components/Content';
import { Chip, ChipGroup, TextField } from '../../components/Form';
import { NudgeArea, useNudge } from '../../components/Nudge';
import { ReminderExtrasFields, type Extras } from '../../components/ReminderExtras';
import { SubScreen } from '../../components/Screen';
import { WEEKDAYS, weekdayShort } from '../../data/katerRoutine';
import { addDays, createReminder, loadReminders, localDate, parseDate, TIME } from '../../data/reminders';
import { useGoBack } from '../../lib/goBack';
import { space } from '../../theme/tokens';
import { MeSpaceScreen } from '../../theme/signal';

/**
 * Route `routine/new` (Daria, 2026-11-10): Erinnerung anlegen. Titel nach „Ich will …“, damit der Kater ihn in
 * seine Sätze einbauen kann. Ziel einmal an einem Tag (Daria, 2026-11-10: „heute bis …“, „morgen um …“,
 * „morgen von … bis …“), x-mal pro Woche oder an festen Tagen, optional mit Uhrzeit.
 */
/** Gehört zu „Me & Myself“: gelb wie die Routine (Daria, 2026-11-13) */
export default function NewReminderScreen() {
  return (
    <MeSpaceScreen>
      <NewReminder />
    </MeSpaceScreen>
  );
}

function NewReminder() {
  const goBack = useGoBack();
  const router = useRouter();
  const [want, setWant] = useState('');
  const [description, setDescription] = useState('');
  // Ort, Telefon, Link (Daria, 2026-11-13)
  const [extras, setExtras] = useState<Extras>({ place: '', phone: '', link: '' });
  const [mode, setMode] = useState<'once' | 'week' | 'days'>('once');
  const [day, setDay] = useState<'today' | 'tomorrow' | 'other'>('today');
  const [date, setDate] = useState('');
  const [timeKind, setTimeKind] = useState<'until' | 'at' | 'range' | 'none'>('none') // Standard: ohne Uhrzeit (Daria, 2026-11-14);
  const [from, setFrom] = useState('');
  // Termin an einem Tag: Pflicht oder optional (Daria, 2026-11-10)
  const [required, setRequired] = useState(true);
  const [until, setUntil] = useState('');
  const [perWeek, setPerWeek] = useState(3);
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // Grauer Speichern-Button zeigt aufs erste Feld, das noch fehlt (Daria, 2026-11-13: sonst passiert beim Tippen nichts)
  const wantField = useNudge();
  const dateField = useNudge();
  const fromField = useNudge();
  const untilField = useNudge();
  const daysField = useNudge();
  const timeField = useNudge();

  // Kopie einer Karte (Daria, 2026-11-13): `von` ist die id; das Formular übernimmt Titel, Beschreibung, Zeit,
  // Ort, Telefon und Link. Liegt der Tag in der Vergangenheit, steht „Heute“ da.
  const { von, tag } = useLocalSearchParams<{ von?: string; tag?: string }>();
  // Aus dem Kalender: einmal an diesem Tag (Daria, 2026-11-14)
  useEffect(() => {
    if (!tag || !/^\d{4}-\d{2}-\d{2}$/.test(tag)) return;
    setMode('once');
    if (tag <= localDate()) setDay('today');
    else if (tag === localDate(addDays(1))) setDay('tomorrow');
    else {
      const [y, m, d] = tag.split('-');
      setDay('other');
      setDate(`${d}.${m}.${y}`);
    }
  }, [tag]);
  useEffect(() => {
    if (!von) return;
    let live = true;
    loadReminders().then((list) => {
      const r = list?.find((x) => x.id === von);
      if (!live || !r) return;
      setWant(r.want);
      setDescription(r.description ?? '');
      setExtras({ place: r.place ?? '', phone: r.phone ?? '', link: r.link ?? '' });
      if (r.onDate) {
        setMode('once');
        const today = localDate();
        const tomorrow = localDate(addDays(1));
        if (r.onDate <= today) setDay('today');
        else if (r.onDate === tomorrow) setDay('tomorrow');
        else {
          const [y, m, d] = r.onDate.split('-');
          setDay('other');
          setDate(`${d}.${m}.${y}`);
        }
        setTimeKind(r.atTime && r.untilTime ? 'range' : r.atTime ? 'at' : r.untilTime ? 'until' : 'none');
        setFrom(r.atTime ?? '');
        setUntil(r.untilTime ?? '');
        setRequired(r.required !== false);
      } else if (r.weekdays?.length) {
        setMode('days');
        setDays(r.weekdays);
        setTime(r.atTime ?? '');
      } else {
        setMode('week');
        setPerWeek(r.perWeek ?? 1);
      }
    });
    return () => {
      live = false;
    };
  }, [von]);

  const timeOk = !time.trim() || TIME.test(time.trim());
  const fromOk = !from.trim() || TIME.test(from.trim());
  const untilOk = !until.trim() || TIME.test(until.trim());
  const onDate = day === 'today' ? localDate() : day === 'tomorrow' ? localDate(addDays(1)) : parseDate(date);
  const onceReady =
    !!onDate &&
    (timeKind === 'none' ? true : timeKind === 'until' ? TIME.test(until.trim()) : timeKind === 'at' ? TIME.test(from.trim()) : TIME.test(from.trim()) && TIME.test(until.trim()));
  const ready =
    want.trim().length > 0 && (mode === 'once' ? onceReady : mode === 'week' || (days.length > 0 && timeOk));
  const hhmm = (v: string) => v.trim().padStart(5, '0');

  const save = async () => {
    setBusy(true);
    setFailed(false);
    const ok = await createReminder({
      want: want.trim().replace(/^ich will\s+/i, ''),
      description,
      ...extras,
      onDate: mode === 'once' ? onDate ?? undefined : undefined,
      atTime: mode === 'once' ? (timeKind === 'at' || timeKind === 'range' ? hhmm(from) : undefined) : mode === 'days' && time.trim() ? hhmm(time) : undefined,
      untilTime: mode === 'once' && (timeKind === 'until' || timeKind === 'range') ? hhmm(until) : undefined,
      required: mode === 'once' ? required : undefined,
      perWeek: mode === 'week' ? perWeek : undefined,
      weekdays: mode === 'days' ? days : undefined,
    });
    setBusy(false);
    if (ok) router.back();
    else setFailed(true);
  };

  const whyDisabled = () => {
    if (busy) return;
    if (!want.trim()) return wantField.nudge('Schreib, was Du vorhast.');
    if (mode === 'once') {
      if (!onDate) return dateField.nudge('Gib ein Datum ein, z. B. 24.12.');
      if ((timeKind === 'at' || timeKind === 'range') && !TIME.test(from.trim())) return fromField.nudge('Gib eine Uhrzeit ein, z. B. 9:00.');
      if ((timeKind === 'until' || timeKind === 'range') && !TIME.test(until.trim())) return untilField.nudge('Gib eine Uhrzeit ein, z. B. 18:00.');
    }
    if (mode === 'days') {
      if (!days.length) return daysField.nudge('Wähl mindestens einen Tag.');
      if (!timeOk) return timeField.nudge('Bitte so: 18:00');
    }
  };

  const toggleDay = (d: number) => {
    daysField.clear();
    setDays((all) => (all.includes(d) ? all.filter((x) => x !== d) : [...all, d]));
  };

  return (
    <SubScreen
      title="Neue Erinnerung"
      navigation="close"
      onLeadingPress={goBack}
      actions={
        <Button
          label="Speichern"
          onPress={save}
          busy={busy}
          disabled={!ready}
          whyDisabled={whyDisabled}
        />
      }
    >
      <TextField label="Ich will …" placeholder="joggen gehen" value={want} onChangeText={setWant} maxLength={60} required autoFocus nudge={wantField} />
      <TextField label="Beschreibung" value={description} onChangeText={setDescription} maxLength={500} multiline />
      <ReminderExtrasFields value={extras} onChange={setExtras} />
      {/* Erklärungen als Dialog mit Blasen statt als Hilfetext (Daria, 2026-11-10) */}
      <QuestionHint
        question="Wofür ist die Beschreibung?"
        answer="Für Deine Me-Challenge: Postest Du nach dem Erledigen eine, steht die Beschreibung dort als Vorher-Text. Das Feld ist freiwillig."
      />
      <FieldGroup label="Wie oft?">
        <ChipGroup>
          <Chip label="Einmal" selected={mode === 'once'} onPress={() => setMode('once')} />
          <Chip label="x-mal pro Woche" selected={mode === 'week'} onPress={() => setMode('week')} />
          <Chip label="An festen Tagen" selected={mode === 'days'} onPress={() => setMode('days')} />
        </ChipGroup>
      </FieldGroup>
      {mode === 'once' ? (
        <>
          <FieldGroup label="Wann?">
            <ChipGroup>
              <Chip label="Heute" selected={day === 'today'} onPress={() => setDay('today')} />
              <Chip label="Morgen" selected={day === 'tomorrow'} onPress={() => setDay('tomorrow')} />
              {/* „Oder an einem bestimmten Datum“ (Daria, 2026-11-10) */}
              <Chip label="Datum" selected={day === 'other'} onPress={() => setDay('other')} />
            </ChipGroup>
          </FieldGroup>
          {day === 'other' ? (
            <TextField
              label="Datum"
              placeholder="Datum im Format 01.01. oder 01.01.2001"
              value={date}
              onChangeText={setDate}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              nudge={dateField}
              error={!date.trim() || parseDate(date) ? undefined : 'Bitte so: 01.01. oder 01.01.2001'}
            />
          ) : null}
          <ChipGroup>
            {/* Ohne Uhrzeit vorn, da Standard (Daria, 2026-11-14) */}
            <Chip label="ohne Uhrzeit" selected={timeKind === 'none'} onPress={() => setTimeKind('none')} />
            <Chip label="bis" selected={timeKind === 'until'} onPress={() => setTimeKind('until')} />
            <Chip label="um" selected={timeKind === 'at'} onPress={() => setTimeKind('at')} />
            <Chip label="von … bis" selected={timeKind === 'range'} onPress={() => setTimeKind('range')} />
          </ChipGroup>
          <View style={styles.times}>
            {timeKind === 'at' || timeKind === 'range' ? (
              <View style={styles.time}>
                <TextField
                  label={timeKind === 'at' ? 'Um' : 'Von'}
                  placeholder="Format 9:00"
                  value={from}
                  onChangeText={setFrom}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  nudge={fromField}
                  error={fromOk ? undefined : 'Bitte so: 9:00'}
                />
              </View>
            ) : null}
            {timeKind === 'until' || timeKind === 'range' ? (
              <View style={styles.time}>
                <TextField
                  label="Bis"
                  placeholder="Format 18:00"
                  value={until}
                  onChangeText={setUntil}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  nudge={untilField}
                  error={untilOk ? undefined : 'Bitte so: 18:00'}
                />
              </View>
            ) : null}
          </View>
          <FieldGroup label="Wie verbindlich?">
            <ChipGroup>
              <Chip label="Pflicht" selected={required} onPress={() => setRequired(true)} />
              <Chip label="Optional" selected={!required} onPress={() => setRequired(false)} />
            </ChipGroup>
          </FieldGroup>
        </>
      ) : mode === 'week' ? (
        <FieldGroup label="Mal pro Woche">
          <ChipGroup>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <Chip key={n} label={`${n}×`} selected={perWeek === n} onPress={() => setPerWeek(n)} />
            ))}
          </ChipGroup>
        </FieldGroup>
      ) : (
        <>
          <NudgeArea nudge={daysField}>
            <FieldGroup label="An welchen Tagen?">
              <ChipGroup>
                {WEEKDAYS.map((d, i) => (
                  <Chip key={d} label={weekdayShort(i + 1)} selected={days.includes(i + 1)} onPress={() => toggleDay(i + 1)} />
                ))}
              </ChipGroup>
            </FieldGroup>
          </NudgeArea>
          <TextField
            label="Uhrzeit"
            placeholder="Uhrzeit im Format 18:00 (optional)"
            value={time}
            onChangeText={setTime}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            nudge={timeField}
            error={timeOk ? undefined : 'Bitte so: 18:00'}
          />
        </>
      )}
      {/* Sichtbarkeit: vorerst nur für Dich (Annahme zu Frage 5, Daria, 2026-11-10: „lustig wie bei Duolingo“) */}
      <QuestionHint question="Wer sieht meine Erinnerungen?" answer="Nur Du und der Kater. Er kann schweigen. Meistens." />
      {failed ? <Notice variant="warning" message="Speichern hat nicht geklappt. Versuch es bitte noch einmal." /> : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  times: { flexDirection: 'row', gap: space[12] },
  time: { flex: 1 },
});
