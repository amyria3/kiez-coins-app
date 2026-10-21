import { StyleSheet, View } from 'react-native';
import { Text } from './T';

import { formatEuroCents } from '../data/format';
import type { Challenge, User } from '../data/types';
import { color, space, text } from '../theme/tokens';
import { Notice } from './Content';
import { CopyField } from './Form';
import { t } from '../data/texts';

type PaymentDetailsProps = {
  challenge: Challenge;
  recipient: User;
  /** In `challenge/pay` steht der Hinweis über den Daten, in `review/success` darunter. */
  noticeFirst?: boolean;
};

/**
 * Betrag und freigegebene Zahlungsdaten zum Kopieren (Figma: `challenge/pay`, `challenge/review/success`).
 * Zeigt nur, was die Empfänger:in für genau diese Challenge freigegeben hat.
 */
export function PaymentDetails({ challenge, recipient, noticeFirst }: PaymentDetailsProps) {
  const share = challenge.payoutShare;
  const notice = (
    <Notice message="Überweise den Betrag direkt. Kiez Coins sieht und prüft keine Zahlungen, alles beruht auf Vertrauen." />
  );
  return (
    <View style={styles.list}>
      <View style={styles.amount}>
        <Text style={styles.caption}>Betrag</Text>
        <Text style={styles.amountValue}>{formatEuroCents(challenge.bountyAmount ?? 0)}</Text>
      </View>
      {noticeFirst ? notice : null}
      {share?.method === 'iban' ? (
        <>
          <CopyField label="Empfänger:in" value={share.payout.accountHolder} />
          <CopyField label="IBAN" value={share.payout.iban} />
        </>
      ) : null}
      {share?.method === 'paypal' && share.payout.paypal ? <CopyField label="PayPal" value={share.payout.paypal} /> : null}
      {!share ? (
        <Notice
          variant="warning"
          message={t('{firstName} hat noch keine Zahlungsdaten freigegeben. Frag am besten in den Kommentaren nach.', { firstName: recipient.firstName })}
        />
      ) : null}
      <CopyField label="Verwendungszweck" value={t('Kiez Coins: {title}', { title: challenge.title })} />
      {noticeFirst ? null : notice}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[12] },
  amount: { gap: space[4] },
  caption: { ...text.caption, color: color.text.secondary },
  amountValue: { ...text.title, color: color.text.primary },
});
