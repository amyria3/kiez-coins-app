import { useState, type ReactNode } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { useStore } from '../../data/store';
import type { ImageSource } from '../../data/types';
import { color, text } from '../../theme/tokens';
import { Button } from '../Button';
import { FieldGroup } from '../Content';
import { Chip, ChipGroup, ExtraPhotos, PhotoPicker, TextField } from '../Form';
import { celebratePost } from '../HeartBurst';
import { explain } from '../Nudge';
import { Text } from '../T';
import { useComposeContent, type ComposeContent } from './compose';

const durations = [
  { days: 1, label: '1 Tag' },
  { days: 3, label: '3 Tage' },
  { days: 7, label: '1 Woche' },
  { days: 30, label: '1 Monat' },
];

/**
 * Bild in einer Gruppe (Daria, 27.10.2026): ein schönes Bild ohne Aufgabe, ohne Edensteine, ohne Ort.
 * Nur die Mitglieder der Gruppe sehen es (Policy „Challenges lesen“). Geht direkt raus, ohne Entwurf,
 * wie die Gruppenaufgabe.
 */
export function useGroupPhotoForm(
  groupId: string | undefined,
  onCreated: (id: string) => void,
  shared?: ComposeContent,
): { fields: ReactNode; button: ReactNode } {
  const { groups, groupApi } = useStore();
  const group = groups.find((g) => g.id === groupId);
  const own = useComposeContent();
  const { photo, setPhoto, title, setTitle, text: body, setText: setBody } = shared ?? own;
  const [extras, setExtras] = useState<ImageSource[]>([]);
  const [days, setDays] = useState(7);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const missingPhoto = !photo;
  const missingTitle = !title.trim();

  const publish = async () => {
    if (!group) return;
    if (missingPhoto || missingTitle) {
      setShowErrors(true);
      return;
    }
    setBusy(true);
    try {
      const id = await groupApi.createTask({
        groupId: group.id,
        type: 'photo',
        title,
        text: body,
        deadline: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
        photo,
        extras: extras.map((p) => ({ photo: p })),
      });
      celebratePost();
      onCreated(id);
    } catch (error) {
      Alert.alert('Bild nicht gepostet', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fields = (
    <>
      <Text style={styles.hint}>Hier ist nichts zu tun, nur ein schönes Bild für Eure Gruppe.</Text>
      <PhotoPicker
        photo={photo}
        error={showErrors && missingPhoto}
        hint={showErrors && missingPhoto ? 'Bitte ein Foto hinzufügen.' : 'Zeige Deiner Gruppe, was Dir gefällt.'}
        onChange={setPhoto}
        title={{ value: title, onChange: setTitle, error: showErrors && missingTitle ? 'Gib einen Titel ein.' : undefined }}
      />
      {photo ? (
        <ExtraPhotos
          photos={extras}
          onAdd={(p) => setExtras((all) => [...all, p].slice(0, 2))}
          onRemove={(index) => setExtras((all) => all.filter((_, i) => i !== index))}
        />
      ) : null}
      <TextField label="Dein Text" helperText="Max. 500 Zeichen" value={body} onChangeText={setBody} maxLength={500} multiline />
      <FieldGroup label="Zeitraum">
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
      label={busy ? 'Wird gepostet …' : 'Bild posten'}
      onPress={publish}
      disabled={busy || !group}
      whyDisabled={() =>
        busy ? undefined : explain('Gruppe nicht gefunden', 'Diese Gruppe gibt es nicht mehr, oder Du bist nicht mehr dabei.')
      }
    />
  );

  return { fields, button };
}

const styles = StyleSheet.create({
  hint: { ...text.body, fontSize: 14, lineHeight: 19, color: color.text.secondary },
});
