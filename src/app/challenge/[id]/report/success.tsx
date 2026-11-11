import { useRouter } from 'expo-router';

import { ResultScreen } from '../../../../components/Screen';

/** Route `challenge/[id]/report/success`. */
export default function ChallengeFlagSuccess() {
  const router = useRouter();
  return (
    <ResultScreen
      title="Danke für Deine Meldung"
      message="Die Moderation prüft diese Challenge. Wenn sie gegen die Community-Regeln verstößt, verschwindet sie aus dem Feed."
      onFeedPress={() => router.dismissTo('/feed')}
    />
  );
}
