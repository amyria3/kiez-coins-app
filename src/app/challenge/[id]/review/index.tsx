import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthorRow } from '../../../../components/AuthorRow';
import { StatusBadge } from '../../../../components/Badges';
import { Button } from '../../../../components/Button';
import { KaterBubble } from '../../../../components/Content';
import { SubScreen } from '../../../../components/Screen';
import { formatEuro, nameInText } from '../../../../data/format';
import { useChallenge, useStore } from '../../../../data/store';
import type { ImageSource } from '../../../../data/types';
import { color, radius, space, text } from '../../../../theme/tokens';

/** Route `challenge/[id]/review` (Push). Figma: `challenge/review`, Flow „Erledigung bestätigen“. Nur für die Ersteller:in. */
export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { dispatch } = useStore();
  const { challenge, assignee } = useChallenge(id);

  if (!challenge || !assignee || !challenge.report) return null;

  const confirm = () => {
    dispatch({ type: 'confirm', id: challenge.id });
    if (challenge.bountyAmount) router.replace(`/challenge/${challenge.id}/review/success`);
    else router.dismissTo('/feed');
  };

  const before = challenge.image ?? challenge.imageBefore;

  return (
    <SubScreen
      title="Erledigung prüfen"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={
        <>
          <Button label="Bestätigen" onPress={confirm} />
          <Button label="Ablehnen" variant="secondary" onPress={() => router.push(`/challenge/${challenge.id}/review/reject`)} />
        </>
      }
    >
      <AuthorRow user={assignee} location={assignee.location} trailing={<StatusBadge status="reported" />} />
      <Text style={styles.title}>{challenge.title}</Text>
      <View style={styles.beforeAfter}>
        {before ? <Photo label="Vorher" source={before} /> : null}
        <Photo label="Nachher" source={challenge.report.photo} />
      </View>
      {challenge.report.note ? (
        <View style={styles.note}>
          <Text style={styles.caption}>Notiz</Text>
          <Text style={styles.body}>„{challenge.report.note}“</Text>
        </View>
      ) : null}
      {challenge.bountyAmount ? (
        <KaterBubble>
          Sieht gut aus? Wenn Du bestätigst, zahlst Du die {formatEuro(challenge.bountyAmount)} direkt an{' '}
          {nameInText(assignee)}. {assignee.group ? 'Ihre' : 'Die'} Zahlungsdaten siehst Du danach.
        </KaterBubble>
      ) : null}
    </SubScreen>
  );
}

function Photo({ label, source }: { label: string; source: ImageSource }) {
  return (
    <View style={styles.photo}>
      <Image source={source} style={styles.photoImage} contentFit="cover" accessibilityLabel={`${label}-Foto`} />
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...text.title, color: color.text.primary },
  body: { ...text.body, color: color.text.primary },
  caption: { ...text.caption, color: color.text.secondary },
  beforeAfter: { flexDirection: 'row', gap: space[8] },
  photo: { flex: 1, gap: space[4] },
  photoImage: { width: '100%', aspectRatio: 176.5 / 220, borderRadius: radius.md },
  note: { gap: space[4] },
});
