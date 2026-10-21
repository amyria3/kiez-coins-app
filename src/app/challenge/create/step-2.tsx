import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { FieldGroup, Notice } from '../../../components/Content';
import { Chip, ChipGroup, TextField } from '../../../components/Form';
import { SubScreen } from '../../../components/Screen';
import { color, text } from '../../../theme/tokens';
import { findPlace, roundCoords } from '../../../data/location';
import { useDraft, useSaveDraft } from './_layout';
import { useNudge } from '../../../components/Nudge';

const presets = [5, 15, 50];
const durations = [
  { days: 1, label: '1 Tag' },
  { days: 3, label: '3 Tage' },
  { days: 7, label: '1 Woche' },
  { days: 30, label: '1 Monat' },
];
const MIN_BOUNTY = 5;
const MAX_BOUNTY = 50;

/** Route `challenge/create/step-2`. Figma: `challenge/create/step-2`. Bounty 5–50 €, optional. Weiter zur Vorschau. */
export default function CreateStep2() {
  const router = useRouter();
  const [locating, setLocating] = useState(false);
  const locationField = useNudge();
  const amountField = useNudge();

  const useLocation = async () => {
    setLocating(true);
    try {
      const place = await findPlace();
      setDraft((d) => ({ ...d, location: place.street ?? place.kiez, coords: roundCoords(place.coords) }));
    } catch {
      Alert.alert('Standort nicht gefunden', 'Gib den Ort von Hand ein oder erlaube den Standort in den Einstellungen.');
    } finally {
      setLocating(false);
    }
  };
  const [draft, setDraft] = useDraft();
  const { save, busy: saving } = useSaveDraft();
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

  // Veröffentlicht wird erst in der Vorschau.
  const preview = () => {
    if (!canPublish || !draft.photo) return;
    setDraft((d) => ({ ...d, bountyAmount }));
    router.push('/challenge/create/preview');
  };

  return (
    <SubScreen
      title="Challenge erstellen"
      subtitle="Schritt 2 von 2"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={
        <>
          <Button label="Vorschau" onPress={preview} disabled={!canPublish || saving}
            whyDisabled={() =>
              saving ? undefined : !draft.location.trim() ? locationField.nudge('Wo soll es stattfinden?') : amountField.nudge('Gib einen gültigen Betrag ein.')
            }
          />
          <Button busy={saving}
            label={saving ? 'Wird gespeichert …' : 'Als Entwurf speichern'}
            variant="ghost"
            onPress={save}
            disabled={saving}
          />
        </>
      }
    >
      <TextField
        label="Ort" required
        nudge={locationField}
        helperText="Vorschlag aus Deinem Standort, ohne Hausnummer. Du kannst ihn ändern."
        value={draft.location}
        onChangeText={(location) => setDraft((d) => ({ ...d, location }))}
      />
      <Button busy={locating}
        label={locating ? 'Suche Standort …' : 'Aktuellen Standort verwenden'}
        variant="secondary"
        onPress={useLocation}
        disabled={locating}
      />
      <Notice message="Wähle einen öffentlich bekannten Ort, etwa einen Platz, eine Straßenecke oder einen Laden. Keine Wohnadresse. Sei sorgsam mit der Sicherheit anderer Menschen." />
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
        nudge={amountField}
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
