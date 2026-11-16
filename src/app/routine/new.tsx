import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { FieldGroup, Notice, QuestionHint } from '../../components/Content';
import { Chip, ChipGroup, TextField } from '../../components/Form';
import { NudgeArea, useNudge } from '../../components/Nudge';
import { ReminderExtrasFields, type Extras } from '../../components/ReminderExtras';
import { kindOfTimes, TimeChoice, timesOf, timesReady, type TimeKind } from '../../components/routine/TimeChoice';
import { SubScreen } from '../../components/Screen';
import { WEEKDAYS, weekdayShort } from '../../data/katerRoutine';
import { addDays, createReminder, loadReminders, localDate, parseDate, TIME } from '../../data/reminders';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `routine/new` (Daria, 2026-11-10): Erinnerung anlegen. Titel nach „Ich will …“, damit der Kater ihn in
 * seine Sätze einbauen kann. Ziel einmal an einem Tag (Daria, 2026-11-10: „heute bis …“, „morgen um …“,
 * „morgen von … bis …“), x-mal pro Woche oder an festen Tagen, optional mit Uhrzeit.
 */
/** Gehört zu „Me & Myself“: gelb wie die Routine (Daria, 2026-11-13) */
export default function NewReminderScreen() {
  // Theme Happy kommt zentral über die Route (RouteSpace)
  return <NewReminder />;
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
  // Standard: ohne Uhrzeit (Daria, 2026-11-14). Gilt für einmalige und feste Tage (Daria, 2026-11-16).
  const [timeKind, setTimeKind] = useState<TimeKind>('none');
  const [from, setFrom] = useState('');
  // Termin an einem Tag: Pflicht oder optional (Daria, 2026-11-10)
  const [required, setRequired] = useState(true);
  const [until, setUntil] = useState('');
  const [perWeek, setPerWeek] = useState(3);
  const [days, setDays] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // Grauer Speichern-Button zeigt aufs erste Feld, das noch fehlt (Daria, 2026-11-13: sonst passiert beim Tippen nichts)
  const wantField = useNudge();
  const dateField = useNudge();
  const fromField = useNudge();
  const untilField = useNudge();
  const daysField = useNudge();

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
      setTimeKind(kindOfTimes(r.atTime, r.untilTime));
      setFrom(r.atTime ?? '');
      setUntil(r.untilTime ?? '');
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
        setRequired(r.required !== false);
      } else if (r.weekdays?.length) {
        setMode('days');
        setDays(r.weekdays);
      } else {
        setMode('week');
        setPerWeek(r.perWeek ?? 1);
      }
    });
    return () => {
      live = false;
    };
  }, [von]);

  const onDate = day === 'today' ? localDate() : day === 'tomorrow' ? localDate(addDays(1)) : parseDate(date);
  const timeReady = timesReady(timeKind, from, until);
  const ready =
    want.trim().length > 0 && (mode === 'once' ? !!onDate && timeReady : mode === 'week' || (days.length > 0 && timeReady));

  const save = async () => {
    setBusy(true);
    setFailed(false);
    const ok = await createReminder({
      want: want.trim().replace(/^ich will\s+/i, ''),
      description,
      ...extras,
      onDate: mode === 'once' ? onDate ?? undefined : undefined,
      ...(mode === 'week' ? {} : timesOf(timeKind, from, until)),
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
    if (mode === 'once' && !onDate) return dateField.nudge('Gib ein Datum ein, z. B. 24.12.');
    if (mode === 'days' && !days.length) return daysField.nudge('Wähl mindestens einen Tag.');
    if (mode !== 'week') {
      if ((timeKind === 'at' || timeKind === 'range') && !TIME.test(from.trim())) return fromField.nudge('Gib eine Uhrzeit ein, z. B. 9:00.');
      if ((timeKind === 'until' || timeKind === 'range') && !TIME.test(until.trim())) return untilField.nudge('Gib eine Uhrzeit ein, z. B. 18:00.');
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
          <TimeChoice
            kind={timeKind}
            onKind={setTimeKind}
            from={from}
            onFrom={setFrom}
            until={until}
            onUntil={setUntil}
            fromNudge={fromField}
            untilNudge={untilField}
          />
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
          <FieldGroup label="Uhrzeit">
            <TimeChoice
              kind={timeKind}
              onKind={setTimeKind}
              from={from}
              onFrom={setFrom}
              until={until}
              onUntil={setUntil}
              fromNudge={fromField}
              untilNudge={untilField}
            />
          </FieldGroup>
        </>
      )}
      {/* Sichtbarkeit: vorerst nur für Dich (Annahme zu Frage 5, Daria, 2026-11-10: „lustig wie bei Duolingo“) */}
      <QuestionHint question="Wer sieht meine Erinnerungen?" answer="Nur Du und der Kater. Er kann schweigen. Meistens." />
      {failed ? <Notice variant="warning" message="Speichern hat nicht geklappt. Versuch es bitte noch einmal." /> : null}
    </SubScreen>
  );
}

