import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { FieldGroup, Notice, QuestionHint } from '../../components/Content';
import { Chip, ChipGroup, TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { WEEKDAYS, weekdayShort } from '../../data/katerRoutine';
import { addDays, createReminder, localDate, parseDate, TIME } from '../../data/reminders';
import { useGoBack } from '../../lib/goBack';
import { space } from '../../theme/tokens';

/**
 * Route `routine/new` (Daria, 2026-11-10): Erinnerung anlegen. Titel nach „Ich will …“, damit der Kater ihn in
 * seine Sätze einbauen kann. Ziel einmal an einem Tag (Daria, 2026-11-10: „heute bis …“, „morgen um …“,
 * „morgen von … bis …“), x-mal pro Woche oder an festen Tagen, optional mit Uhrzeit.
 */
export default function NewReminder() {
  const goBack = useGoBack();
  const router = useRouter();
  const [want, setWant] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'once' | 'week' | 'days'>('once');
  const [day, setDay] = useState<'today' | 'tomorrow' | 'other'>('today');
  const [date, setDate] = useState('');
  const [timeKind, setTimeKind] = useState<'until' | 'at' | 'range'>('until');
  const [from, setFrom] = useState('');
  // Termin an einem Tag: Pflicht oder optional (Daria, 2026-11-10)
  const [required, setRequired] = useState(true);
  const [until, setUntil] = useState('');
  const [perWeek, setPerWeek] = useState(3);
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const timeOk = !time.trim() || TIME.test(time.trim());
  const fromOk = !from.trim() || TIME.test(from.trim());
  const untilOk = !until.trim() || TIME.test(until.trim());
  const onDate = day === 'today' ? localDate() : day === 'tomorrow' ? localDate(addDays(1)) : parseDate(date);
  const onceReady =
    !!onDate &&
    (timeKind === 'until' ? TIME.test(until.trim()) : timeKind === 'at' ? TIME.test(from.trim()) : TIME.test(from.trim()) && TIME.test(until.trim()));
  const ready =
    want.trim().length > 0 && (mode === 'once' ? onceReady : mode === 'week' || (days.length > 0 && timeOk));
  const hhmm = (v: string) => v.trim().padStart(5, '0');

  const save = async () => {
    setBusy(true);
    setFailed(false);
    const ok = await createReminder({
      want: want.trim().replace(/^ich will\s+/i, ''),
      description,
      onDate: mode === 'once' ? onDate ?? undefined : undefined,
      atTime: mode === 'once' ? (timeKind !== 'until' ? hhmm(from) : undefined) : mode === 'days' && time.trim() ? hhmm(time) : undefined,
      untilTime: mode === 'once' && timeKind !== 'at' ? hhmm(until) : undefined,
      required: mode === 'once' ? required : undefined,
      perWeek: mode === 'week' ? perWeek : undefined,
      weekdays: mode === 'days' ? days : undefined,
    });
    setBusy(false);
    if (ok) router.back();
    else setFailed(true);
  };

  const toggleDay = (d: number) => setDays((all) => (all.includes(d) ? all.filter((x) => x !== d) : [...all, d]));

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
        />
      }
    >
      <TextField label="Ich will …" placeholder="joggen gehen" value={want} onChangeText={setWant} maxLength={60} required autoFocus />
      <TextField label="Beschreibung" value={description} onChangeText={setDescription} maxLength={500} multiline />
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
              error={!date.trim() || parseDate(date) ? undefined : 'Bitte so: 01.01. oder 01.01.2001'}
            />
          ) : null}
          <ChipGroup>
            <Chip label="bis" selected={timeKind === 'until'} onPress={() => setTimeKind('until')} />
            <Chip label="um" selected={timeKind === 'at'} onPress={() => setTimeKind('at')} />
            <Chip label="von … bis" selected={timeKind === 'range'} onPress={() => setTimeKind('range')} />
          </ChipGroup>
          <View style={styles.times}>
            {timeKind !== 'until' ? (
              <View style={styles.time}>
                <TextField
                  label={timeKind === 'at' ? 'Um' : 'Von'}
                  placeholder="9:00"
                  value={from}
                  onChangeText={setFrom}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  error={fromOk ? undefined : 'Bitte so: 9:00'}
                />
              </View>
            ) : null}
            {timeKind !== 'at' ? (
              <View style={styles.time}>
                <TextField
                  label="Bis"
                  placeholder="18:00"
                  value={until}
                  onChangeText={setUntil}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
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
          <FieldGroup label="An welchen Tagen?">
            <ChipGroup>
              {WEEKDAYS.map((d, i) => (
                <Chip key={d} label={weekdayShort(i + 1)} selected={days.includes(i + 1)} onPress={() => toggleDay(i + 1)} />
              ))}
            </ChipGroup>
          </FieldGroup>
          <TextField
            label="Uhrzeit"
            placeholder="18:00"
            value={time}
            onChangeText={setTime}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
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
