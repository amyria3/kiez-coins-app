import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthorRow } from '../../../../components/AuthorRow';
import { StatusBadge } from '../../../../components/Badges';
import { Button } from '../../../../components/Button';
import { Notice } from '../../../../components/Content';
import { PaymentDetails } from '../../../../components/PaymentDetails';
import { SubScreen } from '../../../../components/Screen';
import { Text } from '../../../../components/T';
import { useChallenge, useStore } from '../../../../data/store';
import { t, tAbout } from '../../../../data/texts';
import { color, space, text } from '../../../../theme/tokens';
import { useGoBack } from '../../../../lib/goBack';

/**
 * Route `challenge/[id]/pay` (Push, nur Ersteller:in, nach confirmed). Figma: `challenge/pay`,
 * Flow „Bounty auf Vertrauen“. Zeigt nur die für diese Challenge freigegebenen Zahlungsdaten.
 * Mehrere Personen (Daria, 28.10.2026): jede Person mit ihrem Anteil, als bezahlt markieren je Person.
 */
export default function PayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { dispatch, users } = useStore();
  const { challenge, assignee } = useChallenge(id);

  if (!challenge || !assignee || !challenge.bountyAmount) return null;

  const lines = challenge.payouts ?? [];

  // Eine Person: wie bisher (auch wenn beim Bestätigen nur eine andere als die erste übrig blieb)
  if (lines.length <= 1) {
    const recipient = (lines[0] && users.find((u) => u.id === lines[0].userId)) || assignee;
    const markPaid = () => {
      dispatch({ type: 'markPaid', id: challenge.id });
      router.replace(`/challenge/${challenge.id}/pay/success`);
    };
    return (
      <SubScreen
        title="Coins bezahlen"
        navigation="back"
        onLeadingPress={goBack}
        actions={
          <>
            <Button label="Als bezahlt markieren" onPress={markPaid} />
            <Button label="Muss ich noch machen" variant="signal" onPress={() => router.dismissTo('/feed')} />
          </>
        }
      >
        <AuthorRow user={recipient} location={recipient.location} trailing={<StatusBadge status={challenge.status} challenge={challenge} />} />
        <PaymentDetails challenge={challenge} recipient={recipient} noticeFirst amountCents={lines[0]?.amountCents} share={lines[0] ? challenge.payoutShares?.[lines[0].userId] ?? challenge.payoutShare : undefined} />
      </SubScreen>
    );
  }

  const open = lines.filter((l) => !l.paidMarkedAt).length;
  return (
    <SubScreen
      title="Coins bezahlen"
      navigation="back"
      onLeadingPress={goBack}
      actions={<Button label={open ? 'Muss ich noch machen' : 'Fertig'} variant={open ? 'signal' : 'primary'} onPress={() => router.dismissTo('/feed')} />}
    >
      <Text style={styles.secondary}>
        {t('Die Coins werden geteilt. Zahle jeder Person ihren Anteil direkt und markiere ihn als bezahlt. Noch offen: {open} von {n}.', { open, n: lines.length })}
      </Text>
      {lines.map((line) => {
        const user = users.find((u) => u.id === line.userId);
        if (!user) return null;
        return (
          <View key={line.userId} style={styles.person}>
            <AuthorRow user={user} location={user.location} />
            {line.paidAt ? (
              <Notice message={tAbout(user, '{firstName} hat den Empfang bestätigt.', { firstName: user.firstName })} />
            ) : (
              <>
                <PaymentDetails
                  challenge={challenge}
                  recipient={user}
                  amountCents={line.amountCents}
                  share={challenge.payoutShares?.[line.userId]}
                />
                {line.paidMarkedAt ? (
                  <Button
                    label="Als unbezahlt markieren"
                    variant="secondary"
                    onPress={() => dispatch({ type: 'markParticipantPaid', id: challenge.id, userId: line.userId, paid: false })}
                  />
                ) : (
                  <Button
                    label="Als bezahlt markieren"
                    onPress={() => dispatch({ type: 'markParticipantPaid', id: challenge.id, userId: line.userId, paid: true })}
                  />
                )}
              </>
            )}
          </View>
        );
      })}
      <Notice message="Überweise jeden Anteil direkt. KiezCoins sieht und prüft keine Zahlungen, alles beruht auf Vertrauen." />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  secondary: { ...text.body, color: color.text.secondary },
  person: {
    gap: space[12],
    paddingBottom: space[16],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line.hairline,
  },
});
