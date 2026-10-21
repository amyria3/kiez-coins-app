import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../../components/Button';
import { PhotoPicker, TextField } from '../../../../components/Form';
import { SubScreen } from '../../../../components/Screen';
import { useChallenge, useStore } from '../../../../data/store';
import type { ImageSource } from '../../../../data/types';
import { color, text } from '../../../../theme/tokens';
import { NudgeArea, useNudge } from '../../../../components/Nudge';

/**
 * Route `challenge/[id]/report` (Modal). Figma: `challenge/report`, Flow „Challenge erfüllen“.
 * Bei Bounty-Challenges folgt direkt `report/payout` (Zahlungsdaten freigeben).
 */
export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { dispatch } = useStore();
  const { challenge, author } = useChallenge(id);
  const [photo, setPhoto] = useState<ImageSource>();
  const [note, setNote] = useState('');
  const photoField = useNudge();

  if (!challenge || !author) return null;

  const send = () => {
    if (!photo) return;
    dispatch({ type: 'report', id: challenge.id, report: { photo, note: note.trim() || undefined } });
    router.replace(
      challenge.bountyAmount ? `/challenge/${challenge.id}/report/payout` : `/challenge/${challenge.id}/report/success`,
    );
  };

  return (
    <SubScreen
      title="Erledigt melden"
      navigation="close"
      onLeadingPress={() => router.back()}
      actions={<Button label="Erledigung senden" onPress={send} disabled={!photo} whyDisabled={() => photoField.nudge('Mach ein Foto vom Ergebnis.')} />}
    >
      <Text style={styles.secondary}>
        Zeig, was Du geschafft hast. {author.firstName} sieht Dein Foto und bestätigt die Erledigung.
      </Text>
      <NudgeArea nudge={photoField}>
        <PhotoPicker photo={photo} hint="Ein Nachher-Foto ist Pflicht." onChange={(p) => (photoField.clear(), setPhoto(p))} />
      </NudgeArea>
      <TextField
        label="Notiz (optional)"
        helperText="Max. 280 Zeichen"
        value={note}
        onChangeText={setNote}
        maxLength={280}
        multiline
      />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  secondary: { ...text.body, color: color.text.secondary },
});
