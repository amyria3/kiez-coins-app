import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';

import { Button } from '../../../components/Button';
import { FieldGroup, Notice } from '../../../components/Content';
import { Chip, ChipGroup, choosePhoto, TextField } from '../../../components/Form';
import { SubScreen } from '../../../components/Screen';
import { Text } from '../../../components/T';
import { Icon } from '../../../components/icons/Icon';
import { addDays, localDate, parseDate, TIME } from '../../../data/reminders';
import { createEvent } from '../../../data/showcase';
import { useStore } from '../../../data/store';
import { t } from '../../../data/texts';
import type { ImageSource } from '../../../data/types';
import { useGoBack } from '../../../lib/goBack';
import { color, radius, space, text } from '../../../theme/tokens';

/** „2026-11-12“ und „19:00“ → Date in Ortszeit */
const at = (date: string, time: string) => {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min);
};

/**
 * Route `schaufenster/[id]/termin` (Daria, 2026-11-10): Termin mit Titel, Bild, Beginn, Ende, Ort und Text.
 * Datum wie bei Erinnerungen: Heute, Morgen oder ein Datum.
 */
export default function NewShowcaseEvent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack();
  const { currentUserId } = useStore();
  const [title, setTitle] = useState('');
  const [image, setImage] = useState<ImageSource | undefined>();
  const [day, setDay] = useState<'today' | 'tomorrow' | 'other'>('other');
  const [date, setDate] = useState('');
  const [from, setFrom] = useState('');
  const [until, setUntil] = useState('');
  const [location, setLocation] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const onDate = day === 'today' ? localDate() : day === 'tomorrow' ? localDate(addDays(1)) : parseDate(date);
  const fromOk = TIME.test(from.trim());
  const untilOk = !until.trim() || TIME.test(until.trim());
  const start = onDate && fromOk ? at(onDate, from.trim()) : null;
  // Ende vor dem Beginn: Der Termin geht über Mitternacht
  const end = start && until.trim() && untilOk ? (() => {
    const e = at(onDate!, until.trim());
    return e <= start ? addDays(1, e) : e;
  })() : undefined;
  const ready = !!title.trim() && !!start && untilOk;

  const save = async () => {
    if (!start) return;
    setBusy(true);
    setFailed(null);
    try {
      await createEvent(id, currentUserId, { title, body, image, startsAt: start, endsAt: end, location });
      goBack();
    } catch (error) {
      setFailed((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SubScreen title="Termin erstellen" navigation="back" onLeadingPress={goBack} actions={<Button label="Termin erstellen" busy={busy} disabled={!ready} onPress={save} />}>
      <Pressable onPress={() => choosePhoto(setImage, { title: 'Bild zum Termin' })} accessibilityRole="button" accessibilityLabel={t('Bild wählen')} style={styles.image}>
        {image ? <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
          <>
            <Icon name="camera" />
            <Text style={styles.meta}>Bild hinzufügen (optional)</Text>
          </>
        )}
      </Pressable>
      <TextField label="Titel" required value={title} onChangeText={setTitle} maxLength={80} placeholder="Flohmarkt im Hof" />
      <FieldGroup label="Wann?">
        <ChipGroup>
          <Chip label="Heute" selected={day === 'today'} onPress={() => setDay('today')} />
          <Chip label="Morgen" selected={day === 'tomorrow'} onPress={() => setDay('tomorrow')} />
          <Chip label="Datum" selected={day === 'other'} onPress={() => setDay('other')} />
        </ChipGroup>
        {day === 'other' ? (
          <TextField
            label="Datum"
            value={date}
            onChangeText={setDate}
            placeholder="24.12."
            keyboardType="numbers-and-punctuation"
            error={!date.trim() || parseDate(date) ? undefined : 'Bitte so: 24.12.'}
          />
        ) : null}
        <View style={styles.times}>
          <View style={styles.flex}>
            <TextField
              label="Beginn"
              required
              value={from}
              onChangeText={setFrom}
              placeholder="19:00"
              keyboardType="numbers-and-punctuation"
              error={!from.trim() || fromOk ? undefined : 'Bitte so: 19:00'}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label="Ende"
              value={until}
              onChangeText={setUntil}
              placeholder="22:00"
              keyboardType="numbers-and-punctuation"
              error={untilOk ? undefined : 'Bitte so: 22:00'}
            />
          </View>
        </View>
      </FieldGroup>
      <TextField label="Ort" value={location} onChangeText={setLocation} maxLength={160} placeholder="Hinterhof, Karl-Liebknecht-Str. 1" />
      <TextField label="Text" multiline value={body} onChangeText={setBody} maxLength={1000} />
      {failed ? <Notice variant="warning" message={failed} /> : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: color.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[8],
  },
  meta: { ...text.caption, color: color.text.secondary },
  times: { flexDirection: 'row', gap: space[12] },
  flex: { flex: 1 },
});
