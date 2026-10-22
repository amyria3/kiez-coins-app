import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { ExtraPhotos, PhotoPicker, SwitchRow, TextField } from '../../../components/Form';
import { CreateHeader } from '../../../components/PostTarget';
import { SubScreen } from '../../../components/Screen';
import { hasContent, useDraft, useSaveDraft } from './_layout';
import { explain } from '../../../components/Nudge';
import { t } from '../../../data/texts';

/** Route `challenge/create/step-1`. Figma: `challenge/create/step-1`. */
export default function CreateStep1() {
  const router = useRouter();
  const [draft, setDraft] = useDraft();
  const [showErrors, setShowErrors] = useState(false);
  const { save, busy } = useSaveDraft();

  const isChallenge = draft.type !== 'photo';
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
      title={draft.id ? 'Entwurf bearbeiten' : isChallenge ? 'Challenge erstellen' : 'Bild posten'}
      header={
        <CreateHeader
          line={t('{was} · Schritt 1 von 2', { was: t(draft.id ? 'Entwurf bearbeiten' : isChallenge ? 'Challenge erstellen' : 'Bild posten') })}
          current="public"
          carry={{ title: draft.title, text: draft.text, photo: draft.photo }}
          leading="close"
          onLeadingPress={close}
          locked={!!draft.id}
        />
      }
      subtitle="Schritt 1 von 2"
      navigation="close"
      onLeadingPress={close}
      actions={
        <>
          <Button label="Weiter" onPress={next} />
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
      {/* Challenge oder nur ein Bild (Daria, 22.10.2026). Ein Bild hat keine Coins und lässt sich nicht annehmen. */}
      <SwitchRow
        label={isChallenge ? 'Challenge: Hier muss etwas getan werden! Auf geht’s, Nachbarschaft!' : 'Hier ist nichts zu tun, nur ein schönes Bild'}
        value={isChallenge}
        onValueChange={(on) => setDraft((d) => ({ ...d, type: on ? 'individual' : 'photo', bountyAmount: on ? d.bountyAmount : undefined }))}
      />
      <PhotoPicker
        photo={draft.photo}
        hint={showErrors && missingPhoto ? 'Bitte füge ein Foto hinzu.' : isChallenge ? 'Zeig, wo geholfen werden soll.' : 'Zeig, was Dir gefällt.'}
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
        label="Titel" required
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
