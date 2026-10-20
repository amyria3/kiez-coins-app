import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { ResultScreen } from '../../../components/Screen';

/** Route `challenge/create/success`. Figma: `challenge/create/success`. */
export default function CreateSuccess() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <ResultScreen
      mood="high"
      title="Deine Challenge ist online"
      message="Wir zeigen sie den Nachbar:innen in Deinem Kiez."
      onFeedPress={() => router.dismissTo('/feed')}
      actions={
        <Button
          label="Challenge ansehen"
          onPress={() => {
            router.dismissTo('/feed');
            router.push(`/challenge/${id}`);
          }}
        />
      }
    />
  );
}
