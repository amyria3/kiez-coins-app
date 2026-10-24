import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from '../../../../components/T';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../../components/Button';
import { Notice } from '../../../../components/Content';
import { RadioOption, TextField } from '../../../../components/Form';
import { SubScreen } from '../../../../components/Screen';
import { errorText, reportChallenge } from '../../../../data/remote';
import { useChallenge, useStore } from '../../../../data/store';
import type { ChallengeReportReason } from '../../../../data/types';
import { color, space, text } from '../../../../theme/tokens';
import { NudgeArea, useNudge } from '../../../../components/Nudge';
import { useGoBack } from '../../../../lib/goBack';

const reasons: { key: ChallengeReportReason; label: string }[] = [
  { key: 'discrimination', label: 'Sexismus, Rassismus, Antisemitismus oder andere Diskriminierung' },
  { key: 'harassment', label: 'Belästigung, Beleidigung oder Bloßstellung' },
  { key: 'violence', label: 'Gewalt oder Aufruf zu Gewalt' },
  { key: 'dangerous', label: 'Gefährliche Aufgabe' },
  { key: 'illegal', label: 'Rechtswidriger Inhalt' },
  { key: 'spam', label: 'Spam oder Werbung' },
  { key: 'other', label: 'Etwas anderes' },
];

/**
 * Route `challenge/[id]/flag` (Modal): Challenge melden, Fahne im Detail.
 * Die Meldung landet in `challenge_reports` (Migration 20261021000700) und in der Moderation.
 */
export default function ChallengeFlagScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { mode } = useStore();
  const { challenge } = useChallenge(id);
  const [reason, setReason] = useState<ChallengeReportReason>();
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const reasonField = useNudge();
  const textField = useNudge();

  if (!challenge) return null;
  const needsText = reason === 'other' && !description.trim();

  const send = async () => {
    if (!reason) return;
    if (mode === 'live') {
      setSending(true);
      try {
        await reportChallenge({ challengeId: challenge.id, reason, description });
      } catch (error) {
        Alert.alert('Meldung nicht gesendet', errorText(error));
        return;
      } finally {
        setSending(false);
      }
    }
    router.replace(`/challenge/${challenge.id}/flag/success`);
  };

  return (
    <SubScreen
      title="Challenge melden"
      navigation="close"
      onLeadingPress={goBack}
      actions={<Button busy={sending} label="Meldung senden" disabled={!reason || needsText || sending}
          whyDisabled={() => (sending ? undefined : !reason ? reasonField.nudge('Wähle einen Grund.') : textField.nudge('Beschreibe kurz, was passiert ist.'))} onPress={send} />}
    >
      <Text style={styles.challenge} numberOfLines={2}>
        {challenge.title}
      </Text>
      <View style={styles.group}>
        <Text style={styles.title}>Was stimmt nicht?</Text>
        <Text style={styles.hint} onPress={() => router.push('/rechtliches/regeln')}>
          Community-Regeln lesen
        </Text>
        <NudgeArea nudge={reasonField}>
        {reasons.map((r) => (
          <RadioOption key={r.key} label={r.label} selected={reason === r.key} onPress={() => setReason(r.key)} />
        ))}
        </NudgeArea>
      </View>
      <TextField
        label="Beschreibung"
        nudge={textField}
        helperText="Max. 500 Zeichen. Bei „Etwas anderes“ Pflicht."
        value={description}
        onChangeText={setDescription}
        maxLength={500}
        multiline
      />
      <Notice
        variant="warning"
        message="Die Moderation prüft diese Challenge. Die Person, die sie erstellt hat, erfährt nicht, wer sie gemeldet hat. Wiederholt falsche Meldungen können aber zur Sperre führen."
      />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  challenge: { ...text.cardTitle, color: color.text.primary },
  group: { gap: space[8] },
  title: { ...text.title, color: color.text.primary },
  hint: { ...text.caption, color: color.text.secondary, textDecorationLine: 'underline' },
});
