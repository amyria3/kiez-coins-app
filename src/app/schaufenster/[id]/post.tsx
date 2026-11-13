import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { Button } from '../../../components/Button';
import { Notice } from '../../../components/Content';
import { PhotoPicker, TextField } from '../../../components/Form';
import { SubScreen } from '../../../components/Screen';
import { CrosspostRow } from '../../../components/compose/CrosspostRow';
import { crosspostChallenge, loadCrosspostSelection, useCrosspostEnabled, type LivePlatform } from '../../../data/crosspost';
import { clearShowcasePost, loadShowcase, setShowcasePost, type Showcase } from '../../../data/showcase';
import { useStore } from '../../../data/store';
import type { ImageSource } from '../../../data/types';
import { useGoBack } from '../../../lib/goBack';

/** Posts im Schaufenster bleiben 30 Tage offen, wie ein Bild im Kiez */
const DAYS = 30;

/**
 * Route `schaufenster/[id]/post` (Daria, 2026-11-10): Bild mit Titel und Text, ohne den Umweg über den Feed.
 * Für kiezcoins.de/schaufenster. Der Post landet im Schaufenster (attach_showcase_post über den Store).
 * Weiterposten wie im Erstellen-Blatt (Daria, 2026-11-13): Die Karte zeigt die Plattformen, die unter Funktionen an
 * sind; abwählen gilt nur für diesen Post. Nach dem Posten geht er im Hintergrund weiter.
 */
export default function NewShowcasePost() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack();
  const { currentUserId, createChallenge } = useStore();
  const [showcase, setShowcase] = useState<Showcase | null>(null);
  const [photo, setPhoto] = useState<ImageSource | undefined>();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const crosspost = useCrosspostEnabled();
  const [crosspostOff, setCrosspostOff] = useState<LivePlatform[]>([]);

  useEffect(() => {
    loadShowcase(id, currentUserId).then((d) => setShowcase(d?.showcase ?? null));
  }, [id, currentUserId]);

  const publish = async () => {
    if (!showcase || !photo) return;
    setBusy(true);
    setFailed(null);
    setShowcasePost({ id: showcase.id, name: showcase.name });
    try {
      const postId = await createChallenge({
        type: 'photo',
        title: title.trim(),
        text: text.trim(),
        location: showcase.address ?? showcase.kiez ?? showcase.name,
        photo,
        deadline: new Date(Date.now() + DAYS * 24 * 60 * 60 * 1000).toISOString(),
      });
      // Fehler stehen in crosspost_posts und stören das Posten nicht
      if (crosspost) {
        loadCrosspostSelection()
          .then((platforms) => crosspostChallenge(postId, platforms.filter((p) => !crosspostOff.includes(p))))
          .catch(() => undefined);
      }
      goBack();
    } catch (error) {
      clearShowcasePost();
      setFailed((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SubScreen
      title="Post erstellen"
      subtitle={showcase?.name}
      navigation="back"
      onLeadingPress={goBack}
      actions={<Button label="Posten" busy={busy} disabled={!photo || !showcase} onPress={publish} />}
    >
      <PhotoPicker photo={photo} hint="Zeig, was es bei Euch gibt." onChange={setPhoto} title={{ value: title, onChange: setTitle, optional: true, maxLength: 80 }} />
      <TextField label="Text" multiline value={text} onChangeText={setText} maxLength={2000} />
      <CrosspostRow off={crosspostOff} onChange={setCrosspostOff} />
      {failed ? <Notice variant="warning" message={failed} /> : null}
    </SubScreen>
  );
}
