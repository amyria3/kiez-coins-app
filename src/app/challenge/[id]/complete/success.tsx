import { useLocalSearchParams, useRouter } from 'expo-router';

import { StatusBadge } from '../../../../components/Badges';
import { ResultScreen } from '../../../../components/Screen';
import { formatEuro } from '../../../../data/format';
import { useChallenge } from '../../../../data/store';
import { t, tAbout } from '../../../../data/texts';

/** Route `challenge/[id]/complete/success`. Figma: `challenge/report/success`. */
export default function ReportSuccess() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { challenge, author } = useChallenge(id);
  const name = author?.firstName ?? '';

  const message = challenge?.bountyAmount
    ? tAbout(
        author,
        challenge?.payoutShare?.method === 'paypal'
          ? 'Ich sag Dir Bescheid, sobald {name} bestätigt hat. Dann sieht {name} Dein PayPal und zahlt Dir die {bountyAmount} direkt.'
          : 'Ich sag Dir Bescheid, sobald {name} bestätigt hat. Dann sieht {name} Deine IBAN und zahlt Dir die {bountyAmount} direkt.',
        { name, bountyAmount: formatEuro(challenge.bountyAmount) },
      )
    : tAbout(author, 'Ich sag Dir Bescheid, sobald {name} bestätigt hat.', { name });

  return (
    <ResultScreen
      badge={<StatusBadge status="reported" />}
      title="Gemeldet!"
      message={message}
      onFeedPress={() => router.dismissTo('/feed')}
    />
  );
}
