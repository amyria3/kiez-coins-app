import { useLocalSearchParams, useRouter } from 'expo-router';

import { StatusBadge } from '../../../../components/Badges';
import { Button } from '../../../../components/Button';
import { ResultScreen } from '../../../../components/Screen';
import { formatEuro, nameInText } from '../../../../data/format';
import { useChallenge } from '../../../../data/store';

/** Route `challenge/[id]/review/success`. Figma: `challenge/review/success`. */
export default function ReviewSuccess() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { challenge, assignee } = useChallenge(id);
  const amount = formatEuro(challenge?.bountyAmount ?? 0);

  return (
    <ResultScreen
      mood="high"
      badge={<StatusBadge status="payment_open" />}
      title="Bestätigt!"
      message={`Jetzt bist Du dran: Zahl die ${amount} direkt an ${assignee ? nameInText(assignee) : ''}. Die Zahlungsdaten findest Du unter „Bounty bezahlen“.`}
      actions={
        <>
          <Button label="Bounty bezahlen" onPress={() => router.replace(`/challenge/${id}/pay`)} />
          <Button label="Zum Feed" variant="secondary" onPress={() => router.dismissTo('/feed')} />
        </>
      }
    />
  );
}
