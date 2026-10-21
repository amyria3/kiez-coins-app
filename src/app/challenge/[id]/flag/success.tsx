import { useRouter } from 'expo-router';

import { ResultScreen } from '../../../../components/Screen';

/** Route `challenge/[id]/flag/success`. */
export default function ChallengeFlagSuccess() {
  const router = useRouter();
  return (
    <ResultScreen
      title="Danke, ich kümmere mich"
      message="Die Moderation prüft die Challenge. Verstößt sie gegen die Community-Regeln, verschwindet sie aus dem Feed."
      onFeedPress={() => router.dismissTo('/feed')}
    />
  );
}
