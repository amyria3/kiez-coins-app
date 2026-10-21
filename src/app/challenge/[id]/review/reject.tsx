import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from '../../../../components/T';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../../components/Button';
import { TextField } from '../../../../components/Form';
import { SubScreen } from '../../../../components/Screen';
import { useChallenge, useStore } from '../../../../data/store';
import { color, text } from '../../../../theme/tokens';

/** Route `challenge/[id]/review/reject` (Modal). Figma: `challenge/review/reject`. */
export default function RejectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { dispatch } = useStore();
  const { challenge, assignee } = useChallenge(id);
  const [reason, setReason] = useState('');
  const [showError, setShowError] = useState(false);

  if (!challenge || !assignee) return null;

  const confirmAnyway = () => {
    dispatch({ type: 'confirm', id: challenge.id });
    if (challenge.bountyAmount) router.replace(`/challenge/${challenge.id}/review/success`);
    else router.dismissTo('/feed');
  };

  const sendBack = () => {
    if (!reason.trim()) {
      setShowError(true);
      return;
    }
    dispatch({ type: 'reject', id: challenge.id, reason: reason.trim() });
    router.dismissTo('/feed');
  };

  return (
    <SubScreen
      title="Erledigung ablehnen"
      navigation="close"
      onLeadingPress={() => router.back()}
      actions={
        <>
          <Button label="Trotzdem bestätigen" onPress={confirmAnyway} />
          <Button label="Aufgabe zurück schicken" variant="signal" onPress={sendBack} />
          <Button
            label="Missbrauch melden"
            variant="danger"
            onPress={() => router.push(`/user/${assignee.id}/report?challengeId=${challenge.id}`)}
          />
        </>
      }
    >
      <Text style={styles.title}>Was fehlt noch?</Text>
      <TextField
        label="Begründung"
        helperText="Pflichtfeld, max. 280 Zeichen. Die Person sieht Deine Begründung."
        error={showError && !reason.trim() ? 'Bitte gib eine Begründung ein.' : undefined}
        value={reason}
        onChangeText={setReason}
        maxLength={280}
        multiline
      />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  title: { ...text.title, color: color.text.primary },
});
