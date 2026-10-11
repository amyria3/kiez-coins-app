import { useState } from 'react';
import { useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { PhotoPicker, TextField } from '../../../components/Form';
import { SubScreen } from '../../../components/Screen';
import { useDraft } from './_layout';

/** Route `challenge/create/step-1`. Figma: `challenge/create/step-1`. */
export default function CreateStep1() {
  const router = useRouter();
  const [draft, setDraft] = useDraft();
  const [showErrors, setShowErrors] = useState(false);

  const missingPhoto = !draft.photo;
  const missingTitle = !draft.title.trim();

  const next = () => {
    if (missingPhoto || missingTitle) {
      setShowErrors(true);
      return;
    }
    router.push('/challenge/create/step-2');
  };

  return (
    <SubScreen
      title="Challenge erstellen"
      subtitle="Schritt 1 von 2"
      navigation="close"
      onLeadingPress={() => router.dismissTo('/feed')}
      actions={<Button label="Weiter" onPress={next} />}
    >
      <PhotoPicker
        photo={draft.photo}
        hint={showErrors && missingPhoto ? 'Bitte füge ein Foto hinzu.' : 'Zeig, wo geholfen werden soll.'}
        onChange={(photo) => setDraft((d) => ({ ...d, photo }))}
      />
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
