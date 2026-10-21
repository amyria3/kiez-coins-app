import { useLocalSearchParams, useRouter } from 'expo-router';

import { StatusBadge } from '../../../../components/Badges';
import { Button } from '../../../../components/Button';
import { ResultScreen } from '../../../../components/Screen';
import { nameInText } from '../../../../data/format';
import { useChallenge, useStore } from '../../../../data/store';
import { t } from '../../../../data/texts';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Route `challenge/[id]/pay/success`. Figma: `challenge/pay/success`. Status paid_marked. */
export default function PaySuccess() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { dispatch } = useStore();
  const { assignee } = useChallenge(id);

  return (
    <ResultScreen
      badge={<StatusBadge status="paid_marked" />}
      title="Danke fürs Bezahlen!"
      message={
        assignee
          ? t(assignee.group ? '{assignee} bestätigen jetzt noch, dass das Geld angekommen ist.' : '{assignee} bestätigt jetzt noch, dass das Geld angekommen ist.', { assignee: capitalize(nameInText(assignee)) })
          : ''
      }
      onFeedPress={() => router.dismissTo('/feed')}
      actions={
        <Button
          label="Als unbezahlt markieren"
          variant="secondary"
          onPress={() => {
            dispatch({ type: 'unmarkPaid', id });
            router.replace(`/challenge/${id}/pay`);
          }}
        />
      }
    />
  );
}
