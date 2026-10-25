import { useState, type ReactNode } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { useStore } from '../../data/store';
import type { ImageSource } from '../../data/types';
import { Button } from '../Button';
import { ExtraPhotos, PhotoPicker, TextField } from '../Form';
import { Text } from '../T';
import { explain } from '../Nudge';
import { color, text } from '../../theme/tokens';

const uriOf = (photo?: ImageSource) =>
  typeof photo === 'object' && photo && 'uri' in photo && typeof photo.uri === 'string' ? photo.uri : undefined;

/**
 * Schritt 1 einer öffentlichen Challenge oder eines Bilds im Blatt über dem Feed: Fotos, Titel, Beschreibung.
 * Den Typ wählt der Schalter oben im Blatt (ComposeSheet).
 * „Weiter“ öffnet Schritt 2 (Ort, Coins, Zeitraum) wie bisher, dort führt „Zurück“ wieder ins Blatt.
 */
export function usePublicComposeForm(
  onSaved: () => void,
  type: 'individual' | 'photo',
): { fields: ReactNode; buttons: ReactNode } {
  const router = useRouter();
  const { saveDraft } = useStore();
  const [photo, setPhoto] = useState<ImageSource>();
  const [extras, setExtras] = useState<ImageSource[]>([]);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const isChallenge = type !== 'photo';
  const missingPhoto = !photo;
  const missingTitle = !title.trim();
  const hasContent = !!photo || extras.length > 0 || !!title.trim() || !!text.trim();

  const next = () => {
    if (missingPhoto || missingTitle) {
      setShowErrors(true);
      return;
    }
    const extraUris = extras.map(uriOf).filter(Boolean);
    router.push({
      pathname: '/challenge/create/step-2',
      params: {
        from: 'feed',
        type,
        title,
        text,
        photo: uriOf(photo) ?? '',
        ...(extraUris.length ? { extras: JSON.stringify(extraUris) } : {}),
      },
    });
  };

  const save = async () => {
    setBusy(true);
    try {
      await saveDraft(undefined, { type, title, text, location: '', photo, extras: extras.map((p) => ({ photo: p })) });
      onSaved();
    } catch (error) {
      Alert.alert('Entwurf nicht gespeichert', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fields = (
    <>
      <Text style={styles.hint}>
        {isChallenge ? 'Hier gibt es etwas zu tun! Zu den Spaten! Zu den Müllsäcken!' : 'Hier ist nichts zu tun, nur ein schönes Bild.'}
      </Text>
      <PhotoPicker
        photo={photo}
        error={showErrors && missingPhoto}
        hint={showErrors && missingPhoto ? 'Bitte ein Foto hinzufügen.' : isChallenge ? 'Zeige, wo geholfen werden soll.' : 'Zeige Deinem Kiez, was Dir gefällt.'}
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
      <TextField label="Beschreibung" helperText="Max. 500 Zeichen" value={text} onChangeText={setText} maxLength={500} multiline />
    </>
  );

  const buttons = (
    <>
      <Button label="Weiter" onPress={next} />
      <Button
        busy={busy}
        label={busy ? 'Wird gespeichert …' : 'Als Entwurf speichern'}
        variant="ghost"
        onPress={save}
        disabled={busy || !hasContent}
        whyDisabled={() => !busy && explain('Noch nichts zu speichern', 'Füge ein Foto hinzu oder gib einen Titel ein, dann lässt sich der Entwurf speichern.')}
      />
    </>
  );

  return { fields, buttons };
}

const styles = StyleSheet.create({
  hint: { ...text.body, fontSize: 14, lineHeight: 19, color: color.text.secondary },
});
