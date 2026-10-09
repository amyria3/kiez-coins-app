import { useLocalSearchParams, useRouter } from 'expo-router';

import { StatusBadge } from '../../../components/Badges';
import { Button } from '../../../components/Button';
import { ResultScreen } from '../../../components/Screen';

/** Route `challenge/create/success`. Figma: `challenge/create/success`. */
export default function CreateSuccess() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <ResultScreen
      mood="high"
      badge={<StatusBadge status="open" />}
      title="Deine Challenge ist online"
      message="Wir zeigen sie den Nachbar:innen in Deinem Kiez."
      actions={
        <>
          <Button label="Zum Feed" onPress={() => router.dismissTo('/feed')} />
          <Button
            label="Challenge ansehen"
            variant="secondary"
            onPress={() => {
              router.dismissTo('/feed');
              router.push(`/challenge/${id}`);
            }}
          />
        </>
      }
    />
  );
}
