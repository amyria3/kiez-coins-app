import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { FieldGroup } from '../../../components/Content';
import { Chip, ChipGroup, TextField } from '../../../components/Form';
import { SubScreen } from '../../../components/Screen';
import { formatRemainingShort } from '../../../data/format';
import { useChallenge, useStore } from '../../../data/store';
import { color, text } from '../../../theme/tokens';

const presets = [5, 15, 50];
const durations = [
  { days: 1, label: '1 Tag' },
  { days: 3, label: '3 Tage' },
  { days: 7, label: '1 Woche' },
  { days: 30, label: '1 Monat' },
];

/**
 * Route `challenge/[id]/edit` (Modal). Eigene Challenge bearbeiten, solange niemand sie angenommen hat:
 * Titel, Text, Ort, Bounty und Frist. Die Frist bleibt, bis eine neue gewählt wird.
 */
export default function EditChallenge() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUserId, canOfferBounties, dispatch } = useStore();
  const { challenge } = useChallenge(id);

  const [title, setTitle] = useState(challenge?.title ?? '');
  const [body, setBody] = useState(challenge?.text ?? '');
  const [location, setLocation] = useState(challenge?.location ?? '');
  const [bounty, setBounty] = useState<number | undefined>(challenge?.bountyAmount);
  const [durationDays, setDurationDays] = useState<number | null>(null);

  const editable =
    !!challenge && challenge.authorId === currentUserId && challenge.status === 'open' && !challenge.assigneeId;

  if (!challenge || !editable) {
    return (
      <SubScreen title="Challenge bearbeiten" navigation="close" onLeadingPress={() => router.back()}>
        <Text style={styles.secondary}>
          Diese Challenge lässt sich nicht mehr bearbeiten, da sie schon angenommen wurde.
        </Text>
      </SubScreen>
    );
  }

  const bountyOptions = bounty && !presets.includes(bounty) ? [...presets, bounty].sort((a, b) => a - b) : presets;
  const canSave = title.trim().length > 0 && title.trim().length <= 60 && location.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    if (bounty && bounty > (challenge.bountyAmount ?? 0) && !canOfferBounties) {
      Alert.alert('Keine Bounty möglich', 'Du kannst gerade keine Bounties anbieten oder erhöhen.');
      return;
    }
    dispatch({
      type: 'edit',
      id: challenge.id,
      edit: {
        title: title.trim(),
        text: body.trim(),
        location: location.trim(),
        bountyAmount: bounty,
        deadline: durationDays
          ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
          : challenge.deadline,
      },
    });
    router.back();
  };

  return (
    <SubScreen
      title="Challenge bearbeiten"
      navigation="close"
      onLeadingPress={() => router.back()}
      actions={<Button label="Speichern" onPress={save} disabled={!canSave} />}
    >
      <TextField label="Titel" value={title} onChangeText={setTitle} maxLength={60} />
      <TextField label="Beschreibung" value={body} onChangeText={setBody} maxLength={500} multiline />
      <TextField label="Ort" value={location} onChangeText={setLocation} maxLength={120} />
      <FieldGroup label="Bounty">
        <ChipGroup>
          <Chip label="Keine" selected={bounty === undefined} onPress={() => setBounty(undefined)} />
          {bountyOptions.map((amount) => (
            <Chip key={amount} label={`${amount} €`} selected={bounty === amount} onPress={() => setBounty(amount)} />
          ))}
        </ChipGroup>
      </FieldGroup>
      <FieldGroup label="Frist">
        <ChipGroup>
          <Chip label="Unverändert" selected={durationDays === null} onPress={() => setDurationDays(null)} />
          {durations.map(({ days, label }) => (
            <Chip key={days} label={label} selected={durationDays === days} onPress={() => setDurationDays(days)} />
          ))}
        </ChipGroup>
        <Text style={styles.secondary}>
          {durationDays ? `Neue Frist ab jetzt: ${durations.find((d) => d.days === durationDays)?.label}.` : formatRemainingShort(challenge.deadline)}
        </Text>
      </FieldGroup>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  secondary: { ...text.caption, color: color.text.secondary },
});
