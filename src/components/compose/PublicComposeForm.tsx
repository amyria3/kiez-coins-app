import { useState, type ReactNode } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { useStore } from '../../data/store';
import type { ImageSource, PhotoText } from '../../data/types';
import { Button } from '../Button';
import { PhotoTextOnPhoto } from '../PhotoText';
import { ExtraPhotos, PhotoPicker } from '../Form';
import { Text } from '../T';
import { SheetEditor, pagesText } from '../TextSheets';
import { PHOTO_TAG } from '../WithMentions';
import { TagTextField } from './BeforeAfterForm';
import { CrosspostRow } from './CrosspostRow';
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
  /** Post nur mit Text: Blätter statt Foto (Daria, 07.11.2026) */
  textOnly = false,
): { fields: ReactNode; buttons: ReactNode } {
  const router = useRouter();
  const { saveDraft } = useStore();
  const own = useComposeContent();
  const { photo, setPhoto, title, setTitle, text, setText } = shared ?? own;
  const [extras, setExtras] = useState<ImageSource[]>([]);
  // Nur Bild: Text auf dem Foto (Daria, 29.10.2026)
  const [photoText, setPhotoText] = useState<PhotoText | undefined>();
  const withPhotoText = type === 'photo' && photoText?.text.trim() ? photoText : undefined;
  const [pages, setPages] = useState<string[]>(['']);
  const [sheetFont, setSheetFont] = useState<string>('inter');
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const isChallenge = type !== 'photo';
  const missingPhoto = !photo;
  const missingText = !pagesText(pages);
  // Nur Bild: Titel freiwillig (Daria, 06.11.2026)
  const missingTitle = isChallenge && !title.trim();
  const hasContent = textOnly ? !!title.trim() || !missingText : !!photo || extras.length > 0 || !!title.trim() || !!text.trim();

  const next = () => {
    if (textOnly) {
      if (missingText) {
        setShowErrors(true);
        return;
      }
      router.push({
        pathname: isPrivate ? '/challenge/create/preview' : '/challenge/create/step-2',
        params: { from: 'feed', type: 'photo', title, seiten: JSON.stringify(pages), schrift: sheetFont, ...(isPrivate ? { privat: '1' } : {}) },
      });
      return;
    }
    if (missingPhoto || missingTitle) {
      setShowErrors(true);
      return;
    }
    const extraUris = extras.map(uriOf).filter(Boolean);
    // Privates Bild: kein Ort, kein Zeitraum, gleich zur Vorschau (Daria, 30.10.2026)
    router.push({
      pathname: type === 'photo' && isPrivate ? '/challenge/create/preview' : '/challenge/create/step-2',
      params: {
        from: 'feed',
        type,
        title,
        text,
        photo: uriOf(photo) ?? '',
        ...(isPrivate ? { privat: '1' } : {}),
        ...(extraUris.length ? { extras: JSON.stringify(extraUris) } : {}),
        ...(withPhotoText ? { bildtext: JSON.stringify(withPhotoText) } : {}),
      },
    });
  };

  const save = async () => {
    setBusy(true);
    try {
      await saveDraft(
        undefined,
        textOnly
          ? { type: 'photo', title, text: '', location: '', pages, sheetFont, private: isPrivate }
          : { type, title, text, location: '', photo, extras: extras.map((p) => ({ photo: p })), private: isPrivate, photoText: withPhotoText },
      );
      onSaved();
    } catch (error) {
      Alert.alert('Entwurf nicht gespeichert', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fields = textOnly ? (
    <>
      <Text style={styles.hint}>Hier ist nichts zu tun, nur Dein Text. Ist ein Blatt voll, geht es auf dem nächsten weiter.</Text>
      <SheetEditor title={title} onTitleChange={setTitle} pages={pages} onPagesChange={setPages} fontKey={sheetFont} onFontChange={setSheetFont} />
      {showErrors && missingText ? <Text style={styles.error}>Schreib etwas auf das Blatt.</Text> : null}
    </>
  ) : (
    <>
      {isChallenge ? (
        // Ohne Info-Icon (Daria, 30.10.2026)
        <Text style={styles.hint}>Hier gibt es etwas zu tun! Dokumentiere die Ausgangslage und poste es im Kiez!</Text>
      ) : (
        <Text style={styles.hint}>Hier ist nichts zu tun, nur ein schönes Bild.</Text>
      )}
      <PhotoPicker
        photo={photo}
        error={showErrors && missingPhoto}
        hint={showErrors && missingPhoto ? 'Bitte ein Foto hinzufügen.' : isChallenge ? 'Zeige, wo geholfen werden soll.' : isPrivate ? 'Halte fest, was Dir gefällt.' : 'Zeige Deinem Kiez, was Dir gefällt.'}
        onChange={setPhoto}
        title={{ value: title, onChange: setTitle, optional: !isChallenge, error: showErrors && missingTitle ? 'Gib einen Titel ein.' : undefined }}
        // Nur Bild: Text direkt auf dem Foto (Daria, 30.10.2026)
        overlay={isChallenge ? undefined : <PhotoTextOnPhoto value={photoText} onChange={setPhotoText} />}
      />
      {!isChallenge && photo ? <Text style={styles.hint}>Tippe aufs Foto, um Text darauf zu schreiben. Ziehe ihn mit dem Finger an seinen Platz.</Text> : null}
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
        <TagTextField label="Dein Text" tag={PHOTO_TAG} value={text} onChangeText={setText} maxLength={500} />
      )}
      {/* Weiterposten auf andere Plattformen, nur öffentliche Posts (Daria, 05.11.2026) */}
      {isPrivate ? null : <CrosspostRow />}
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
        whyDisabled={() =>
          !busy &&
          explain(
            'Noch nichts zu speichern',
            textOnly ? 'Schreib etwas auf das Blatt, dann lässt sich der Entwurf speichern.' : 'Füge ein Foto hinzu oder gib einen Titel ein, dann lässt sich der Entwurf speichern.',
          )
        }
      />
    </>
  );

  return { fields, buttons };
}

const styles = StyleSheet.create({
  hint: { ...text.body, fontSize: 14, lineHeight: 19, color: color.text.secondary },
  error: { ...text.body, fontSize: 14, lineHeight: 19, color: color.accent.error },
});
