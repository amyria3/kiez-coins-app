import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { FieldGroup } from '../../../components/Content';
import { Chip, ChipGroup, PhotoPicker, TextField } from '../../../components/Form';
import { EdensteinPile } from '../../../components/icons/Brand';
import { Icon } from '../../../components/icons/Icon';
import { SubScreen } from '../../../components/Screen';
import { useStore } from '../../../data/store';
import type { ImageSource } from '../../../data/types';
import { color, radius, size, space, text } from '../../../theme/tokens';
import { explain, useNudge } from '../../../components/Nudge';

const durations = [
  { days: 1, label: '1 Tag' },
  { days: 3, label: '3 Tage' },
  { days: 7, label: '1 Woche' },
  { days: 30, label: '1 Monat' },
];

/**
 * Route `gruppen/[id]/aufgabe`: Gruppenaufgabe mit 1 bis 10 Edensteinen. Foto optional, kein Ort, kein Entwurf.
 * Mit `copyOf` (aus „Deine Challenges“, „Kopie erstellen“) startet sie mit Foto, Titel, Text und Edensteinen einer alten Aufgabe.
 */
export default function NewGroupTask() {
  const { id, copyOf } = useLocalSearchParams<{ id: string; copyOf?: string }>();
  const router = useRouter();
  const { groups, groupApi, challenges } = useStore();
  const group = groups.find((g) => g.id === id);
  const original = copyOf ? challenges.find((c) => c.id === copyOf) : undefined;
  const [photo, setPhoto] = useState<ImageSource | undefined>(original?.image);
  const [title, setTitle] = useState(original?.title ?? '');
  const [body, setBody] = useState(original?.text ?? '');
  const [edensteine, setEdensteine] = useState(original?.edensteine ?? 3);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const titleField = useNudge();

  const publish = async () => {
    if (!group) return;
    setBusy(true);
    try {
      const taskId = await groupApi.createTask({
        groupId: group.id,
        title,
        text: body,
        edensteine,
        deadline: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
        photo,
      });
      router.replace(`/challenge/${taskId}`);
    } catch (error) {
      Alert.alert('Aufgabe nicht erstellt', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const step = (delta: number) => setEdensteine((n) => Math.min(10, Math.max(1, n + delta)));

  return (
    <SubScreen
      title="Aufgabe erstellen"
      subtitle={group?.name}
      navigation="close"
      onLeadingPress={() => router.back()}
      actions={
        <Button
          label={busy ? 'Wird erstellt …' : 'Aufgabe veröffentlichen'}
          onPress={publish}
          disabled={busy || !group || !title.trim()}
          whyDisabled={() => (busy ? undefined : !group ? explain('Gruppe nicht gefunden', 'Diese Gruppe gibt es nicht mehr, oder Du bist nicht mehr dabei.') : titleField.nudge('Gib der Aufgabe einen Titel.'))}
        />
      }
    >
      <PhotoPicker photo={photo} hint="Optional. Zeig, worum es geht." onChange={setPhoto} />
      <TextField label="Titel" nudge={titleField} helperText="Max. 60 Zeichen" value={title} onChangeText={setTitle} maxLength={60} />
      <TextField label="Beschreibung" helperText="Max. 500 Zeichen" value={body} onChangeText={setBody} maxLength={500} multiline />
      <FieldGroup label="Edensteine">
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ein Edenstein weniger"
            onPress={() => step(-1)}
            disabled={edensteine <= 1}
            style={[styles.stepButton, edensteine <= 1 && styles.disabled]}
          >
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <View style={styles.value} accessible accessibilityLabel={`${edensteine} Edensteine`}>
            <EdensteinPile height={30} amount={edensteine} />
            <Text style={styles.valueText}>{edensteine}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ein Edenstein mehr"
            onPress={() => step(1)}
            disabled={edensteine >= 10}
            style={[styles.stepButton, edensteine >= 10 && styles.disabled]}
          >
            <Icon name="plus" size={size.icon} color={color.text.primary} />
          </Pressable>
        </View>
        <Text style={styles.hint}>1 bis 10. Edensteine gelten nur in dieser Gruppe und haben keinen Geldwert.</Text>
      </FieldGroup>
      <FieldGroup label="Frist">
        <ChipGroup>
          {durations.map((d) => (
            <Chip key={d.days} label={d.label} selected={days === d.days} onPress={() => setDays(d.days)} />
          ))}
        </ChipGroup>
      </FieldGroup>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bg.surface,
  },
  stepText: { ...text.metric, color: color.text.primary },
  disabled: { opacity: 0.4 },
  value: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[8] },
  valueText: { ...text.display, color: color.accent.confirmation },
  hint: { ...text.caption, color: color.text.secondary },
});
