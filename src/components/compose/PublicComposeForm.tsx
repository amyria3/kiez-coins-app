import { useState, type ReactNode } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useStore } from '../../data/store';
import type { ImageSource } from '../../data/types';
import { Button } from '../Button';
import { ExtraPhotos, PhotoPicker, SwitchRow, TextField } from '../Form';
import { explain } from '../Nudge';

const uriOf = (photo?: ImageSource) =>
  typeof photo === 'object' && photo && 'uri' in photo && typeof photo.uri === 'string' ? photo.uri : undefined;

/**
 * Schritt 1 einer öffentlichen Challenge im Blatt über dem Feed: Challenge oder Bild, Fotos, Titel, Beschreibung.
 * „Weiter“ öffnet Schritt 2 (Ort, Coins, Zeitraum) wie bisher, dort führt „Zurück“ wieder ins Blatt.
 */
export function usePublicComposeForm(onSaved: () => void): { fields: ReactNode; buttons: ReactNode } {
  const router = useRouter();
  const { saveDraft } = useStore();
  const [type, setType] = useState<'individual' | 'photo'>('individual');
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
      <SwitchRow
        label={isChallenge ? 'Challenge: Hier muss etwas getan werden! Auf geht’s, Nachbarschaft!' : 'Hier ist nichts zu tun, nur ein schönes Bild'}
        value={isChallenge}
        onValueChange={(on) => setType(on ? 'individual' : 'photo')}
      />
      <PhotoPicker
        photo={photo}
        hint={showErrors && missingPhoto ? 'Bitte füge ein Foto hinzu.' : isChallenge ? 'Zeig, wo geholfen werden soll.' : 'Zeig, was Dir gefällt.'}
        onChange={setPhoto}
      />
      {photo ? (
        <ExtraPhotos
          photos={extras}
          onAdd={(p) => setExtras((all) => [...all, p].slice(0, 2))}
          onRemove={(index) => setExtras((all) => all.filter((_, i) => i !== index))}
        />
      ) : null}
      <TextField
        label="Titel"
        required
        helperText="Max. 60 Zeichen"
        error={showErrors && missingTitle ? 'Bitte gib einen Titel ein.' : undefined}
        value={title}
        onChangeText={setTitle}
        maxLength={60}
      />
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
        whyDisabled={() => !busy && explain('Noch nichts zu speichern', 'Füg ein Foto hinzu oder gib einen Titel ein, dann lässt sich der Entwurf speichern.')}
      />
    </>
  );

  return { fields, buttons };
}
