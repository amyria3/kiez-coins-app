import { useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useStore } from '../../data/store';
import { t } from '../../data/texts';
import type { ImageSource } from '../../data/types';
import { color, radius, size, space, text } from '../../theme/tokens';
import { Button } from '../Button';
import { FieldGroup } from '../Content';
import { Chip, ChipGroup, PhotoPicker, TextField } from '../Form';
import { LivingCrystal } from '../icons/Brand';
import { Icon } from '../icons/Icon';
import { explain, useNudge } from '../Nudge';
import { Text } from '../T';

const durations = [
  { days: 1, label: '1 Tag' },
  { days: 3, label: '3 Tage' },
  { days: 7, label: '1 Woche' },
  { days: 30, label: '1 Monat' },
];

type Initial = { photo?: ImageSource; title?: string; text?: string; edensteine?: number };

/**
 * Gruppenaufgabe mit 1 bis 10 Edensteinen: Felder und Button „Aufgabe veröffentlichen“.
 * Genutzt in der Route `gruppen/[id]/aufgabe` und im Erstellen-Blatt über dem Feed.
 */
export function useGroupTaskForm(groupId: string | undefined, initial: Initial, onCreated: (taskId: string) => void): {
  fields: ReactNode;
  button: ReactNode;
} {
  const { groups, groupApi } = useStore();
  const group = groups.find((g) => g.id === groupId);
  const [photo, setPhoto] = useState<ImageSource | undefined>(initial.photo);
  const [title, setTitle] = useState(initial.title ?? '');
  const [body, setBody] = useState(initial.text ?? '');
  const [edensteine, setEdensteine] = useState(initial.edensteine ?? 3);
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
      onCreated(taskId);
    } catch (error) {
      Alert.alert('Aufgabe konnte nicht erstellt werden', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const step = (delta: number) => setEdensteine((n) => Math.min(10, Math.max(1, n + delta)));

  const fields = (
    <>
      <PhotoPicker
        photo={photo}
        hint="Optional. Zeige, worum es geht."
        onChange={setPhoto}
        title={{ value: title, onChange: setTitle, nudge: titleField }}
      />
      <TextField label="Beschreibung" helperText="Max. 500 Zeichen" value={body} onChangeText={setBody} maxLength={500} multiline />
      <FieldGroup label="Edensteine">
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Ein Edenstein weniger')}
            onPress={() => step(-1)}
            disabled={edensteine <= 1}
            style={[styles.stepButton, edensteine <= 1 && styles.disabled]}
          >
            <Icon name="minus" size={STEP_ICON} color={color.text.primary} />
          </Pressable>
          <View style={styles.value} accessible accessibilityLabel={t('{edensteine} Edensteine', { edensteine })}>
            {/* Ein einzelner, lebendiger Edenstein statt des Haufens (Daria, 22.10.2026) */}
            <View style={styles.crystal}>
              <View style={styles.crystalFloat}>
                <LivingCrystal height={48} seed="neue-aufgabe" />
              </View>
            </View>
            <Text style={styles.valueText}>{edensteine}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Ein Edenstein mehr')}
            onPress={() => step(1)}
            disabled={edensteine >= 10}
            style={[styles.stepButton, edensteine >= 10 && styles.disabled]}
          >
            <Icon name="plus" size={STEP_ICON} color={color.text.primary} />
          </Pressable>
        </View>
        <Text style={styles.hint}>1 bis 10. Edensteine gelten nur in dieser Gruppe und haben so viel ideellen Wert, wie Ihr ihnen zusprecht.</Text>
      </FieldGroup>
      <FieldGroup label="Frist">
        <ChipGroup>
          {durations.map((d) => (
            <Chip key={d.days} label={d.label} selected={days === d.days} onPress={() => setDays(d.days)} />
          ))}
        </ChipGroup>
      </FieldGroup>
    </>
  );

  const button = (
    <Button
      busy={busy}
      label={busy ? 'Wird erstellt …' : 'Aufgabe veröffentlichen'}
      onPress={publish}
      disabled={busy || !group || !title.trim()}
      whyDisabled={() =>
        busy
          ? undefined
          : !group
            ? explain('Gruppe nicht gefunden', 'Diese Gruppe gibt es nicht mehr, oder Du bist nicht mehr dabei.')
            : titleField.nudge('Gib der Aufgabe einen Titel.')
      }
    />
  );

  return { fields, button };
}

/** Plus und Minus kleiner als die Hauptsymbole (Daria, 24.10.2026) */
const STEP_ICON = 14;

const styles = StyleSheet.create({
  crystal: { width: 30, height: 30, alignItems: 'center' },
  crystalFloat: { position: 'absolute', top: (30 - 48) / 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bg.surface,
  },
  disabled: { opacity: 0.4 },
  value: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[8] },
  // Zahl in Textfarbe, damit sie neben dem bunten Stein ruhig bleibt (Daria, 24.10.2026)
  valueText: { ...text.metric, color: color.text.primary },
  hint: { ...text.caption, color: color.text.secondary },
});
