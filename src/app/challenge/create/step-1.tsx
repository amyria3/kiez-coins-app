import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { ExtraPhotos, PhotoPicker, TextField } from '../../../components/Form';
import { SubScreen } from '../../../components/Screen';
import { hasContent, useDraft, useSaveDraft } from './_layout';

/** Route `challenge/create/step-1`. Figma: `challenge/create/step-1`. */
export default function CreateStep1() {
  const router = useRouter();
  const [draft, setDraft] = useDraft();
  const [showErrors, setShowErrors] = useState(false);
  const { save, busy } = useSaveDraft();

  const missingPhoto = !draft.photo;
  const missingTitle = !draft.title.trim();

  const next = () => {
    if (missingPhoto || missingTitle) {
      setShowErrors(true);
      return;
    }
    router.push('/challenge/create/step-2');
  };

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
          <Button label="Weiter" onPress={next} />
          <Button
            label={busy ? 'Wird gespeichert …' : 'Als Entwurf speichern'}
            variant="ghost"
            onPress={save}
            disabled={busy || !hasContent(draft)}
          />
        </>
      }
    >
      <PhotoPicker
        photo={draft.photo}
        hint={showErrors && missingPhoto ? 'Bitte füge ein Foto hinzu.' : 'Zeig, wo geholfen werden soll.'}
        onChange={(photo) => setDraft((d) => ({ ...d, photo, imagePath: undefined }))}
      />
      {draft.photo ? (
        <ExtraPhotos
          photos={draft.extras.map((e) => e.photo)}
          onAdd={(photo) => setDraft((d) => ({ ...d, extras: [...d.extras, { photo }].slice(0, 2) }))}
          onRemove={(index) => setDraft((d) => ({ ...d, extras: d.extras.filter((_, i) => i !== index) }))}
        />
      ) : null}
      <TextField
        label="Titel"
        helperText="Max. 60 Zeichen"
        error={showErrors && missingTitle ? 'Bitte gib einen Titel ein.' : undefined}
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
