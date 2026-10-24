import { useRouter } from 'expo-router';

import { ResultScreen } from '../../../../components/Screen';

/** Route `challenge/[id]/flag/success`. */
export default function ChallengeFlagSuccess() {
  const router = useRouter();
  return (
    <ResultScreen
      title="Danke, ich kümmere mich"
      message="Die Moderation prüft diese Challenge. Wenn sie gegen die Community-Regeln verstößt, verschwindet sie aus dem Feed."
      onFeedPress={() => router.dismissTo('/feed')}
    />
  );
}
