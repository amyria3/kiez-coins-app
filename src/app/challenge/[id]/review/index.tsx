import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../../components/T';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthorRow } from '../../../../components/AuthorRow';
import { StatusBadge } from '../../../../components/Badges';
import { Button } from '../../../../components/Button';
import { FieldGroup, KaterBubble } from '../../../../components/Content';
import { CheckOption } from '../../../../components/Form';
import { splitCents } from '../../../../data/coins';
import { SubScreen } from '../../../../components/Screen';
import { formatCents, formatEuro, nameInText } from '../../../../data/format';
import { useChallenge, useStore } from '../../../../data/store';
import type { ImageSource } from '../../../../data/types';
import { color, radius, space, text } from '../../../../theme/tokens';
import { t } from '../../../../data/texts';
import { useGoBack } from '../../../../lib/goBack';
import { WithMentions } from '../../../../components/WithMentions';
import { joinedIds } from '../../../../data/weChallenge';

/** Route `challenge/[id]/review` (Push). Figma: `challenge/review`, Flow „Erledigung bestätigen“. Nur für die Ersteller:in. */
export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { dispatch, users } = useStore();
  const { challenge, assignee } = useChallenge(id);
  // Bestätigen je Person (Daria, 28.10.2026): alle vorausgewählt, Abgewählte bekommen weder Coins noch Edensteine
  const [unselected, setUnselected] = useState<Set<string>>(new Set());

  if (!challenge || !assignee || !challenge.report) return null;

  const ids = joinedIds(challenge);
  const multi = ids.length > 1;
  const selected = ids.filter((uid) => !unselected.has(uid));
  const people = selected.length;
  const toggle = (uid: string) =>
    setUnselected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  const confirm = () => {
    if (!people) return;
    dispatch({ type: 'confirm', id: challenge.id, ...(multi ? { userIds: selected } : {}) });
    // Mehrere Personen mit Coins oder die erste Person abgewählt: bezahlt wird je Person
    if (challenge.bountyAmount && (people > 1 || selected[0] !== assignee.id)) router.replace(`/challenge/${challenge.id}/pay`);
    else if (challenge.bountyAmount) router.replace(`/challenge/${challenge.id}/review/success`);
    else router.dismissTo('/feed');
  };
  const share = challenge.bountyAmount && people > 1 ? splitCents(challenge.bountyAmount, people) : undefined;

  const before = challenge.image ?? challenge.imageBefore;

  return (
    <SubScreen
      title="Erledigung prüfen"
      navigation="back"
      onLeadingPress={goBack}
      actions={
        <>
          <Button label="Bestätigen" onPress={confirm} disabled={!people} />
          <Button label="Ablehnen" variant="secondary" onPress={() => router.push(`/challenge/${challenge.id}/review/reject`)} />
        </>
      }
    >
      <AuthorRow user={assignee} location={assignee.location} trailing={<StatusBadge status="reported" challenge={challenge} />} />
      <Text style={styles.title}>{challenge.title}</Text>
      <View style={styles.beforeAfter}>
        {before ? <Photo label="Vorher" source={before} /> : null}
        <Photo label="Nachher" source={challenge.report.photo} />
      </View>
      {challenge.report.note ? (
        <View style={styles.note}>
          <Text style={styles.caption}>Notiz</Text>
          <Text style={styles.body}>
            <WithMentions value={`#nachher ${challenge.report.note}`} />
          </Text>
        </View>
      ) : null}
      {multi ? (
        <FieldGroup label="Wer hat mitgemacht?">
          {ids.map((uid) => {
            const user = users.find((u) => u.id === uid);
            return (
              <CheckOption key={uid} label={user?.name ?? ''} selected={!unselected.has(uid)} onPress={() => toggle(uid)} />
            );
          })}
          {unselected.size ? (
            <Button label="Alle auswählen" variant="ghost" onPress={() => setUnselected(new Set())} />
          ) : null}
          <Text style={styles.caption}>
            {people
              ? challenge.edensteine
                ? t('Nur Ausgewählte bekommen die Edensteine.')
                : share
                  ? t('Nur Ausgewählte bekommen Coins: {share} pro Person.', { share: formatCents(share[share.length - 1]) })
                  : t('Nur Ausgewählte bekommen die Belohnung.')
              : t('Wähle mindestens eine Person aus.')}
          </Text>
        </FieldGroup>
      ) : null}
      {challenge.bountyAmount && people > 1 ? (
        <KaterBubble>
          {t('Sieht gut aus? Wenn Du bestätigst, teilst Du die {betrag} unter {n} Personen auf und zahlst jeder ihren Anteil direkt. Die Zahlungsdaten siehst Du danach.', {
            betrag: formatEuro(challenge.bountyAmount),
            n: people,
          })}
        </KaterBubble>
      ) : challenge.bountyAmount ? (
        <KaterBubble>
          {t(
            assignee.group
              ? 'Sieht gut aus? Wenn Du bestätigst, zahlst Du die {betrag} direkt an {name}. Ihre Zahlungsdaten siehst Du danach.'
              : 'Sieht gut aus? Wenn Du bestätigst, zahlst Du die {betrag} direkt an {name}. Die Zahlungsdaten siehst Du danach.',
            { betrag: formatEuro(challenge.bountyAmount), name: nameInText(assignee) },
          )}
        </KaterBubble>
      ) : null}
    </SubScreen>
  );
}

function Photo({ label, source }: { label: string; source: ImageSource }) {
  return (
    <View style={styles.photo}>
      <Image source={source} style={styles.photoImage} contentFit="cover" accessibilityLabel={t('{label}-Foto', { label })} />
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
