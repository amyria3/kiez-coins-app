import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';

import { Button } from '../../../components/Button';
import { FieldGroup, Notice } from '../../../components/Content';
import { Chip, ChipGroup, choosePhoto, TextField } from '../../../components/Form';
import { useNudge } from '../../../components/Nudge';
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
  // Grauer Button zeigt aufs erste Feld, das noch fehlt (Daria, 2026-11-13)
  const titleField = useNudge();
  const dateField = useNudge();
  const fromField = useNudge();
  const untilField = useNudge();
  const whyDisabled = () => {
    if (busy) return;
    if (!title.trim()) return titleField.nudge('Gib einen Titel ein.');
    if (!onDate) return dateField.nudge('Gib ein Datum ein, z. B. 24.12.');
    if (!fromOk) return fromField.nudge('Gib eine Uhrzeit ein, z. B. 19:00.');
    if (!untilOk) return untilField.nudge('Bitte so: 22:00');
  };

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
    <SubScreen title="Termin erstellen" navigation="back" onLeadingPress={goBack} actions={<Button label="Termin erstellen" busy={busy} disabled={!ready} whyDisabled={whyDisabled} onPress={save} />}>
      <Pressable onPress={() => choosePhoto(setImage, { title: 'Bild zum Termin' })} accessibilityRole="button" accessibilityLabel={t('Bild wählen')} style={styles.image}>
        {image ? <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
          <>
            <Icon name="camera" />
            <Text style={styles.meta}>Bild hinzufügen (optional)</Text>
          </>
        )}
      </Pressable>
      <TextField label="Titel" required value={title} onChangeText={setTitle} maxLength={80} placeholder="Flohmarkt im Hof" nudge={titleField} />
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
            placeholder="Datum im Format 01.01. oder 01.01.2001"
            keyboardType="numbers-and-punctuation"
            nudge={dateField}
            error={!date.trim() || parseDate(date) ? undefined : 'Bitte so: 01.01. oder 01.01.2001'}
          />
        ) : null}
        <View style={styles.times}>
          <View style={styles.flex}>
            <TextField
              label="Beginn"
              required
              value={from}
              onChangeText={setFrom}
              placeholder="Format 19:00"
              keyboardType="numbers-and-punctuation"
              nudge={fromField}
              error={!from.trim() || fromOk ? undefined : 'Bitte so: 19:00'}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label="Ende"
              value={until}
              onChangeText={setUntil}
              placeholder="Format 22:00"
              keyboardType="numbers-and-punctuation"
              nudge={untilField}
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
    borderRadius: radius.md,
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
