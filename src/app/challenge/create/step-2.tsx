import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { Text } from '../../../components/T';
import { useGlobalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { FieldGroup, Notice } from '../../../components/Content';
import { Chip, ChipGroup, TextField } from '../../../components/Form';
import { t } from '../../../data/texts';
import { SubScreen } from '../../../components/Screen';
import { color, text } from '../../../theme/tokens';
import { findPlace, roundCoords } from '../../../data/location';
import { useDraft, useSaveDraft } from './_layout';
import { useNudge } from '../../../components/Nudge';
import { useGoBack } from '../../../lib/goBack';
import { EdensteinStepper } from '../../../components/compose/EdensteinStepper';
import { DEFAULT_PARTICIPATION, ParticipantsField } from '../../../components/compose/ParticipantsField';
import type { Participation } from '../../../data/remote';

const presets = [5, 15, 50];
const durations = [
  { days: 1, label: '1 Tag' },
  { days: 3, label: '3 Tage' },
  { days: 7, label: '1 Woche' },
  { days: 30, label: '1 Monat' },
];
const MIN_BOUNTY = 5;
const MAX_BOUNTY = 50;

/** Belohnung: keine, Euro oder Edensteine (Daria, 27.10.2026: Edensteine sind die ideelle Währung, Ersatz für Euro) */
type Reward = 'none' | 'euro' | 'eden';
/** Vorgabe beim Wechsel zu Edensteinen, wie bei der Gruppenaufgabe */
const EDEN_START = 3;

/**
 * Route `challenge/create/step-2`. Figma: `challenge/create/step-2`.
 * Belohnung optional: Bounty 5–50 € oder 1–10 Edensteine, nie beides. Weiter zur Vorschau.
 */
export default function CreateStep2() {
  const router = useRouter();
  const goBack = useGoBack();
  const { from } = useGlobalSearchParams<{ from?: string }>();
  const [locating, setLocating] = useState(false);
  const locationField = useNudge();
  const amountField = useNudge();

  const useLocation = async () => {
    setLocating(true);
    try {
      const place = await findPlace();
      setDraft((d) => ({ ...d, location: place.street ?? place.kiez, coords: roundCoords(place.coords) }));
    } catch {
      Alert.alert('Standort nicht gefunden', 'Gib Deine PLZ von Hand ein oder erlaube den Standort in den Einstellungen.');
    } finally {
      setLocating(false);
    }
  };
  const [draft, setDraft] = useDraft();
  const { save, busy: saving } = useSaveDraft();
  const [custom, setCustom] = useState(draft.bountyAmount !== undefined && !presets.includes(draft.bountyAmount));
  const [customText, setCustomText] = useState(custom && draft.bountyAmount ? String(draft.bountyAmount) : '');
  const [reward, setReward] = useState<Reward>(draft.edensteine ? 'eden' : draft.bountyAmount !== undefined || custom ? 'euro' : 'none');
  const chooseReward = (next: Reward) => {
    setReward(next);
    if (next !== 'euro') setCustom(false);
    setDraft((d) => ({
      ...d,
      bountyAmount: next === 'euro' ? (d.bountyAmount ?? presets[0]) : undefined,
      edensteine: next === 'eden' ? (d.edensteine ?? EDEN_START) : undefined,
    }));
  };

  // Mehrere Personen: nur Edensteine, keine Coins in Euro (Daria, 27.10.2026)
  const participation = draft.participation ?? DEFAULT_PARTICIPATION;
  const many = participation.max > 1;
  const changeParticipation = (next: Participation) => {
    setDraft((d) => ({ ...d, participation: next }));
    if (next.max > 1 && reward === 'euro') chooseReward('eden');
  };

  const customAmount = Number(customText.replace(',', '.'));
  // Nur Ziffern, Komma oder Punkt (Daria, 24.10.2026: Fehler nennt den Grund)
  const badChars = /[^\d.,\s]/.test(customText) || !Number.isFinite(customAmount);
  const customError = !custom || !customText
    ? undefined
    : badChars
      ? 'Dieser Betrag enthält unerlaubte Zeichen.'
      : customAmount > MAX_BOUNTY
        ? 'Maximal 50 € möglich.'
        : customAmount < MIN_BOUNTY
          ? 'Mindestens 5 € möglich.'
          : undefined;
  const amountProblem = () =>
    !customText
      ? 'Mindestens 5 € möglich.'
      : badChars
        ? 'Dieser Betrag enthält unerlaubte Zeichen.'
        : customAmount > MAX_BOUNTY
          ? 'Dieser Betrag ist größer als erlaubt.'
          : customError ?? 'Mindestens 5 € möglich.';
  // Nur ein Bild: keine Coins
  const isChallenge = draft.type !== 'photo';
  const bountyAmount = !isChallenge || reward !== 'euro'
    ? undefined
    : custom
      ? customText && !customError
        ? Math.round(customAmount)
        : undefined
      : draft.bountyAmount;
  const edensteine = isChallenge && reward === 'eden' ? draft.edensteine : undefined;
  const canPublish = draft.location.trim().length > 0 && !(isChallenge && reward === 'euro' && custom && (customError || !customText));

  // Veröffentlicht wird erst in der Vorschau.
  const preview = () => {
    if (!canPublish || !draft.photo) return;
    setDraft((d) => ({ ...d, bountyAmount, edensteine }));
    router.push('/challenge/create/preview');
  };

  return (
    <SubScreen
      title="Challenge erstellen"
      subtitle="Schritt 2 von 2"
      navigation="back"
      // Aus dem Blatt über dem Feed: zurück ins Blatt, das noch offen ist
      onLeadingPress={() => (from === 'feed' ? router.dismissTo('/feed') : goBack())}
      actions={
        <>
          <Button label="Vorschau" onPress={preview} disabled={!canPublish || saving}
            whyDisabled={() =>
              saving ? undefined : !draft.location.trim() ? locationField.nudge('Wo soll es stattfinden?') : amountField.nudge(amountProblem())
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
        helperText="Vorschlag auf Grundlage Deines Standorts, ohne Hausnummer."
        value={draft.location}
        onChangeText={(location) => setDraft((d) => ({ ...d, location }))}
      />
      <Button busy={locating}
        label={locating ? 'Suche Standort …' : 'Aktuellen Standort verwenden'}
        variant="secondary"
        onPress={useLocation}
        disabled={locating}
      />
      <Notice message="Wähle einen öffentlich bekannten Ort, etwa einen Platz, eine Straßenecke oder ein Geschäft. Keine Wohnadresse. Sei sorgsam mit der Sicherheit anderer Menschen." />
      {isChallenge ? (
      <>
      <ParticipantsField value={participation} onChange={changeParticipation} withCoinsHint />
      <FieldGroup label="Belohnung (optional)">
        <ChipGroup>
          <Chip label="Keine" selected={reward === 'none'} onPress={() => chooseReward('none')} />
          {many ? null : <Chip label="Coins (€)" selected={reward === 'euro'} onPress={() => chooseReward('euro')} />}
          <Chip label="Edensteine" selected={reward === 'eden'} onPress={() => chooseReward('eden')} />
        </ChipGroup>
        <Text style={styles.secondary}>
          {reward === 'eden'
            ? 'Edensteine sind eine ideelle Währung. Sie kosten nichts und haben so viel Wert, wie Ihr ihnen zusprecht.'
            : 'Coins oder Edensteine, nie beides.'}
        </Text>
      </FieldGroup>
      {reward === 'euro' ? (
      <FieldGroup label="Coins">
        <ChipGroup>
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
          5 bis 50 €. Du zahlst die Coins selbst direkt an die Person, die die Challenge erledigt.
        </Text>
      </FieldGroup>
      ) : null}
      {reward === 'eden' ? (
      <FieldGroup label="Edensteine">
        <EdensteinStepper
          value={draft.edensteine ?? EDEN_START}
          onChange={(n) => setDraft((d) => ({ ...d, edensteine: n }))}
          seed="neue-we-challenge"
        />
        <Text style={styles.secondary}>1 bis 10.</Text>
      </FieldGroup>
      ) : null}
      {bountyAmount ? (
        <Notice
          variant="warning"
          message="Versprich nur, was Du zahlen kannst. Wer zugesagte Coins nicht zahlt, kann gemeldet und für Coins gesperrt werden."
        />
      ) : null}
      </>
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
