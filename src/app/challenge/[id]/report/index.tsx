import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from '../../../../components/T';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../../components/Button';
import { PhotoPicker } from '../../../../components/Form';
import { TagTextField } from '../../../../components/compose/BeforeAfterForm';
import { SubScreen } from '../../../../components/Screen';
import { useChallenge, useStore } from '../../../../data/store';
import type { ImageSource } from '../../../../data/types';
import { color, text } from '../../../../theme/tokens';
import { NudgeArea, useNudge } from '../../../../components/Nudge';
import { t } from '../../../../data/texts';
import { useGoBack } from '../../../../lib/goBack';

/**
 * Route `challenge/[id]/report` (Modal). Figma: `challenge/report`, Flow „Challenge erfüllen“.
 * Bei Bounty-Challenges folgt direkt `report/payout` (Zahlungsdaten freigeben).
 */
export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useGoBack();
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
      onLeadingPress={goBack}
      actions={<Button label="Erledigung senden" onPress={send} disabled={!photo} whyDisabled={() => photoField.nudge('Dokumentiere das Ergebnis.')} />}
    >
      <Text style={styles.secondary}>{t('Zeige, was Du geschafft hast. {firstName} sieht Dein Foto und bestätigt die Erledigung.', { firstName: author.firstName })}</Text>
      <NudgeArea nudge={photoField}>
        <PhotoPicker photo={photo} hint="Ein Nachher-Foto ist erforderlich." onChange={(p) => (photoField.clear(), setPhoto(p))} />
      </NudgeArea>
      {/* Die Notiz ist das Nachher, das Foto der Aufgabe das Vorher (Daria, 27.10.2026) */}
      <TagTextField
        label="Notiz (optional)"
        tag="#nachher"
        placeholder="Was hast Du gemacht?"
        value={note}
        onChangeText={setNote}
        maxLength={280}
      />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  secondary: { ...text.body, color: color.text.secondary },
});
