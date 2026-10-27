import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { ExtraPhotos, PhotoPicker } from '../../../components/Form';
import { TagTextField } from '../../../components/compose/BeforeAfterForm';
import { PHOTO_TAG } from '../../../components/WithMentions';
import { TypeSwitch } from '../../../components/compose/TypeSwitch';
import { Text } from '../../../components/T';
import { color, text } from '../../../theme/tokens';
import { SubScreen } from '../../../components/Screen';
import { hasContent, useDraft, useSaveDraft } from './_layout';
import { explain } from '../../../components/Nudge';
import { t } from '../../../data/texts';
import { useFeatures } from '../../../data/features';
import { useGoBack } from '../../../lib/goBack';

/** Entwürfe aus „Deine Challenges“: Challenge oder Bild. Vorher-Nachher hat einen eigenen Ablauf. */
const TYPES = [
  { key: 'individual', label: 'We-Challenge' },
  { key: 'photo', label: 'Bild' },
] as const;

/** Route `challenge/create/step-1`. Figma: `challenge/create/step-1`. */
export default function CreateStep1() {
  const router = useRouter();
  const goBack = useGoBack();
  const [draft, setDraft] = useDraft();
  const [showErrors, setShowErrors] = useState(false);
  const { save, busy } = useSaveDraft();
  // Schalter aus „Dein Konto › Funktionen“; der Typ des Entwurfs bleibt immer wählbar
  const on = useFeatures();
  const types = TYPES.filter((o) => o.key === draft.type || (o.key === 'photo' ? on.photo : on.we));
  // Neuer Entwurf: startet mit einem angeschalteten Typ
  useEffect(() => {
    if (draft.id) return;
    if (draft.type === 'individual' && !on.we && on.photo) setDraft((d) => ({ ...d, type: 'photo', bountyAmount: undefined }));
    if (draft.type === 'photo' && !on.photo && on.we) setDraft((d) => ({ ...d, type: 'individual' }));
  }, [draft.id, draft.type, on.we, on.photo, setDraft]);

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
    if (!hasContent(draft)) return goBack();
    Alert.alert('Als Entwurf speichern?', 'Du kannst die Challenge später in „Deine Challenges“ fertigstellen.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Verwerfen', style: 'destructive', onPress: () => goBack() },
      { text: 'Speichern', onPress: save },
    ]);
  };

  return (
    <SubScreen
      title={draft.id ? 'Entwurf bearbeiten' : isChallenge ? 'Challenge erstellen' : 'Bild posten'}
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
            whyDisabled={() => !busy && explain('Noch nichts zu speichern', 'Füge ein Foto hinzu oder gib einen Titel ein, dann lässt sich der Entwurf speichern.')}
          />
        </>
      }
    >
      {/* Challenge oder nur ein Bild (Daria, 22.10.2026). Ein Bild hat keine Coins und lässt sich nicht annehmen. */}
      {types.length > 1 ? <TypeSwitch
        options={types}
        value={draft.type}
        onChange={(type) => setDraft((d) => ({ ...d, type, bountyAmount: type === 'individual' ? d.bountyAmount : undefined }))}
      /> : null}
      <Text style={styles.hint}>
        {isChallenge ? 'Hier gibt es etwas zu tun! Zu den Spaten! Zu den Müllsäcken!' : 'Hier ist nichts zu tun, nur ein schönes Bild.'}
      </Text>
      <PhotoPicker
        photo={draft.photo}
        error={showErrors && missingPhoto}
        hint={showErrors && missingPhoto ? 'Bitte ein Foto hinzufügen.' : isChallenge ? 'Zeige, wo geholfen werden soll.' : 'Zeige Deinem Kiez, was Dir gefällt.'}
        onChange={(photo) => setDraft((d) => ({ ...d, photo, imagePath: undefined }))}
        title={{
          value: draft.title,
          onChange: (title) => setDraft((d) => ({ ...d, title })),
          error: showErrors && missingTitle ? 'Gib einen Titel ein.' : undefined,
        }}
      />
      {draft.photo ? (
        <ExtraPhotos
          photos={draft.extras.map((e) => e.photo)}
          onAdd={(photo) => setDraft((d) => ({ ...d, extras: [...d.extras, { photo }].slice(0, 2) }))}
          onRemove={(index) => setDraft((d) => ({ ...d, extras: d.extras.filter((_, i) => i !== index) }))}
        />
      ) : null}
      {/* We-Challenge: Die Beschreibung ist das Vorher (Daria, 27.10.2026). Bild: #InDiesemMoment */}
      <TagTextField
        label="Beschreibung"
        tag={isChallenge ? '#vorher' : PHOTO_TAG}
        placeholder={isChallenge ? 'Was ist hier zu tun?' : undefined}
        value={draft.text}
        onChangeText={(text) => setDraft((d) => ({ ...d, text }))}
        maxLength={500}
      />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  hint: { ...text.body, fontSize: 14, lineHeight: 19, color: color.text.secondary },
});
