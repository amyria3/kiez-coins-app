import { useRouter } from 'expo-router';

import { StatusBadge } from '../../../../components/Badges';
import { Button } from '../../../../components/Button';
import { ResultScreen } from '../../../../components/Screen';

/** Route `challenge/[id]/payment/success`. Figma: `challenge/payment/success`. */
export default function PaymentSuccess() {
  const router = useRouter();
  return (
    <ResultScreen
      mood="high"
      badge={<StatusBadge status="paid" />}
      title="Super, alles erledigt!"
      message="Die Bounty ist angekommen. Danke, dass Du Deinen Kiez schöner machst."
      actions={<Button label="Zum Feed" onPress={() => router.dismissTo('/feed')} />}
    />
  );
}
