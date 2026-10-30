import { StyleSheet, View } from 'react-native';
import { Text } from './T';

import { formatCents, formatEuroCents } from '../data/format';
import type { Challenge, PayoutShare, User } from '../data/types';
import { color, space, text } from '../theme/tokens';
import { Notice } from './Content';
import { CopyField } from './Form';
import { t, tAbout } from '../data/texts';

type PaymentDetailsProps = {
  challenge: Challenge;
  recipient: User;
  /** In `challenge/pay` steht der Hinweis über den Daten, in `review/success` darunter. */
  noticeFirst?: boolean;
  /** Mehrere Personen: Anteil dieser Person in Cent und ihre Freigabe (Migration 20261028000400) */
  amountCents?: number;
  share?: PayoutShare;
};

/**
 * Betrag und freigegebene Zahlungsdaten zum Kopieren (Figma: `challenge/pay`, `challenge/review/success`).
 * Zeigt nur, was die Empfänger:in für genau diese Challenge freigegeben hat.
 */
export function PaymentDetails({ challenge, recipient, noticeFirst, amountCents, share: shareFor }: PaymentDetailsProps) {
  const share = shareFor ?? (amountCents === undefined ? challenge.payoutShare : undefined);
  const notice = (
    <Notice message="Überweise den Betrag direkt. KiezCoins sieht und prüft keine Zahlungen, alles beruht auf Vertrauen." />
  );
  return (
    <View style={styles.list}>
      <View style={styles.amount}>
        <Text style={styles.caption}>Betrag</Text>
        <Text style={styles.amountValue}>
          {amountCents !== undefined ? formatCents(amountCents) : formatEuroCents(challenge.bountyAmount ?? 0)}
        </Text>
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
          message={tAbout(recipient, '{firstName} hat noch keine Zahlungsdaten freigegeben. Frage am besten in den Kommentaren nach.', { firstName: recipient.firstName })}
        />
      ) : null}
      <CopyField label="Verwendungszweck" value={t('KiezCoins: {title}', { title: challenge.title })} />
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
