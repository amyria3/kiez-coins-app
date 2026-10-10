import { useLocalSearchParams, useRouter } from 'expo-router';

import { StatusBadge } from '../../../../components/Badges';
import { ResultScreen } from '../../../../components/Screen';
import { formatEuro } from '../../../../data/format';
import { useChallenge } from '../../../../data/store';

/** Route `challenge/[id]/report/success`. Figma: `challenge/report/success`. */
export default function ReportSuccess() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { challenge, author } = useChallenge(id);
  const name = author?.firstName ?? '';
  const data = challenge?.payoutShare?.method === 'paypal' ? 'Dein PayPal' : 'Deine IBAN';

  const message = challenge?.bountyAmount
    ? `Ich sag Dir Bescheid, sobald ${name} bestätigt hat. Dann sieht ${name} ${data} und zahlt Dir die ${formatEuro(challenge.bountyAmount)} direkt.`
    : `Ich sag Dir Bescheid, sobald ${name} bestätigt hat.`;

  return (
    <ResultScreen
      badge={<StatusBadge status="reported" />}
      title="Gemeldet!"
      message={message}
      onFeedPress={() => router.dismissTo('/feed')}
    />
  );
}
