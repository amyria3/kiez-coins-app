import { useLocalSearchParams, useRouter } from 'expo-router';

import { StatusBadge } from '../../../../components/Badges';
import { Button } from '../../../../components/Button';
import { PaymentDetails } from '../../../../components/PaymentDetails';
import { ResultScreen } from '../../../../components/Screen';
import { formatEuro, nameInText } from '../../../../data/format';
import { useChallenge, useStore } from '../../../../data/store';
import { t } from '../../../../data/texts';

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
  const paypal = challenge.payoutShare?.method === 'paypal';
  // Ganze Sätze je Fall, damit sie sich übersetzen lassen
  const message = assignee.group
    ? paypal
      ? 'Jetzt bist Du dran: Schick die {amount} direkt an {assignee}. Hier sind ihre Zahlungsdaten.'
      : 'Jetzt bist Du dran: Überweis die {amount} direkt an {assignee}. Hier sind ihre Zahlungsdaten.'
    : paypal
      ? 'Jetzt bist Du dran: Schick die {amount} direkt an {assignee}. Hier sind die Zahlungsdaten.'
      : 'Jetzt bist Du dran: Überweis die {amount} direkt an {assignee}. Hier sind die Zahlungsdaten.';

  return (
    <ResultScreen
      mood="high"
      badge={<StatusBadge status="payment_open" />}
      title="Bestätigt!"
      message={t(message, { amount, assignee: nameInText(assignee) })}
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
