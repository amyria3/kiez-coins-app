import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthorRow } from '../../../../components/AuthorRow';
import { StatusBadge } from '../../../../components/Badges';
import { Button } from '../../../../components/Button';
import { PaymentDetails } from '../../../../components/PaymentDetails';
import { SubScreen } from '../../../../components/Screen';
import { useChallenge, useStore } from '../../../../data/store';
import { useGoBack } from '../../../../lib/goBack';

/**
 * Route `challenge/[id]/pay` (Push, nur Ersteller:in, nach confirmed). Figma: `challenge/pay`,
 * Flow „Bounty auf Vertrauen“. Zeigt nur die für diese Challenge freigegebenen Zahlungsdaten.
 */
export default function PayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { dispatch } = useStore();
  const { challenge, assignee } = useChallenge(id);

  if (!challenge || !assignee || !challenge.bountyAmount) return null;

  const markPaid = () => {
    dispatch({ type: 'markPaid', id: challenge.id });
    router.replace(`/challenge/${challenge.id}/pay/success`);
  };

  return (
    <SubScreen
      title="Coins bezahlen"
      navigation="back"
      onLeadingPress={goBack}
      actions={
        <>
          <Button label="Als bezahlt markieren" onPress={markPaid} />
          <Button label="Muss ich noch machen" variant="signal" onPress={() => router.dismissTo('/feed')} />
        </>
      }
    >
      <AuthorRow user={assignee} location={assignee.location} trailing={<StatusBadge status={challenge.status} challenge={challenge} />} />
      <PaymentDetails challenge={challenge} recipient={assignee} noticeFirst />
    </SubScreen>
  );
}
