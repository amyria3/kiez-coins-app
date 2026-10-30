import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../../components/T';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGoBack } from '../../../../lib/goBack';
import { isSharedBounty, shareCentsOf } from '../../../../data/coins';

import { AuthorRow } from '../../../../components/AuthorRow';
import { Button } from '../../../../components/Button';
import { KaterBubble, Notice } from '../../../../components/Content';
import { RadioOption, SwitchRow, TextField } from '../../../../components/Form';
import { SubScreen } from '../../../../components/Screen';
import { formatCents, formatEuro, isValidIban, isValidPaypal, maskIbanShort } from '../../../../data/format';
import { useChallenge, useCurrentUser, useStore } from '../../../../data/store';
import type { PayoutMethod } from '../../../../data/types';
import { color, space, text } from '../../../../theme/tokens';
import { t, tAbout } from '../../../../data/texts';
import { useNudge } from '../../../../components/Nudge';

/**
 * Route `challenge/[id]/complete/payout` (Modal, direkt nach „Erledigung senden“, nur mit Bounty).
 * Figma: `challenge/report/payout` (gespeicherte Daten) und `--empty` (ohne gespeicherte Daten).
 * Pflichtschritt: ohne Methode keine Freigabe. Speichert eine Freigabe (`payout_share`) für diese Challenge.
 * `nur=1`: aus der Detailansicht, ohne Erledigt-Melden, z. B. für weitere Teilnehmende (Daria, 28.10.2026).
 * Danach geht es zurück statt zur Erfolgsseite.
 */
export default function PayoutShareScreen() {
  const { id, nur } = useLocalSearchParams<{ id: string; nur?: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const onlyShare = nur === '1';
  const { dispatch } = useStore();
  const me = useCurrentUser();
  const { challenge, author } = useChallenge(id);
  const saved = me.payout;
  const [method, setMethod] = useState<PayoutMethod>(saved?.iban ? 'iban' : 'paypal');
  const [accountHolder, setAccountHolder] = useState('');
  const [iban, setIban] = useState('');
  const [paypal, setPaypal] = useState('');
  const [saveToAccount, setSaveToAccount] = useState(true);

  if (!challenge || !author || !challenge.bountyAmount) return null;
  const name = author.firstName;
  // Mehrere Personen: Dein Anteil (geschätzt, bis die Erstellerin bestätigt)
  const shared = isSharedBounty(challenge);
  const amount = shared ? formatCents(shareCentsOf(challenge, me.id)) : formatEuro(challenge.bountyAmount);

  const ibanOk = isValidIban(iban) && accountHolder.trim().length > 0;
  const paypalOk = isValidPaypal(paypal);
  const canShare = saved ? true : ibanOk || paypalOk;
  const ibanField = useNudge();

  const share = () => {
    if (saved) {
      dispatch({ type: 'sharePayout', id: challenge.id, share: { method, payout: saved } });
    } else {
      const payout = {
        accountHolder: accountHolder.trim(),
        iban: ibanOk ? iban.trim() : '',
        paypal: paypalOk ? paypal.trim() : undefined,
      };
      if (saveToAccount) dispatch({ type: 'savePayout', payout });
      dispatch({ type: 'sharePayout', id: challenge.id, share: { method: ibanOk ? 'iban' : 'paypal', payout } });
    }
    if (onlyShare) goBack();
    else router.replace(`/challenge/${challenge.id}/complete/success`);
  };

  return (
    <SubScreen
      title="Zahlungsdaten freigeben"
      navigation="close"
      onLeadingPress={() => (onlyShare ? goBack() : router.dismissTo('/feed'))}
      actions={<Button label={t('Für {name} freigeben', { name })} onPress={share} disabled={!canShare}
          whyDisabled={() => ibanField.nudge('Gib Deine IBAN mit Kontoinhaber:in oder Deine PayPal-Adresse an.')}
        />}
    >
      <KaterBubble>
        {onlyShare
          ? tAbout(author, 'Wohin soll {name} Dir Deinen Anteil von {betrag} schicken?', { name, betrag: amount })
          : shared
            ? tAbout(author, 'Gemeldet! Wohin soll {name} Dir Deinen Anteil von {betrag} schicken?', { name, betrag: amount })
            : tAbout(author, 'Gemeldet! Wohin soll {name} Dir die {betrag} schicken?', { name, betrag: amount })}
        {saved ? '' : ` ${t('Gib mindestens Deine IBAN oder PayPal an.')}`}
      </KaterBubble>
      <View style={styles.group}>
        <Text style={styles.label}>Zahlt Dir die Coins</Text>
        <AuthorRow user={author} location={challenge.location} />
      </View>
      {saved ? (
        <>
          <View style={styles.group}>
            {saved.iban ? (
              <RadioOption
                label={`IBAN · ${maskIbanShort(saved.iban)}`}
                selected={method === 'iban'}
                onPress={() => setMethod('iban')}
              />
            ) : null}
            {saved.paypal ? (
              <RadioOption
                label={`PayPal · ${saved.paypal}`}
                selected={method === 'paypal'}
                onPress={() => setMethod('paypal')}
              />
            ) : null}
          </View>
          <Button label="Zahlungsdaten bearbeiten" variant="secondary" onPress={() => router.push('/account/payout')} />
          <Notice
            message={
              author.group
                ? t('Ohne Zahlungsdaten kann {name} nicht zahlen. {name} sieht Deine Daten erst, wenn Du die Challenge erledigt hast und sie sie bestätigt hat. Alles beruht auf Vertrauen.', { name })
                : // Pronomen nach dem Geschlecht der Person (Daria, 24.10.2026), unbestimmt mit Namen
                  tAbout(author, 'Ohne Zahlungsdaten kann {name} nicht zahlen. {name} sieht Deine Daten erst, wenn Du die Challenge erledigt hast und {name} sie bestätigt hat. Alles beruht auf Vertrauen.', { name })
            }
          />
        </>
      ) : (
        <>
          <TextField
            label="Kontoinhaber:in"
            helperText="So wie bei Deiner Bank hinterlegt."
            value={accountHolder}
            onChangeText={setAccountHolder}
            autoComplete="name"
          />
          <TextField
            label="IBAN"
        nudge={ibanField}
            helperText="IBAN oder PayPal, mindestens eins von beiden."
            error={iban.trim() && !isValidIban(iban) ? 'Diese IBAN stimmt nicht. Bitte prüfe sie noch einmal.' : undefined}
            value={iban}
            onChangeText={setIban}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TextField
            label="PayPal"
            helperText="E-Mail-Adresse oder paypal.me-Link."
            value={paypal}
            onChangeText={setPaypal}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <SwitchRow
            label="In meinem Konto speichern"
            description="Dann musst Du sie nächstes Mal nicht neu eingeben."
            value={saveToAccount}
            onValueChange={setSaveToAccount}
          />
          <Notice
            message={tAbout(author, 'Ohne Zahlungsdaten kann {name} nicht zahlen, deshalb ist eine Methode Pflicht. {name} sieht sie erst nach der Bestätigung und nur für diese Challenge. Alles beruht auf Vertrauen.', { name })}
          />
        </>
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[8] },
  label: { ...text.caption, color: color.text.secondary },
});
