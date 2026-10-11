import { useRouter } from 'expo-router';

import { ResultScreen } from '../../../../components/Screen';

/** Route `user/[id]/report/success`. Figma: `user/report/success`. */
export default function UserReportSuccess() {
  const router = useRouter();
  return (
    <ResultScreen
      title="Danke, ich kümmere mich"
      message="Die Moderation prüft Deine Meldung und meldet sich bei Dir. Wer öfter mit falschen Versprechen lockt, darf keine Bounties mehr anbieten."
      onFeedPress={() => router.dismissTo('/feed')}
    />
  );
}
