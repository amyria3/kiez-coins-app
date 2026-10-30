import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { ResultScreen } from '../../../components/Screen';
import { useStore } from '../../../data/store';

/** Route `challenge/create/success`. Figma: `challenge/create/success`. Texte nach Art des Beitrags (Daria, 30.10.2026). */
export default function CreateSuccess() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { challenges } = useStore();
  const post = challenges.find((c) => c.id === id);
  const isPhoto = post?.type === 'photo';
  const title = post?.private ? 'Dein Bild ist gespeichert' : isPhoto ? 'Dein Bild ist online' : 'Deine Challenge ist online';
  const message = post?.private
    ? 'Es liegt in Deinem privaten Space. Nur Du siehst es.'
    : isPhoto
      ? 'Wir zeigen es den Nachbar:innen in Deinem Kiez.'
      : 'Wir zeigen sie den Nachbar:innen in Deinem Kiez.';

  return (
    <ResultScreen
      mood="high"
      title={title}
      message={message}
      onFeedPress={() => router.dismissTo('/feed')}
      actions={
        <Button
          label={isPhoto ? 'Bild ansehen' : 'Challenge ansehen'}
          onPress={() => {
            router.dismissTo('/feed');
            router.push(`/challenge/${id}`);
          }}
        />
      }
    />
  );
}
