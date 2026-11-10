import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { FieldGroup, Notice } from '../../components/Content';
import { Chip, ChipGroup, TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { Text } from '../../components/T';
import { WEEKDAYS } from '../../data/katerRoutine';
import { createReminder } from '../../data/reminders';
import { useGoBack } from '../../lib/goBack';
import { color, text } from '../../theme/tokens';

const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;

/**
 * Route `routine/new` (Daria, 2026-11-10): Erinnerung anlegen. Titel nach „Ich will …“, damit der Kater ihn in
 * seine Sätze einbauen kann. Ziel x-mal pro Woche oder an festen Tagen, optional mit Uhrzeit.
 */
export default function NewReminder() {
  const goBack = useGoBack();
  const router = useRouter();
  const [want, setWant] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'week' | 'days'>('week');
  const [perWeek, setPerWeek] = useState(3);
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const timeOk = !time.trim() || TIME.test(time.trim());
  const ready = want.trim().length > 0 && (mode === 'week' || days.length > 0) && timeOk;

  const save = async () => {
    setBusy(true);
    setFailed(false);
    const ok = await createReminder({
      want: want.trim().replace(/^ich will\s+/i, ''),
      description,
      perWeek: mode === 'week' ? perWeek : undefined,
      weekdays: mode === 'days' ? days : undefined,
      atTime: mode === 'days' && time.trim() ? time.trim().padStart(5, '0') : undefined,
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
      <TextField
        label="Beschreibung"
        helperText="Optional. Postest Du nach dem Erledigen eine Me-Challenge, steht sie dort als Vorher-Text."
        value={description}
        onChangeText={setDescription}
        maxLength={500}
        multiline
      />
      <FieldGroup label="Wie oft?">
        <ChipGroup>
          <Chip label="x-mal pro Woche" selected={mode === 'week'} onPress={() => setMode('week')} />
          <Chip label="An festen Tagen" selected={mode === 'days'} onPress={() => setMode('days')} />
        </ChipGroup>
      </FieldGroup>
      {mode === 'week' ? (
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
                <Chip key={d} label={d} selected={days.includes(i + 1)} onPress={() => toggleDay(i + 1)} />
              ))}
            </ChipGroup>
          </FieldGroup>
          <TextField
            label="Uhrzeit"
            helperText="Optional, z. B. 18:00"
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
      <Text style={styles.private}>Nur Du und der Kater wissen davon. Er kann schweigen. Meistens.</Text>
      {failed ? <Notice variant="warning" message="Speichern hat nicht geklappt. Versuch es bitte noch einmal." /> : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  private: { ...text.caption, color: color.text.secondary },
});
