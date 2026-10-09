import { Alert, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthorRow } from '../../../components/AuthorRow';
import { BountyBadge, StatusBadge } from '../../../components/Badges';
import { Button } from '../../../components/Button';
import { InfoRow, KaterBubble, Notice } from '../../../components/Content';
import { SubScreen } from '../../../components/Screen';
import { formatRemaining } from '../../../data/format';
import { useChallenge, useStore } from '../../../data/store';
import { color, radius, space, text } from '../../../theme/tokens';

/**
 * Route `challenge/[id]` (Push). Figma: `challenge/detail` (Status open) und
 * `challenge/detail--accepted` (nur für die Person, die angenommen hat).
 */
export default function ChallengeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUserId, dispatch } = useStore();
  const { challenge, author } = useChallenge(id);

  if (!challenge || !author) {
    return (
      <SubScreen title="Challenge" navigation="back" onLeadingPress={() => router.back()}>
        <Text style={styles.secondary}>Diese Challenge gibt es nicht mehr.</Text>
      </SubScreen>
    );
  }

  const isAuthor = challenge.authorId === currentUserId;
  const isAssignee = challenge.assigneeId === currentUserId;
  const acceptedByMe = challenge.status === 'accepted' && isAssignee;
  const image = challenge.image ?? challenge.imageAfter;

  const giveBack = () =>
    Alert.alert('Challenge abgeben?', 'Die Challenge ist dann wieder für alle offen.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abgeben', style: 'destructive', onPress: () => dispatch({ type: 'giveBack', id: challenge.id }) },
    ]);

  let actions: React.ReactNode = null;
  if (challenge.status === 'open' && !isAuthor) {
    actions = <Button label="Challenge annehmen" onPress={() => dispatch({ type: 'accept', id: challenge.id })} />;
  } else if (acceptedByMe) {
    actions = (
      <>
        <Button label="Erledigt melden" onPress={() => router.push(`/challenge/${challenge.id}/report`)} />
        <Button label="Challenge abgeben" variant="secondary" onPress={giveBack} />
      </>
    );
  } else if (isAuthor && challenge.status === 'reported') {
    actions = <Button label="Erledigung prüfen" onPress={() => router.push(`/challenge/${challenge.id}/review`)} />;
  } else if (isAuthor && challenge.status === 'payment_open') {
    actions = <Button label="Bounty bezahlen" onPress={() => router.push(`/challenge/${challenge.id}/pay`)} />;
  } else if (isAssignee && challenge.status === 'paid_marked') {
    actions = <Button label="Bounty bestätigen" onPress={() => router.push(`/challenge/${challenge.id}/payment`)} />;
  }

  return (
    <SubScreen title="Challenge" navigation="back" onLeadingPress={() => router.back()} actions={actions}>
      <AuthorRow user={author} location={challenge.location} trailing={<StatusBadge status={challenge.status} />} />
      {acceptedByMe ? (
        <KaterBubble>
          Danke, dass Du anpackst! Mach am Ende ein Foto vom Ergebnis, dann kann {author.firstName} bestätigen.
        </KaterBubble>
      ) : null}
      {acceptedByMe && challenge.rejectionReason ? (
        <Notice
          variant="warning"
          message={`${author.firstName} hat die Erledigung abgelehnt: „${challenge.rejectionReason}“`}
        />
      ) : null}
      {image ? <Image source={image} style={styles.image} contentFit="cover" /> : null}
      <View style={styles.textBlock}>
        <Text style={styles.title}>{challenge.title}</Text>
        <Text style={styles.secondary}>{challenge.type === 'wave' ? challenge.challengeText : challenge.text}</Text>
      </View>
      <View style={styles.meta}>
        {challenge.bountyAmount ? (
          <View style={styles.bountyRow}>
            <BountyBadge amount={challenge.bountyAmount} />
            <Text style={styles.body}>Bounty für die Erledigung</Text>
          </View>
        ) : null}
        <InfoRow icon="clock" value={formatRemaining(challenge.deadline)} />
        <InfoRow icon="map-pin" value={challenge.location} />
      </View>
      {challenge.bountyAmount && !isAuthor ? (
        <Notice
          message={`${author.firstName} zahlt die Bounty direkt an Dich, zum Beispiel per Überweisung oder PayPal. Kiez Coins bewegt kein Geld, alles beruht auf Vertrauen.`}
        />
      ) : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 300, borderRadius: radius.md },
  textBlock: { gap: space[8] },
  title: { ...text.title, color: color.text.primary },
  body: { ...text.body, color: color.text.primary, flex: 1 },
  secondary: { ...text.body, color: color.text.secondary },
  meta: { gap: space[8] },
  bountyRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
});
