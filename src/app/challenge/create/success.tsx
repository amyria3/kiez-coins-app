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
  const isText = !!post?.pages?.length;
  const title = post?.private
    ? isText
      ? 'Dein Text ist gespeichert'
      : 'Dein Bild ist gespeichert'
    : isText
      ? 'Dein Text ist online'
      : isPhoto
        ? 'Dein Bild ist online'
        : 'Nice, 1 Challenge gepostet!';
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
        // In den Feed, in den Reiter mit dem neuen Post (Daria, 07.11.2026), nicht in die Einzelansicht
        <Button
          label="Im Feed ansehen"
          onPress={() =>
            router.dismissTo({
              pathname: '/feed',
              params: {
                reiter: post?.private ? 'privat' : post?.groupId ? 'gruppen' : 'kiez',
                ...(post?.groupId ? { gruppe: post.groupId } : {}),
                neu: id,
              },
            })
          }
        />
      }
    />
  );
}
