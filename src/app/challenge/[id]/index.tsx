import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthorRow } from '../../../components/AuthorRow';
import { BountyBadge, StatusBadge } from '../../../components/Badges';
import { Button } from '../../../components/Button';
import { CommentSection } from '../../../components/Comments';
import { InfoRow, KaterBubble, Notice, OperationTag } from '../../../components/Content';
import { TextField } from '../../../components/Form';
import { SubScreen } from '../../../components/Screen';
import { formatDayMonthShort, formatEuro, formatRemaining, formatRemainingShort } from '../../../data/format';
import { useRequireKiez } from '../../../data/kiez';
import { useChallenge, useStore } from '../../../data/store';
import { color, radius, space, text } from '../../../theme/tokens';

// Vorschläge des Katers für den Operationsnamen (später aus einer Wortliste)
const operationNames = ['Operation Gießkanne', 'Operation Igelglück', 'Operation Besenstiel', 'Operation Sonnenschirm'];
const suggestName = (id: string) => operationNames[[...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % operationNames.length];

/**
 * Route `challenge/[id]` (Push). Figma: `challenge/detail` (Status open),
 * `challenge/detail--accepted` und `--accepted--named` (nur für die Person, die angenommen hat).
 */
export default function ChallengeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUserId, users, dispatch } = useStore();
  const { challenge, author } = useChallenge(id);
  const requireKiez = useRequireKiez();
  const [operationName, setOperationName] = useState(() => (id ? suggestName(id) : ''));

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
  const named = challenge.operationName !== undefined;
  const image = challenge.image ?? challenge.imageAfter;

  const giveBack = () =>
    Alert.alert('Challenge abgeben?', 'Die Challenge ist dann wieder für alle offen.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abgeben', style: 'destructive', onPress: () => dispatch({ type: 'giveBack', id: challenge.id }) },
    ]);

  let actions: React.ReactNode = null;
  if (challenge.status === 'open' && !isAuthor) {
    actions = <Button label="Challenge annehmen" onPress={() => requireKiez() && dispatch({ type: 'accept', id: challenge.id })} />;
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

  const amount = challenge.bountyAmount ? formatEuro(challenge.bountyAmount) : '';

  return (
    <SubScreen title="Challenge" navigation="back" onLeadingPress={() => router.back()} actions={actions}>
      <AuthorRow
        user={author}
        location={acceptedByMe ? (challenge.kiez ?? challenge.location) : challenge.location}
        trailing={<StatusBadge status={challenge.status} />}
      />
      {acceptedByMe ? (
        <>
          <KaterBubble>
            {named
              ? `Danke, dass Du anpackst! Mach am Ende ein Foto vom Ergebnis, dann kann ${author.firstName} bestätigen.`
              : 'Danke, dass Du anpackst! Taufen wir das Baby, Baby? Ich hätte da einen Namen für Deine Operation.'}
          </KaterBubble>
          <View style={styles.meta}>
            <InfoRow icon="clock" value={formatRemainingShort(challenge.deadline)} />
            {challenge.acceptedAt ? (
              <InfoRow icon="check" value={`Von Dir angenommen am ${formatDayMonthShort(challenge.acceptedAt)}`} />
            ) : null}
          </View>
          {challenge.rejectionReason ? (
            <Notice
              variant="warning"
              message={`${author.firstName} hat die Erledigung abgelehnt: „${challenge.rejectionReason}“`}
            />
          ) : null}
          {!named ? (
            <View style={styles.naming}>
              <TextField
                label="Operationsname (nur für Dich)"
                helperText="Vorschlag vom Kater. Ändern, übernehmen oder leer lassen, die Taufe ist freiwillig."
                value={operationName}
                onChangeText={setOperationName}
                maxLength={40}
              />
              <Button
                label="Taufen"
                variant="secondary"
                onPress={() => dispatch({ type: 'nameOperation', id: challenge.id, name: operationName })}
              />
            </View>
          ) : null}
        </>
      ) : null}
      {image ? (
        <View>
          <Image source={image} style={styles.image} contentFit="cover" />
          {acceptedByMe && challenge.operationName ? <OperationTag name={challenge.operationName} /> : null}
        </View>
      ) : null}
      <View style={styles.textBlock}>
        <Text style={styles.title}>{challenge.title}</Text>
        <Text style={styles.secondary}>{challenge.type === 'wave' ? challenge.challengeText : challenge.text}</Text>
      </View>
      <View style={styles.meta}>
        {challenge.bountyAmount ? (
          <View style={styles.bountyRow}>
            <BountyBadge amount={challenge.bountyAmount} />
            <Text style={styles.body}>
              {acceptedByMe ? `zahlt ${author.firstName} direkt an Dich` : 'Bounty für die Erledigung'}
            </Text>
          </View>
        ) : null}
        {!acceptedByMe ? <InfoRow icon="clock" value={formatRemaining(challenge.deadline)} /> : null}
        <InfoRow icon="map-pin" value={challenge.location} />
      </View>
      {challenge.bountyAmount && !isAuthor ? (
        <Notice
          message={
            acceptedByMe
              ? `${author.firstName} zahlt die ${amount} direkt an Dich. Beim Erledigt-Melden gibst Du ${author.firstName} dafür Deine IBAN oder PayPal frei. Kiez Coins bewegt kein Geld, alles beruht auf Vertrauen.`
              : `${author.firstName} zahlt die Bounty direkt an Dich, zum Beispiel per Überweisung oder PayPal. Kiez Coins bewegt kein Geld, alles beruht auf Vertrauen.`
          }
        />
      ) : null}
      {acceptedByMe ? (
        <CommentSection
          comments={challenge.comments}
          users={users}
          currentUserId={currentUserId}
          composerPlaceholder={`Frag ${author.firstName} …`}
          onSend={(body) => dispatch({ type: 'addComment', id: challenge.id, body })}
          onReport={(comment) =>
            router.push({ pathname: '/user/[id]/report', params: { id: comment.authorId, challengeId: challenge.id } })
          }
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
  naming: { gap: space[12] },
  bountyRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
});
