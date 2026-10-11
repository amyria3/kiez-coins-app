import { useLocalSearchParams, useRouter } from 'expo-router';

import { StatusBadge } from '../../../../components/Badges';
import { Button } from '../../../../components/Button';
import { PaymentDetails } from '../../../../components/PaymentDetails';
import { ResultScreen } from '../../../../components/Screen';
import { formatEuro, nameInText } from '../../../../data/format';
import { useChallenge, useStore } from '../../../../data/store';

/**
 * Route `challenge/[id]/review/success`. Figma: `challenge/review/success`.
 * Status confirmed, danach payment_open. Die freigegebenen Zahlungsdaten stehen direkt hier.
 */
export default function ReviewSuccess() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { dispatch } = useStore();
  const { challenge, assignee } = useChallenge(id);
  if (!challenge || !assignee) return null;

  const amount = formatEuro(challenge.bountyAmount ?? 0);
  const pronoun = assignee.group ? 'ihre' : 'die';
  const verb = challenge.payoutShare?.method === 'paypal' ? 'Schick' : 'Überweis';

  return (
    <ResultScreen
      mood="high"
      badge={<StatusBadge status="payment_open" />}
      title="Bestätigt!"
      message={`Jetzt bist Du dran: ${verb} die ${amount} direkt an ${nameInText(assignee)}. Hier sind ${pronoun} Zahlungsdaten.`}
      onFeedPress={() => router.dismissTo('/feed')}
      actions={
        <>
          <Button
            label="Als bezahlt markieren"
            onPress={() => {
              dispatch({ type: 'markPaid', id: challenge.id });
              router.replace(`/challenge/${challenge.id}/pay/success`);
            }}
          />
          <Button
            label="Rückgängig machen"
            variant="signalOutline"
            onPress={() => {
              dispatch({ type: 'undoConfirm', id: challenge.id });
              router.replace(`/challenge/${challenge.id}/review`);
            }}
          />
        </>
      }
    >
      <PaymentDetails challenge={challenge} recipient={assignee} />
    </ResultScreen>
  );
}
