import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { FieldGroup, Notice } from '../../components/Content';
import { TextField } from '../../components/Form';
import { useNudge } from '../../components/Nudge';
import { ReminderExtrasFields, type Extras } from '../../components/ReminderExtras';
import { kindOfTimes, TimeChoice, timesOf, timesReady, type TimeKind } from '../../components/routine/TimeChoice';
import { SubScreen } from '../../components/Screen';
import { loadReminders, parseDate, TIME, updateReminder, type Reminder } from '../../data/reminders';
import { useGoBack } from '../../lib/goBack';
import { color } from '../../theme/tokens';

/** „2026-11-13“ → „13.11.2026“, so wie das Datumsfeld es erwartet */
const dotted = (iso: string) => iso.split('-').reverse().join('.');

/**
 * Route `routine/bearbeiten?id=…` (Daria, 2026-11-13): Erinnerung bearbeiten. Öffnet über das Menü der Karte („•••“
 * oder Tippen auf die Karte) › „Bearbeiten“. Titel, Beschreibung, Ort, Telefon, Link, Tag und Zeit mit „bis“ (to), „um“ (around)
 * oder „von … bis“. Feste Tage ändern nur die Uhrzeit, auch mit „bis“ (Daria, 2026-11-16); x-mal pro Woche hat keine.
 */
/** Gehört zu „Me & Myself“: gelb wie die Routine (Daria, 2026-11-13) */
export default function EditReminderScreen() {
  // Theme Happy kommt zentral über die Route (RouteSpace)
  return <EditReminder />;
}

function EditReminder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack();
  const router = useRouter();
  const [reminder, setReminder] = useState<Reminder | null | undefined>(undefined);
  const [want, setWant] = useState('');
  const [description, setDescription] = useState('');
  const [extras, setExtras] = useState<Extras>({ place: '', phone: '', link: '' });
  const [date, setDate] = useState('');
  const [timeKind, setTimeKind] = useState<TimeKind>('none');
  const [from, setFrom] = useState('');
  const [until, setUntil] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const wantField = useNudge();
  const dateField = useNudge();
  const fromField = useNudge();
  const untilField = useNudge();

  useEffect(() => {
    loadReminders().then(
      (all) => {
        const r = all?.find((x) => x.id === id) ?? null;
        setReminder(r);
        if (!r) return;
        setWant(r.want);
        setDescription(r.description ?? '');
        setExtras({ place: r.place ?? '', phone: r.phone ?? '', link: r.link ?? '' });
        if (r.onDate) setDate(dotted(r.onDate));
        setTimeKind(kindOfTimes(r.atTime, r.untilTime));
        setFrom(r.atTime ?? '');
        setUntil(r.untilTime ?? '');
      },
      () => setReminder(null),
    );
  }, [id]);

  const once = !!reminder?.onDate;
  const fixedDays = !once && !!reminder?.weekdays?.length;
  const onDate = once ? parseDate(date) : null;
  const timed = once || fixedDays;
  const ready = !!reminder && want.trim().length > 0 && (!once || !!onDate) && (!timed || timesReady(timeKind, from, until));

  const save = async () => {
    if (!reminder) return;
    setBusy(true);
    setFailed(false);
    const ok = await updateReminder(reminder, {
      want: want.trim().replace(/^ich will\s+/i, ''),
      description,
      ...extras,
      onDate: onDate ?? undefined,
      ...(timed ? timesOf(timeKind, from, until) : {}),
    });
    setBusy(false);
    if (ok) router.back();
    else setFailed(true);
  };

  const whyDisabled = () => {
    if (busy || !reminder) return;
    if (!want.trim()) return wantField.nudge('Schreib, was Du vorhast.');
    if (once && !onDate) return dateField.nudge('Gib ein Datum ein, z. B. 24.12.');
    if (!timed) return;
    if ((timeKind === 'at' || timeKind === 'range') && !TIME.test(from.trim())) return fromField.nudge('Gib eine Uhrzeit ein, z. B. 9:00.');
    if ((timeKind === 'until' || timeKind === 'range') && !TIME.test(until.trim())) return untilField.nudge('Gib eine Uhrzeit ein, z. B. 18:00.');
  };

  return (
    <SubScreen
      title="Erinnerung bearbeiten"
      navigation="close"
      onLeadingPress={goBack}
      actions={reminder ? <Button label="Speichern" onPress={save} busy={busy} disabled={!ready} whyDisabled={whyDisabled} /> : undefined}
    >
      {reminder === undefined ? (
        <ActivityIndicator color={color.text.secondary} />
      ) : reminder === null ? (
        <Notice variant="warning" message="Diese Erinnerung gibt es nicht mehr." />
      ) : (
        <>
          <TextField label="Ich will …" placeholder="joggen gehen" value={want} onChangeText={setWant} maxLength={60} required nudge={wantField} />
          <TextField label="Beschreibung" value={description} onChangeText={setDescription} maxLength={500} multiline />
          <ReminderExtrasFields value={extras} onChange={setExtras} />
          {once ? (
            <>
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
            </>
          ) : fixedDays ? (
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
          ) : null}
          {failed ? <Notice variant="warning" message="Speichern hat nicht geklappt. Versuch es bitte noch einmal." /> : null}
        </>
      )}
    </SubScreen>
  );
}

