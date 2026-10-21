import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthorRow } from '../../../../components/AuthorRow';
import { Button } from '../../../../components/Button';
import { Notice } from '../../../../components/Content';
import { RadioOption, TextField } from '../../../../components/Form';
import { SubScreen } from '../../../../components/Screen';
import { nameInText } from '../../../../data/format';
import { errorText, reportUser } from '../../../../data/remote';
import { useChallenge, useStore } from '../../../../data/store';
import type { UserReportReason } from '../../../../data/types';
import { color, space, text } from '../../../../theme/tokens';
import { NudgeArea, useNudge } from '../../../../components/Nudge';

const reasons: { key: UserReportReason; label: string }[] = [
  { key: 'discrimination', label: 'Sexismus, Rassismus, Antisemitismus oder andere Diskriminierung' },
  { key: 'harassment', label: 'Belästigung, Beleidigung oder Bedrohung' },
  { key: 'violence', label: 'Gewalt oder Aufruf zu Gewalt' },
  { key: 'not_paid', label: 'Bounty wurde nicht gezahlt' },
  { key: 'spam', label: 'Spam oder Fake-Profil' },
  { key: 'other', label: 'Etwas anderes' },
];

/**
 * Route `user/[id]/report` (Modal). Figma: `user/report`, Flow „Bounty auf Vertrauen“.
 * Die Meldung landet in der Tabelle `user_reports`. Auswerten und Sperren macht die Moderation (`moderation`).
 * Gründe nach den Community-Regeln (`rechtliches/regeln`), Migration 20261021000700.
 */
export default function UserReportScreen() {
  const params = useLocalSearchParams<{ id: string; challengeId?: string; reason?: UserReportReason }>();
  const router = useRouter();
  const { users, mode } = useStore();
  const [sending, setSending] = useState(false);
  const user = users.find((u) => u.id === params.id);
  const { challenge } = useChallenge(params.challengeId);
  const [reason, setReason] = useState<UserReportReason | undefined>(params.reason);
  const [description, setDescription] = useState('');
  const reasonField = useNudge();
  const textField = useNudge();

  if (!user) return null;
  const needsText = reason === 'other' && !description.trim();
  const name = nameInText(user);

  const send = async () => {
    if (!reason) return;
    if (mode === 'live') {
      setSending(true);
      try {
        await reportUser({ reportedId: user.id, challengeId: challenge?.id, reason, description });
      } catch (error) {
        Alert.alert('Meldung nicht gesendet', errorText(error));
        return;
      } finally {
        setSending(false);
      }
    }
    router.replace(`/user/${user.id}/report/success`);
  };

  return (
    <SubScreen
      title="Person melden"
      navigation="close"
      onLeadingPress={() => router.back()}
      actions={
        <Button busy={sending}
          label="Meldung senden"
          disabled={!reason || needsText || sending}
          whyDisabled={() => (sending ? undefined : !reason ? reasonField.nudge('Wähl einen Grund.') : textField.nudge('Beschreib kurz, was passiert ist.'))}
          onPress={send}
        />
      }
    >
      <AuthorRow user={user} location={challenge?.location ?? ''} />
      <View style={styles.group}>
        <Text style={styles.title}>Was ist passiert?</Text>
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
        message={`Die Moderation sieht Deine Meldung${challenge ? ' und die Challenge' : ''}. ${name.charAt(0).toUpperCase() + name.slice(1)} ${user.group ? 'erfahren' : 'erfährt'} nicht, wer gemeldet hat. Falsche Meldungen können zur Sperre führen.`}
      />
      <Notice message="Bist Du in Gefahr? Ruf die Polizei unter 110." />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[8] },
  title: { ...text.title, color: color.text.primary },
  hint: { ...text.caption, color: color.text.secondary, textDecorationLine: 'underline' },
});
