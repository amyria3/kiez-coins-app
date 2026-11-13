import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { Notice } from '../../components/Content';
import { Chip, ChipGroup, TextField } from '../../components/Form';
import { useNudge } from '../../components/Nudge';
import { ReminderExtrasFields, type Extras } from '../../components/ReminderExtras';
import { SubScreen } from '../../components/Screen';
import { loadReminders, parseDate, TIME, updateReminder, type Reminder } from '../../data/reminders';
import { useGoBack } from '../../lib/goBack';
import { color, space } from '../../theme/tokens';
import { MeSpaceScreen } from '../../theme/signal';

type TimeKind = 'until' | 'at' | 'range';

/** „2026-11-13“ → „13.11.2026“, so wie das Datumsfeld es erwartet */
const dotted = (iso: string) => iso.split('-').reverse().join('.');
const hhmm = (v: string) => v.trim().padStart(5, '0');

/**
 * Route `routine/bearbeiten?id=…` (Daria, 2026-11-13): Erinnerung bearbeiten. Öffnet über das Menü der Karte („•••“
 * oder Tippen auf die Karte) › „Bearbeiten“. Titel, Beschreibung, Ort, Telefon, Link, Tag und Zeit mit „bis“ (to), „um“ (around)
 * oder „von … bis“. Feste Tage ändern nur die Uhrzeit, x-mal pro Woche hat keine.
 */
/** Gehört zu „Me & Myself“: gelb wie die Routine (Daria, 2026-11-13) */
export default function EditReminderScreen() {
  return (
    <MeSpaceScreen>
      <EditReminder />
    </MeSpaceScreen>
  );
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
  const [timeKind, setTimeKind] = useState<TimeKind>('until');
  const [from, setFrom] = useState('');
  const [until, setUntil] = useState('');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const wantField = useNudge();
  const dateField = useNudge();
  const fromField = useNudge();
  const untilField = useNudge();
  const timeField = useNudge();

  useEffect(() => {
    loadReminders().then(
      (all) => {
        const r = all?.find((x) => x.id === id) ?? null;
        setReminder(r);
        if (!r) return;
        setWant(r.want);
        setDescription(r.description ?? '');
        setExtras({ place: r.place ?? '', phone: r.phone ?? '', link: r.link ?? '' });
        if (r.onDate) {
          setDate(dotted(r.onDate));
          setTimeKind(r.atTime && r.untilTime ? 'range' : r.atTime ? 'at' : 'until');
          setFrom(r.atTime ?? '');
          setUntil(r.untilTime ?? '');
        } else setTime(r.atTime ?? '');
      },
      () => setReminder(null),
    );
  }, [id]);

  const once = !!reminder?.onDate;
  const fixedDays = !once && !!reminder?.weekdays?.length;
  const onDate = once ? parseDate(date) : null;
  const fromOk = !from.trim() || TIME.test(from.trim());
  const untilOk = !until.trim() || TIME.test(until.trim());
  const timeOk = !time.trim() || TIME.test(time.trim());
  const onceReady =
    !!onDate &&
    (timeKind === 'until' ? TIME.test(until.trim()) : timeKind === 'at' ? TIME.test(from.trim()) : TIME.test(from.trim()) && TIME.test(until.trim()));
  const ready = !!reminder && want.trim().length > 0 && (once ? onceReady : timeOk);

  const save = async () => {
    if (!reminder) return;
    setBusy(true);
    setFailed(false);
    const ok = await updateReminder(reminder, {
      want: want.trim().replace(/^ich will\s+/i, ''),
      description,
      ...extras,
      onDate: onDate ?? undefined,
      atTime: once ? (timeKind !== 'until' ? hhmm(from) : undefined) : fixedDays && time.trim() ? hhmm(time) : undefined,
      untilTime: once && timeKind !== 'at' ? hhmm(until) : undefined,
    });
    setBusy(false);
    if (ok) router.back();
    else setFailed(true);
  };

  const whyDisabled = () => {
    if (busy || !reminder) return;
    if (!want.trim()) return wantField.nudge('Schreib, was Du vorhast.');
    if (once) {
      if (!onDate) return dateField.nudge('Gib ein Datum ein, z. B. 24.12.');
      if (timeKind !== 'until' && !TIME.test(from.trim())) return fromField.nudge('Gib eine Uhrzeit ein, z. B. 9:00.');
      if (timeKind !== 'at' && !TIME.test(until.trim())) return untilField.nudge('Gib eine Uhrzeit ein, z. B. 18:00.');
    } else if (!timeOk) return timeField.nudge('Bitte so: 18:00');
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
                {timeKind !== 'at' ? (
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
            </>
          ) : fixedDays ? (
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
          ) : null}
          {failed ? <Notice variant="warning" message="Speichern hat nicht geklappt. Versuch es bitte noch einmal." /> : null}
        </>
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  times: { flexDirection: 'row', gap: space[12] },
  time: { flex: 1 },
});
