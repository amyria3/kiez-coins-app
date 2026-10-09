import { useLocalSearchParams, useRouter } from 'expo-router';

import { StatusBadge } from '../../../../components/Badges';
import { Button } from '../../../../components/Button';
import { ResultScreen } from '../../../../components/Screen';
import { formatEuro } from '../../../../data/format';
import { useChallenge } from '../../../../data/store';

/** Route `challenge/[id]/report/success`. Figma: `challenge/report/success`. */
export default function ReportSuccess() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { challenge, author } = useChallenge(id);
  const name = author?.firstName ?? '';
  const payout = challenge?.report?.shareIban ? 'Deine IBAN' : 'Deine Zahlungsdaten';

  const message = challenge?.bountyAmount
    ? `Ich sag Dir Bescheid, sobald ${name} bestätigt hat. Dann sieht ${name} ${payout} und zahlt Dir die ${formatEuro(challenge.bountyAmount)} direkt.`
    : `Ich sag Dir Bescheid, sobald ${name} bestätigt hat.`;

  return (
    <ResultScreen
      badge={<StatusBadge status="reported" />}
      title="Gemeldet!"
      message={message}
      actions={<Button label="Zurück zum Feed" onPress={() => router.dismissTo('/feed')} />}
    />
  );
}
