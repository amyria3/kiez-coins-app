import { useState, type ReactNode } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { useStore } from '../../data/store';
import type { Challenge, ExtraPhoto, ImageSource } from '../../data/types';
import { color, text } from '../../theme/tokens';
import { Button } from '../Button';
import { FieldGroup } from '../Content';
import { Chip, ChipGroup, ExtraPhotos, PhotoPicker } from '../Form';
import { celebratePost } from '../HeartBurst';
import { explain } from '../Nudge';
import { Text } from '../T';
import { SheetEditor, pagesText } from '../TextSheets';
import { PHOTO_TAG } from '../WithMentions';
import { TagTextField } from './BeforeAfterForm';
import { useComposeContent, type ComposeContent } from './compose';
import { draftPhoto, GroupDraftButton } from './GroupTaskForm';

const durations = [
  { days: 1, label: '1 Tag' },
  { days: 3, label: '3 Tage' },
  { days: 7, label: '1 Woche' },
  { days: 30, label: '1 Monat' },
];

/**
 * Bild in einer Gruppe (Daria, 27.10.2026): ein schönes Bild ohne Aufgabe, ohne Edensteine, ohne Ort.
 * Nur die Mitglieder der Gruppe sehen es (Policy „Challenges lesen“).
 * Lässt sich als Entwurf speichern; mit `draft` bearbeitet das Formular einen Entwurf (Daria, 30.10.2026).
 */
export function useGroupPhotoForm(
  groupId: string | undefined,
  onCreated: (id: string) => void,
  shared: ComposeContent | undefined,
  onSaved: () => void,
  draft?: Challenge,
  /** Post nur mit Text: Blätter statt Foto (Daria, 07.11.2026) */
  textOnly = false,
): { fields: ReactNode; button: ReactNode } {
  const { groups, groupApi, saveDraft, publishDraft } = useStore();
  const group = groups.find((g) => g.id === groupId);
  const own = useComposeContent();
  const { photo, setPhoto, title, setTitle, text: body, setText: setBody } = shared ?? own;
  // Zusatzfotos eines Entwurfs behalten ihren Pfad
  // Im Blatt über dem Feed geteilt (Daria, 07.11.2026); ein Entwurf hält sie selbst
  const [ownExtras, setOwnExtras] = useState<ExtraPhoto[]>(draft?.type === 'photo' ? (draft.extraImages ?? []) : []);
  const extras = (!draft && shared?.extras) || ownExtras;
  const setExtras = (!draft && shared?.setExtras) || setOwnExtras;
  const [days, setDays] = useState(7);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState<'publish' | 'save' | undefined>();
  const [ownPages, setOwnPages] = useState<string[]>(draft?.pages ?? ['']);
  const pages = (!draft && shared?.pages) || ownPages;
  const setPages = (!draft && shared?.setPages) || setOwnPages;
  const [ownFont, setOwnFont] = useState<string>(draft?.sheetFont ?? 'inter');
  const sheetFont = (!draft && shared?.sheetFont) || ownFont;
  const setSheetFont = (!draft && shared?.setSheetFont) || setOwnFont;
  const missingPhoto = textOnly ? !pagesText(pages) : !photo;
  const hasContent = textOnly ? !!title.trim() || !!pagesText(pages) : !!photo || extras.length > 0 || !!title.trim() || !!body.trim();

  const input = () =>
    textOnly
      ? { groupId, type: 'photo' as const, title, text: '', location: '', pages, sheetFont }
      : { groupId, type: 'photo' as const, title, text: body, location: '', extras, ...draftPhoto(photo, draft) };

  const publish = async () => {
    if (!group) return;
    // Titel freiwillig (Daria, 06.11.2026)
    if (missingPhoto) {
      setShowErrors(true);
      return;
    }
    setBusy('publish');
    try {
      const deadline = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const id = draft
        ? await publishDraft(draft.id, input(), deadline)
        : textOnly
          ? await groupApi.createTask({ groupId: group.id, type: 'photo', title, text: '', deadline, pages, sheetFont })
          : await groupApi.createTask({ groupId: group.id, type: 'photo', title, text: body, deadline, photo, extras });
      celebratePost();
      onCreated(id);
    } catch (error) {
      Alert.alert(textOnly ? 'Text nicht gepostet' : 'Bild nicht gepostet', (error as Error).message);
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

  const fields = textOnly ? (
    <>
      <Text style={styles.hint}>Hier ist nichts zu tun, nur Dein Text für Eure Gruppe.</Text>
      <SheetEditor title={title} onTitleChange={setTitle} pages={pages} onPagesChange={setPages} fontKey={sheetFont} onFontChange={setSheetFont} />
      {showErrors && missingPhoto ? <Text style={styles.error}>Schreib etwas auf das Blatt.</Text> : null}
      <FieldGroup label="Zeitraum">
        <ChipGroup>
          {durations.map((d) => (
            <Chip key={d.days} label={d.label} selected={days === d.days} onPress={() => setDays(d.days)} />
          ))}
        </ChipGroup>
      </FieldGroup>
    </>
  ) : (
    <>
      <Text style={styles.hint}>Hier ist nichts zu tun, nur ein schönes Bild für Eure Gruppe.</Text>
      <PhotoPicker
        photo={photo}
        error={showErrors && missingPhoto}
        hint={showErrors && missingPhoto ? 'Bitte ein Foto hinzufügen.' : 'Zeige Deiner Gruppe, was Dir gefällt.'}
        onChange={setPhoto}
        title={{ value: title, onChange: setTitle, optional: true }}
      />
      {photo ? (
        <ExtraPhotos
          photos={extras.map((e) => e.photo)}
          onAdd={(p) => setExtras((all) => [...all, { photo: p }].slice(0, 2))}
          onRemove={(index) => setExtras((all) => all.filter((_, i) => i !== index))}
        />
      ) : null}
      {/* Wie beim Bild im Kiez: #InDiesemMoment fest vorn (Daria, 07.11.2026) */}
      <TagTextField label="Dein Text" tag={PHOTO_TAG} value={body} onChangeText={setBody} maxLength={500} />
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
    <>
      <Button
        busy={busy === 'publish'}
        label={busy === 'publish' ? 'Wird gepostet …' : textOnly ? 'Text posten' : 'Bild posten'}
        onPress={publish}
        disabled={!!busy || !group}
        whyDisabled={() =>
          busy ? undefined : explain('Gruppe nicht gefunden', 'Diese Gruppe gibt es nicht mehr, oder Du bist nicht mehr dabei.')
        }
      />
      <GroupDraftButton busy={busy === 'save'} disabled={!!busy || !group || !hasContent} onPress={save} />
    </>
  );

  return { fields, button };
}

const styles = StyleSheet.create({
  hint: { ...text.hint, color: color.text.secondary },
  error: { ...text.hint, color: color.accent.error },
});
