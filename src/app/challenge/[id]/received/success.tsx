import { useRouter } from 'expo-router';

import { StatusBadge } from '../../../../components/Badges';
import { ResultScreen } from '../../../../components/Screen';
import { anrede } from '../../../../data/format';
import { useStore } from '../../../../data/store';
import { t } from '../../../../data/texts';

/** Route `challenge/[id]/received/success`. Figma: `challenge/payment/success`. Status paid. */
export default function PaymentSuccess() {
  const router = useRouter();
  const { profile } = useStore();
  return (
    <ResultScreen
      badge={<StatusBadge status="paid" />}
      title="Super, alles erledigt!"
      message={t('Die Coins sind angekommen. Danke, {anrede}!', { anrede: anrede(profile) })}
      onFeedPress={() => router.dismissTo('/feed')}
    />
  );
}
