import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../../components/Button';
import { PhotoPicker, SwitchRow, TextField } from '../../../../components/Form';
import { SubScreen } from '../../../../components/Screen';
import { formatEuro, maskIban } from '../../../../data/format';
import { useChallenge, useCurrentUser, useStore } from '../../../../data/store';
import type { ImageSource } from '../../../../data/types';
import { color, space, text } from '../../../../theme/tokens';

/** Route `challenge/[id]/report` (Modal). Figma: `challenge/report`, Flow „Challenge erfüllen“. */
export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { dispatch } = useStore();
  const me = useCurrentUser();
  const { challenge, author } = useChallenge(id);
  const [photo, setPhoto] = useState<ImageSource>();
  const [note, setNote] = useState('');
  const [shareIban, setShareIban] = useState(Boolean(me.payout?.iban));
  const [sharePaypal, setSharePaypal] = useState(false);

  if (!challenge || !author) return null;
  const name = author.firstName;
  const hasPayout = Boolean(me.payout);

  const send = () => {
    if (!photo) return;
    dispatch({
      type: 'report',
      id: challenge.id,
      report: { photo, note: note.trim() || undefined, shareIban, sharePaypal },
    });
    router.replace(`/challenge/${challenge.id}/report/success`);
  };

  return (
    <SubScreen
      title="Erledigt melden"
      navigation="close"
      onLeadingPress={() => router.back()}
      actions={<Button label="Erledigung senden" onPress={send} disabled={!photo} />}
    >
      <Text style={styles.secondary}>Zeig, was Du geschafft hast. {name} sieht Dein Foto und bestätigt die Erledigung.</Text>
      <PhotoPicker photo={photo} hint="Ein Nachher-Foto ist Pflicht." onChange={setPhoto} />
      <TextField
        label="Notiz (optional)"
        helperText="Max. 280 Zeichen"
        value={note}
        onChangeText={setNote}
        maxLength={280}
        multiline
      />
      {challenge.bountyAmount ? (
        <View style={styles.section}>
          <Text style={styles.title}>Bounty empfangen ({formatEuro(challenge.bountyAmount)})</Text>
          <Text style={styles.secondary}>
            Gib {name} frei, wohin die Bounty gehen soll. {name} sieht die Daten erst nach der Bestätigung und nur für
            diese Challenge.
          </Text>
          {me.payout ? (
            <>
              <SwitchRow
                label={`IBAN für ${name} freigeben`}
                description={maskIban(me.payout.iban)}
                value={shareIban}
                onValueChange={setShareIban}
              />
              {me.payout.paypal ? (
                <SwitchRow
                  label={`PayPal für ${name} freigeben`}
                  description={me.payout.paypal}
                  value={sharePaypal}
                  onValueChange={setSharePaypal}
                />
              ) : null}
            </>
          ) : null}
          <Button
            label={hasPayout ? 'Zahlungsdaten bearbeiten' : 'Zahlungsdaten hinterlegen'}
            variant="secondary"
            onPress={() => router.push('/settings/payout')}
          />
        </View>
      ) : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[12] },
  title: { ...text.title, color: color.text.primary },
  secondary: { ...text.body, color: color.text.secondary },
});
