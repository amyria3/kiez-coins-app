import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { FieldGroup, Notice } from '../../../components/Content';
import { Chip, ChipGroup, TextField } from '../../../components/Form';
import { SubScreen } from '../../../components/Screen';
import { useStore } from '../../../data/store';
import { color, text } from '../../../theme/tokens';
import { useDraft } from './_layout';

const presets = [5, 15, 50];
const durations = [
  { days: 1, label: '1 Tag' },
  { days: 3, label: '3 Tage' },
  { days: 7, label: '1 Woche' },
  { days: 30, label: '1 Monat' },
];
const MIN_BOUNTY = 5;
const MAX_BOUNTY = 50;

/** Route `challenge/create/step-2`. Figma: `challenge/create/step-2`. Bounty 5–50 €, optional. */
export default function CreateStep2() {
  const router = useRouter();
  const { currentUserId, dispatch } = useStore();
  const [draft, setDraft] = useDraft();
  const [custom, setCustom] = useState(draft.bountyAmount !== undefined && !presets.includes(draft.bountyAmount));
  const [customText, setCustomText] = useState(custom && draft.bountyAmount ? String(draft.bountyAmount) : '');

  const customAmount = Number(customText.replace(',', '.'));
  const customError = !custom || !customText
    ? undefined
    : customAmount > MAX_BOUNTY
      ? 'Maximal 50 € möglich.'
      : customAmount < MIN_BOUNTY || !Number.isFinite(customAmount)
        ? 'Mindestens 5 € möglich.'
        : undefined;
  const bountyAmount = custom ? (customText && !customError ? Math.round(customAmount) : undefined) : draft.bountyAmount;
  const canPublish = draft.location.trim().length > 0 && !(custom && (customError || !customText));

  const publish = () => {
    if (!canPublish || !draft.photo) return;
    const id = `challenge-${Date.now()}`;
    const now = new Date();
    dispatch({
      type: 'create',
      challenge: {
        id,
        type: 'individual',
        title: draft.title.trim(),
        text: draft.text.trim(),
        authorId: currentUserId,
        location: draft.location.trim(),
        bountyAmount,
        status: 'open',
        image: draft.photo,
        likedByMe: false,
        createdAt: now.toISOString(),
        deadline: new Date(now.getTime() + draft.durationDays * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    router.replace({ pathname: '/challenge/create/success', params: { id } });
  };

  return (
    <SubScreen
      title="Challenge erstellen"
      subtitle="Schritt 2 von 2"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={<Button label="Challenge veröffentlichen" onPress={publish} disabled={!canPublish} />}
    >
      <TextField
        label="Ort"
        helperText="Vorschlag aus Deinem Standort. Du kannst ihn ändern."
        value={draft.location}
        onChangeText={(location) => setDraft((d) => ({ ...d, location }))}
      />
      <FieldGroup label="Bounty (optional)">
        <ChipGroup>
          <Chip
            label="Keine"
            selected={!custom && draft.bountyAmount === undefined}
            onPress={() => {
              setCustom(false);
              setDraft((d) => ({ ...d, bountyAmount: undefined }));
            }}
          />
          {presets.map((amount) => (
            <Chip
              key={amount}
              label={`${amount} €`}
              selected={!custom && draft.bountyAmount === amount}
              onPress={() => {
                setCustom(false);
                setDraft((d) => ({ ...d, bountyAmount: amount }));
              }}
            />
          ))}
          <Chip label="Eigener Betrag" selected={custom} onPress={() => setCustom(true)} />
        </ChipGroup>
        {custom ? (
          <TextField
            label="Betrag in €"
            keyboardType="number-pad"
            value={customText}
            onChangeText={(value) => {
              setCustomText(value);
              const n = Number(value.replace(',', '.'));
              setDraft((d) => ({ ...d, bountyAmount: n >= MIN_BOUNTY && n <= MAX_BOUNTY ? Math.round(n) : undefined }));
            }}
            error={customError}
            autoFocus
          />
        ) : null}
        <Text style={styles.secondary}>
          5 bis 50 €. Du zahlst die Bounty selbst direkt an die Person, die die Challenge erledigt.
        </Text>
      </FieldGroup>
      {bountyAmount ? (
        <Notice
          variant="warning"
          message="Versprich nur, was Du zahlen kannst. Wer eine Bounty nicht zahlt, kann gemeldet und für Bounties gesperrt werden."
        />
      ) : null}
      <FieldGroup label="Zeitraum">
        <ChipGroup>
          {durations.map(({ days, label }) => (
            <Chip
              key={days}
              label={label}
              selected={draft.durationDays === days}
              onPress={() => setDraft((d) => ({ ...d, durationDays: days }))}
            />
          ))}
        </ChipGroup>
      </FieldGroup>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  secondary: { ...text.caption, color: color.text.secondary },
});
