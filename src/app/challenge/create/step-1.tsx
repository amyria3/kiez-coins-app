import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { ExtraPhotos, PhotoPicker, TextField } from '../../../components/Form';
import { SubScreen } from '../../../components/Screen';
import { hasContent, useDraft, useSaveDraft } from './_layout';
import { explain, NudgeArea, useNudge } from '../../../components/Nudge';

/** Route `challenge/create/step-1`. Figma: `challenge/create/step-1`. */
export default function CreateStep1() {
  const router = useRouter();
  const [draft, setDraft] = useDraft();
  const { save, busy } = useSaveDraft();
  const photoField = useNudge();
  const titleField = useNudge();

  const missingPhoto = !draft.photo;
  const missingTitle = !draft.title.trim();

  // Weiter sieht deaktiviert aus, bis Foto und Titel da sind. Tippen zeigt, was fehlt.
  const next = () => router.push('/challenge/create/step-2');

  // Schließen mit Eingaben: als Entwurf behalten oder verwerfen
  const close = () => {
    if (!hasContent(draft)) return router.back();
    Alert.alert('Als Entwurf speichern?', 'Du kannst die Challenge später in „Deine Challenges“ fertig machen.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Verwerfen', style: 'destructive', onPress: () => router.back() },
      { text: 'Speichern', onPress: save },
    ]);
  };

  return (
    <SubScreen
      title={draft.id ? 'Entwurf bearbeiten' : 'Challenge erstellen'}
      subtitle="Schritt 1 von 2"
      navigation="close"
      onLeadingPress={close}
      actions={
        <>
          <Button label="Weiter" onPress={next} disabled={missingPhoto || missingTitle}
            whyDisabled={() => (missingPhoto ? photoField.nudge('Füg ein Foto hinzu.') : titleField.nudge('Gib einen Titel ein.'))}
          />
          <Button busy={busy}
            label={busy ? 'Wird gespeichert …' : 'Als Entwurf speichern'}
            variant="ghost"
            onPress={save}
            disabled={busy || !hasContent(draft)}
            whyDisabled={() => !busy && explain('Noch nichts zu speichern', 'Füg ein Foto hinzu oder gib einen Titel ein, dann lässt sich der Entwurf speichern.')}
          />
        </>
      }
    >
      <NudgeArea nudge={photoField}>
        <PhotoPicker
          photo={draft.photo}
          hint="Zeig, wo geholfen werden soll."
          onChange={(photo) => (photoField.clear(), setDraft((d) => ({ ...d, photo, imagePath: undefined })))}
        />
      </NudgeArea>
      {draft.photo ? (
        <ExtraPhotos
          photos={draft.extras.map((e) => e.photo)}
          onAdd={(photo) => setDraft((d) => ({ ...d, extras: [...d.extras, { photo }].slice(0, 2) }))}
          onRemove={(index) => setDraft((d) => ({ ...d, extras: d.extras.filter((_, i) => i !== index) }))}
        />
      ) : null}
      <TextField
        label="Titel" required
        helperText="Max. 60 Zeichen"
        nudge={titleField}
        value={draft.title}
        onChangeText={(title) => setDraft((d) => ({ ...d, title }))}
        maxLength={60}
      />
      <TextField
        label="Beschreibung"
        helperText="Max. 500 Zeichen"
        value={draft.text}
        onChangeText={(text) => setDraft((d) => ({ ...d, text }))}
        maxLength={500}
        multiline
      />
    </SubScreen>
  );
}
