import { useState } from 'react';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { Notice } from '../../components/Content';
import { TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { isValidIban } from '../../data/format';
import { useCurrentUser, useStore } from '../../data/store';

/** Route `settings/payout` (Push). Figma: `settings/payout`, Flow „Bounty auf Vertrauen“. */
export default function PayoutSettings() {
  const router = useRouter();
  const { dispatch } = useStore();
  const me = useCurrentUser();
  const [accountHolder, setAccountHolder] = useState(me.payout?.accountHolder ?? '');
  const [iban, setIban] = useState(me.payout?.iban ?? '');
  const [paypal, setPaypal] = useState(me.payout?.paypal ?? '');
  const [showErrors, setShowErrors] = useState(false);

  const holderError = !accountHolder.trim() ? 'Bitte gib den Namen der Kontoinhaber:in ein.' : undefined;
  const ibanError = !isValidIban(iban) ? 'Diese IBAN stimmt nicht. Bitte prüf sie noch einmal.' : undefined;

  const save = () => {
    if (holderError || ibanError) {
      setShowErrors(true);
      return;
    }
    dispatch({
      type: 'savePayout',
      payout: { accountHolder: accountHolder.trim(), iban: iban.trim(), paypal: paypal.trim() || undefined },
    });
    router.back();
  };

  return (
    <SubScreen
      title="Zahlungsdaten"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={<Button label="Speichern" onPress={save} />}
    >
      <Notice message="Kiez Coins bewegt kein Geld. Deine Daten sieht nur, wem Du sie für eine Challenge freigibst." />
      <TextField
        label="Kontoinhaber:in"
        helperText="So wie bei Deiner Bank hinterlegt."
        error={showErrors ? holderError : undefined}
        value={accountHolder}
        onChangeText={setAccountHolder}
        autoComplete="name"
      />
      <TextField
        label="IBAN"
        helperText="Wird geprüft, bevor Du speicherst."
        error={showErrors ? ibanError : undefined}
        value={iban}
        onChangeText={setIban}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <TextField
        label="PayPal (optional)"
        helperText="E-Mail-Adresse oder paypal.me-Link."
        value={paypal}
        onChangeText={setPaypal}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
    </SubScreen>
  );
}
