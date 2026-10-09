import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthorRow } from '../../../../components/AuthorRow';
import { Button } from '../../../../components/Button';
import { Notice } from '../../../../components/Content';
import { CopyField } from '../../../../components/Form';
import { SubScreen } from '../../../../components/Screen';
import { formatEuroCents } from '../../../../data/format';
import { useChallenge, useStore } from '../../../../data/store';
import { color, space, text } from '../../../../theme/tokens';

/**
 * Route `challenge/[id]/pay` (Push). Figma: `challenge/pay`, Flow „Bounty auf Vertrauen“.
 * Zeigt nur die Zahlungsdaten, die die Empfänger:in für diese Challenge freigegeben hat.
 */
export default function PayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { dispatch } = useStore();
  const { challenge, assignee } = useChallenge(id);

  if (!challenge || !assignee || !challenge.bountyAmount) return null;
  const payout = assignee.payout;
  const share = challenge.report;

  const markPaid = () => {
    dispatch({ type: 'markPaid', id: challenge.id });
    router.replace(`/challenge/${challenge.id}/pay/success`);
  };

  return (
    <SubScreen
      title="Bounty bezahlen"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={
        <>
          <Button label="Als bezahlt markieren" onPress={markPaid} />
          <Button label="Später bezahlen" variant="secondary" onPress={() => router.dismissTo('/feed')} />
        </>
      }
    >
      <AuthorRow user={assignee} location={challenge.location} />
      <View style={styles.amount}>
        <Text style={styles.secondary}>Betrag</Text>
        <Text style={styles.amountValue}>{formatEuroCents(challenge.bountyAmount)}</Text>
      </View>
      <Notice message="Überweise den Betrag direkt. Kiez Coins sieht und prüft keine Zahlungen, alles beruht auf Vertrauen." />
      {payout && share?.shareIban ? (
        <>
          <CopyField label="Empfänger:in" value={payout.accountHolder} />
          <CopyField label="IBAN" value={payout.iban} />
        </>
      ) : null}
      {payout?.paypal && share?.sharePaypal ? <CopyField label="PayPal" value={payout.paypal} /> : null}
      {!payout || !(share?.shareIban || share?.sharePaypal) ? (
        <Notice
          variant="warning"
          message={`${assignee.firstName} hat noch keine Zahlungsdaten freigegeben. Frag am besten direkt nach.`}
        />
      ) : null}
      <CopyField label="Verwendungszweck" value={`Kiez Coins: ${challenge.title}`} />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  amount: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space[8] },
  secondary: { ...text.body, color: color.text.secondary },
  amountValue: { ...text.title, color: color.text.primary },
});
