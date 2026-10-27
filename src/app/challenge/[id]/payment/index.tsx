import { StyleSheet, View } from 'react-native';
import { Text } from '../../../../components/T';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthorRow } from '../../../../components/AuthorRow';
import { StatusBadge } from '../../../../components/Badges';
import { Button } from '../../../../components/Button';
import { Notice } from '../../../../components/Content';
import { SubScreen } from '../../../../components/Screen';
import { formatDayMonth, formatEuro } from '../../../../data/format';
import { useChallenge, useStore } from '../../../../data/store';
import { color, space, text } from '../../../../theme/tokens';
import { t, tAbout } from '../../../../data/texts';
import { useGoBack } from '../../../../lib/goBack';

/** Route `challenge/[id]/payment` (Push). Figma: `challenge/payment`, Empfang der Coins bestätigen. */
export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { dispatch } = useStore();
  const { challenge, author } = useChallenge(id);

  if (!challenge || !author || !challenge.bountyAmount) return null;

  const received = () => {
    dispatch({ type: 'confirmReceived', id: challenge.id });
    router.replace(`/challenge/${challenge.id}/payment/success`);
  };

  const day = challenge.paidMarkedAt ? formatDayMonth(challenge.paidMarkedAt) : undefined;

  return (
    <SubScreen
      title="Coins"
      navigation="back"
      onLeadingPress={goBack}
      actions={
        <>
          <Button label="Ja, erhalten" onPress={received} />
          <Button
            label="Nein, nicht erhalten"
            variant="secondary"
            onPress={() => router.push(`/user/${author.id}/report?challengeId=${challenge.id}&reason=not_paid`)}
          />
        </>
      }
    >
      <AuthorRow user={author} location={challenge.location} trailing={<StatusBadge status={challenge.status} challenge={challenge} />} />
      <View style={styles.block}>
        <Text style={styles.title}>Sind die Coins angekommen?</Text>
        <Text style={styles.secondary}>{day
            ? tAbout(author, '{firstName} hat am {day} die {bountyAmount} als bezahlt markiert. Schaue auf Dein Konto oder in PayPal.', { firstName: author.firstName, day, bountyAmount: formatEuro(challenge.bountyAmount) })
            : tAbout(author, '{firstName} hat die {bountyAmount} als bezahlt markiert. Schaue auf Dein Konto oder in PayPal.', { firstName: author.firstName, bountyAmount: formatEuro(challenge.bountyAmount) })}</Text>
      </View>
      <Notice message="Nur Geduld, my friend! Überweisungen brauchen bis zu 2 Werktage. Melde Dich erst, wenn das Geld danach immer noch fehlt." />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  block: { gap: space[8] },
  title: { ...text.title, color: color.text.primary },
  secondary: { ...text.body, color: color.text.secondary },
});
