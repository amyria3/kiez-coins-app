import { useState, type ReactNode } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { useStore } from '../../data/store';
import { t } from '../../data/texts';
import type { ImageSource } from '../../data/types';
import { color, text } from '../../theme/tokens';
import { Button } from '../Button';
import { FieldGroup } from '../Content';
import { Chip, ChipGroup, PhotoPicker } from '../Form';
import { explain, useNudge } from '../Nudge';
import { Text } from '../T';
import { useComposeContent, type ComposeContent } from './compose';
import { TagTextField } from './BeforeAfterForm';
import { EdensteinStepper } from './EdensteinStepper';
import { DEFAULT_PARTICIPATION, ParticipantsField } from './ParticipantsField';
import { MAX_MEMBERS } from '../../data/groups';
import type { Participation } from '../../data/remote';
import { celebratePost } from '../HeartBurst';

const durations = [
  { days: 1, label: '1 Tag' },
  { days: 3, label: '3 Tage' },
  { days: 7, label: '1 Woche' },
  { days: 30, label: '1 Monat' },
];

type Initial = { photo?: ImageSource; title?: string; text?: string; edensteine?: number };

/**
 * Gruppenaufgabe mit 1 bis 10 Edensteinen: Felder und Button „Aufgabe veröffentlichen“.
 * Genutzt in der Route `groups/[id]/task` und im Erstellen-Blatt über dem Feed.
 */
export function useGroupTaskForm(
  groupId: string | undefined,
  initial: Initial,
  onCreated: (taskId: string) => void,
  shared?: ComposeContent,
): {
  fields: ReactNode;
  button: ReactNode;
} {
  const { groups, groupApi } = useStore();
  const group = groups.find((g) => g.id === groupId);
  const own = useComposeContent(initial);
  const { photo, setPhoto, title, setTitle, text: body, setText: setBody } = shared ?? own;
  const [edensteine, setEdensteine] = useState(initial.edensteine ?? 3);
  const [days, setDays] = useState(7);
  const [participation, setParticipation] = useState<Participation>(DEFAULT_PARTICIPATION);
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
        participation,
        deadline: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
        photo,
      });
      celebratePost();
      onCreated(taskId);
    } catch (error) {
      Alert.alert('We-Challenge konnte nicht erstellt werden', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };


  const fields = (
    <>
      <PhotoPicker
        photo={photo}
        hint="Optional. Zeige, worum es geht."
        onChange={setPhoto}
        title={{ value: title, onChange: setTitle, nudge: titleField }}
      />
      <TagTextField label="Beschreibung" tag="#vorher" placeholder="Was ist hier zu tun?" value={body} onChangeText={setBody} maxLength={500} />
      <FieldGroup label="Edensteine">
        <EdensteinStepper value={edensteine} onChange={setEdensteine} seed="neue-aufgabe" />
        <Text style={styles.hint}>1 bis 10. Edensteine gelten nur in dieser Gruppe und haben so viel ideellen Wert, wie Ihr ihnen zusprecht.</Text>
      </FieldGroup>
      {/* Höchstens alle anderen Mitglieder einer vollen Gruppe */}
      <ParticipantsField value={participation} onChange={setParticipation} limit={MAX_MEMBERS - 1} />
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
      label={busy ? 'Wird erstellt …' : 'We-Challenge veröffentlichen'}
      onPress={publish}
      disabled={busy || !group || !title.trim()}
      whyDisabled={() =>
        busy
          ? undefined
          : !group
            ? explain('Gruppe nicht gefunden', 'Diese Gruppe gibt es nicht mehr, oder Du bist nicht mehr dabei.')
            : titleField.nudge('Gib der We-Challenge einen Titel.')
      }
    />
  );

  return { fields, button };
}

const styles = StyleSheet.create({
  hint: { ...text.caption, color: color.text.secondary },
});
