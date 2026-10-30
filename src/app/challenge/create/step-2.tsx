import { useState } from 'react';
import { Alert } from 'react-native';
import { useGlobalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { FieldGroup, Notice } from '../../../components/Content';
import { Chip, ChipGroup, SwitchRow, TextField } from '../../../components/Form';
import { t } from '../../../data/texts';
import { SubScreen } from '../../../components/Screen';
import { findPlace, roundCoords } from '../../../data/location';
import { useDraft, useSaveDraft } from './_layout';
import { useNudge } from '../../../components/Nudge';
import { useGoBack } from '../../../lib/goBack';
import { customAmountError, RewardField, rewardOf, type RewardValue } from '../../../components/compose/RewardField';
import { bountyFits, bountyPresets, clampBounty } from '../../../data/coins';
import { DEFAULT_PARTICIPATION, ParticipantsField } from '../../../components/compose/ParticipantsField';
import type { Participation } from '../../../data/remote';

const durations = [
  { days: 1, label: '1 Tag' },
  { days: 3, label: '3 Tage' },
  { days: 7, label: '1 Woche' },
  { days: 30, label: '1 Monat' },
];

/**
 * Route `challenge/create/step-2`. Figma: `challenge/create/step-2`.
 * Belohnung optional: Edensteine oder Coins („Das ist mir bares Geld wert“), nie beides. Weiter zur Vorschau.
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
  // Eigener Betrag als Text; undefined = einer der Vorschläge
  const [customText, setCustomText] = useState<string | undefined>(
    draft.bountyAmount !== undefined && !bountyPresets((draft.participation ?? DEFAULT_PARTICIPATION).max).includes(draft.bountyAmount)
      ? String(draft.bountyAmount)
      : undefined,
  );
  const [reward, setReward] = useState<RewardValue>({
    reward: rewardOf(draft.edensteine, draft.bountyAmount),
    edensteine: draft.edensteine,
    bountyAmount: draft.bountyAmount,
  });
  const changeReward = (next: RewardValue) => {
    setReward(next);
    setDraft((d) => ({ ...d, bountyAmount: next.reward === 'euro' ? next.bountyAmount : undefined, edensteine: next.reward === 'eden' ? next.edensteine : undefined }));
  };

  // Mehrere Personen: auch mit Coins, dann höchstens 10 und pro Platz 5 bis 50 € (Daria, 28.10.2026)
  const participation = draft.participation ?? DEFAULT_PARTICIPATION;
  const coins = reward.reward === 'euro';
  const changeParticipation = (next: Participation) => {
    setDraft((d) => ({ ...d, participation: next }));
    // Betrag in den neuen Bereich holen, eigener Betrag wird zum Vorschlag
    if (coins && reward.bountyAmount !== undefined && !bountyFits(reward.bountyAmount, next.max)) {
      setCustomText(undefined);
      changeReward({ ...reward, bountyAmount: clampBounty(reward.bountyAmount, next.max) });
    }
  };
  const places = participation.max;

  const customError = customText !== undefined ? customAmountError(customText, places) : undefined;
  const amountProblem = () => customError ?? customAmountError('0', places) ?? t('Wähle einen Betrag.');
  // Nur ein Bild: keine Coins
  const isChallenge = draft.type !== 'photo';
  const bountyAmount = isChallenge && coins ? reward.bountyAmount : undefined;
  const edensteine = isChallenge && reward.reward === 'eden' ? reward.edensteine : undefined;
  const amountOk = !isChallenge || !coins || (bountyAmount !== undefined && bountyFits(bountyAmount, places) && !customError);
  const canPublish = draft.location.trim().length > 0 && amountOk;

  // Veröffentlicht wird erst in der Vorschau.
  const preview = () => {
    if (!canPublish || !draft.photo) return;
    setDraft((d) => ({ ...d, bountyAmount, edensteine }));
    router.push('/challenge/create/preview');
  };

  return (
    <SubScreen
      title={isChallenge ? 'Challenge erstellen' : 'Bild posten'}
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
      {/* Nicht in „Überall“, nur im Kiez; ein Link öffnet den Beitrag trotzdem (Daria, 29.10.2026) */}
      {draft.private ? null : (
        <SwitchRow
          label="Auf einen Umkreis von 5 km begrenzen"
          description="Dann sehen den Beitrag nur Menschen in Deinem Kiez, nicht in „Überall“. Wer den Link bekommt, kann ihn trotzdem öffnen."
          value={!!draft.localOnly}
          onValueChange={(localOnly) => setDraft((d) => ({ ...d, localOnly }))}
        />
      )}
      {isChallenge ? (
      <>
      <ParticipantsField value={participation} onChange={changeParticipation} coins={coins} />
      <RewardField
        value={reward}
        onChange={changeReward}
        places={places}
        seed="neue-we-challenge"
        customText={customText}
        onCustomTextChange={setCustomText}
        amountNudge={amountField}
      />
      </>
      ) : null}
      {/* Ein Bild hat keinen Zeitraum, es ist keine Challenge (Daria, 30.10.2026) */}
      {isChallenge ? (
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
      ) : null}
    </SubScreen>
  );
}

