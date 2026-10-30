import { useState, type ReactNode } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { useStore } from '../../data/store';
import { t } from '../../data/texts';
import type { Challenge, ImageSource } from '../../data/types';
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

type Initial = { photo?: ImageSource; title?: string; text?: string; edensteine?: number; participation?: Participation };

/** Foto eines Entwurfs: unverändert bleibt sein Pfad, ein neues lädt die App hoch. */
export const draftPhoto = (photo: ImageSource | undefined, draft: Challenge | undefined) =>
  photo && draft?.imagePath && photo === draft.image ? { imagePath: draft.imagePath } : { photo };

/**
 * Gruppenaufgabe mit 1 bis 10 Edensteinen: Felder, Button „We-Challenge veröffentlichen“ und „Als Entwurf speichern“.
 * Genutzt in der Route `groups/[id]/task` und im Erstellen-Blatt über dem Feed.
 * Mit `draft` bearbeitet das Formular einen gespeicherten Entwurf (Daria, 30.10.2026, Migration 20261030000300).
 */
export function useGroupTaskForm(
  groupId: string | undefined,
  initial: Initial,
  onCreated: (taskId: string) => void,
  shared: ComposeContent | undefined,
  onSaved: () => void,
  draft?: Challenge,
): {
  fields: ReactNode;
  button: ReactNode;
} {
  const { groups, groupApi, saveDraft, publishDraft } = useStore();
  const group = groups.find((g) => g.id === groupId);
  const own = useComposeContent(initial);
  const { photo, setPhoto, title, setTitle, text: body, setText: setBody } = shared ?? own;
  const [edensteine, setEdensteine] = useState(initial.edensteine ?? 3);
  const [days, setDays] = useState(7);
  const [participation, setParticipation] = useState<Participation>(initial.participation ?? DEFAULT_PARTICIPATION);
  const [busy, setBusy] = useState<'publish' | 'save' | undefined>();
  const titleField = useNudge();
  const hasContent = !!photo || !!title.trim() || !!body.trim();

  const input = () => ({
    groupId,
    type: 'individual' as const,
    title,
    text: body,
    location: '',
    edensteine,
    participation,
    ...draftPhoto(photo, draft),
  });

  const publish = async () => {
    if (!group) return;
    setBusy('publish');
    try {
      const deadline = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const taskId = draft
        ? await publishDraft(draft.id, input(), deadline)
        : await groupApi.createTask({ groupId: group.id, title, text: body, edensteine, participation, deadline, photo });
      celebratePost();
      onCreated(taskId);
    } catch (error) {
      Alert.alert('We-Challenge konnte nicht erstellt werden', (error as Error).message);
    } finally {
      setBusy(undefined);
    }
  };

  const save = async () => {
    if (!group) return;
    setBusy('save');
    try {
      await saveDraft(draft?.id, input());
      onSaved();
    } catch (error) {
      Alert.alert('Entwurf nicht gespeichert', (error as Error).message);
    } finally {
      setBusy(undefined);
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
    <>
      <Button
        busy={busy === 'publish'}
        label={busy === 'publish' ? 'Wird erstellt …' : 'We-Challenge veröffentlichen'}
        onPress={publish}
        disabled={!!busy || !group || !title.trim()}
        whyDisabled={() =>
          busy
            ? undefined
            : !group
              ? explain('Gruppe nicht gefunden', 'Diese Gruppe gibt es nicht mehr, oder Du bist nicht mehr dabei.')
              : titleField.nudge('Gib der We-Challenge einen Titel.')
        }
      />
      <GroupDraftButton busy={busy === 'save'} disabled={!!busy || !group || !hasContent} onPress={save} />
    </>
  );

  return { fields, button };
}

/** „Als Entwurf speichern“ in Gruppen, wie im Kiez (PublicComposeForm) */
export function GroupDraftButton({ busy, disabled, onPress }: { busy: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <Button
      busy={busy}
      label={busy ? 'Wird gespeichert …' : 'Als Entwurf speichern'}
      variant="ghost"
      onPress={onPress}
      disabled={disabled}
      whyDisabled={() => !busy && explain('Noch nichts zu speichern', 'Füge ein Foto hinzu oder gib einen Titel ein, dann lässt sich der Entwurf speichern.')}
    />
  );
}

const styles = StyleSheet.create({
  hint: { ...text.caption, color: color.text.secondary },
});
