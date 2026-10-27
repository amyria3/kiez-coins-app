import { useState, type ReactNode } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { useStore } from '../../data/store';
import type { ImageSource } from '../../data/types';
import { Button } from '../Button';
import { ExtraPhotos, PhotoPicker } from '../Form';
import { Text } from '../T';
import { PHOTO_TAG } from '../WithMentions';
import { TagTextField } from './BeforeAfterForm';
import { HintWithInfo } from './HintWithInfo';
import { explain } from '../Nudge';
import { useComposeContent, type ComposeContent } from './compose';
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
  shared?: ComposeContent,
  /** Modus „Privat“: nur Bild, nur für Dich sichtbar (Daria, 27.10.2026) */
  isPrivate = false,
): { fields: ReactNode; buttons: ReactNode } {
  const router = useRouter();
  const { saveDraft } = useStore();
  const own = useComposeContent();
  const { photo, setPhoto, title, setTitle, text, setText } = shared ?? own;
  const [extras, setExtras] = useState<ImageSource[]>([]);
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
        ...(isPrivate ? { privat: '1' } : {}),
        ...(extraUris.length ? { extras: JSON.stringify(extraUris) } : {}),
      },
    });
  };

  const save = async () => {
    setBusy(true);
    try {
      await saveDraft(undefined, { type, title, text, location: '', photo, extras: extras.map((p) => ({ photo: p })), private: isPrivate });
      onSaved();
    } catch (error) {
      Alert.alert('Entwurf nicht gespeichert', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fields = (
    <>
      {isChallenge ? (
        // Erklärung nur bei Bedarf hinter dem Info-Icon (Daria, 27.10.2026)
        <HintWithInfo hint="Hier gibt es etwas zu tun! Dokumentiere die Ausgangslage und poste es im Kiez!" info="Deine Nachbar:innen sehen den Post und nehmen die We-Challenge an." />
      ) : (
        <Text style={styles.hint}>Hier ist nichts zu tun, nur ein schönes Bild.</Text>
      )}
      <PhotoPicker
        photo={photo}
        error={showErrors && missingPhoto}
        hint={showErrors && missingPhoto ? 'Bitte ein Foto hinzufügen.' : isChallenge ? 'Zeige, wo geholfen werden soll.' : isPrivate ? 'Halte fest, was Dir gefällt.' : 'Zeige Deinem Kiez, was Dir gefällt.'}
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
      {/* We-Challenge: Die Beschreibung ist das Vorher (Daria, 27.10.2026) */}
      {isChallenge ? (
        <TagTextField label="Beschreibung" tag="#vorher" placeholder="Was ist hier zu tun?" value={text} onChangeText={setText} maxLength={500} />
      ) : (
        <TagTextField label="Beschreibung" tag={PHOTO_TAG} value={text} onChangeText={setText} maxLength={500} />
      )}
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
