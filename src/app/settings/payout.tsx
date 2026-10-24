import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../components/T';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { Notice } from '../../components/Content';
import { SwitchRow, TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { isValidIban } from '../../data/format';
import { useCurrentUser, useStore } from '../../data/store';
import type { PayoutMethod } from '../../data/types';
import { color, space, text } from '../../theme/tokens';
import { useGoBack } from '../../lib/goBack';

/** Route `settings/payout` (Push). Figma: `settings/payout`, Flow „Bounty auf Vertrauen“. */
export default function PayoutSettings() {
  const router = useRouter();
  const goBack = useGoBack();
  const { dispatch } = useStore();
  const me = useCurrentUser();
  const [accountHolder, setAccountHolder] = useState(me.payout?.accountHolder ?? '');
  const [iban, setIban] = useState(me.payout?.iban ?? '');
  const [paypal, setPaypal] = useState(me.payout?.paypal ?? '');
  const [showErrors, setShowErrors] = useState(false);
  const { challenges, users } = useStore();
  // Freigaben dieser Person (payout_share). Zurückgezogene bleiben sichtbar, bis man den Screen verlässt.
  const [sharedIds] = useState(() => challenges.filter((c) => c.assigneeId === me.id && c.payoutShare).map((c) => c.id));
  const [revoked, setRevoked] = useState<Record<string, PayoutMethod>>({});

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
    goBack();
  };

  return (
    <SubScreen
      title="Zahlungsdaten"
      navigation="back"
      onLeadingPress={goBack}
      actions={<Button label="Speichern" onPress={save} />}
    >
      <Notice message="Kiez Coins bewegt kein Geld. Deine Daten sieht nur, wem Du sie für eine Challenge freigibst." />
      <TextField
        label="Kontoinhaber:in" required
        helperText="So wie bei Deiner Bank hinterlegt."
        error={showErrors ? holderError : undefined}
        value={accountHolder}
        onChangeText={setAccountHolder}
        autoComplete="name"
      />
      <TextField
        label="IBAN" required
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
      {sharedIds.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.title}>Freigegeben für</Text>
          <Text style={styles.caption}>
            Du gibst Deine Daten immer nur einzelnen Menschen frei, jeweils für eine Challenge. Schalte eine Freigabe
            aus, um sie zurückzuziehen.
          </Text>
          {sharedIds.map((id) => {
            const c = challenges.find((x) => x.id === id);
            const author = users.find((u) => u.id === c?.authorId);
            if (!c || !author) return null;
            const method = c.payoutShare?.method ?? revoked[id];
            return (
              <SwitchRow
                key={id}
                label={author.name}
                description={`${method === 'paypal' ? 'PayPal' : 'IBAN'} · ${c.title}`}
                value={Boolean(c.payoutShare)}
                onValueChange={(on) => {
                  if (on && revoked[id] && me.payout) {
                    dispatch({ type: 'sharePayout', id, share: { method: revoked[id], payout: me.payout } });
                  } else if (!on && c.payoutShare) {
                    setRevoked((r) => ({ ...r, [id]: c.payoutShare!.method }));
                    dispatch({ type: 'revokeShare', id });
                  }
                }}
              />
            );
          })}
        </View>
      ) : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[12] },
  title: { ...text.title, color: color.text.primary },
  caption: { ...text.caption, color: color.text.secondary },
});
