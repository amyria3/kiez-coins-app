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
          ? 'Du bekommst eine Nachricht, sobald {name} bestätigt hat. Danach sieht {name} Dein PayPal und zahlt Dir die {bountyAmount} direkt.'
          : 'Du bekommst eine Nachricht, sobald {name} bestätigt hat. Danach sieht {name} Deine IBAN und zahlt Dir die {bountyAmount} direkt.',
        { name, bountyAmount: formatEuro(challenge.bountyAmount) },
      )
    : tAbout(author, 'Du bekommst eine Nachricht, sobald {name} bestätigt hat.', { name });

  return (
    <ResultScreen
      badge={<StatusBadge status="reported" />}
      title="Gemeldet!"
      message={message}
      onFeedPress={() => router.dismissTo('/feed')}
    />
  );
}
