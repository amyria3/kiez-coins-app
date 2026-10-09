import { useRouter } from 'expo-router';

import { Button } from '../../../../components/Button';
import { ResultScreen } from '../../../../components/Screen';

/** Route `user/[id]/report/success`. Figma: `user/report/success`. */
export default function UserReportSuccess() {
  const router = useRouter();
  return (
    <ResultScreen
      title="Danke, ich kümmere mich"
      message="Die Moderation prüft Deine Meldung und meldet sich bei Dir. Wer eine Bounty nicht zahlt, darf keine Bounties mehr anbieten."
      actions={<Button label="Zum Feed" onPress={() => router.dismissTo('/feed')} />}
    />
  );
}
