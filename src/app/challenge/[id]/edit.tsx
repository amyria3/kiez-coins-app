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
 * Gruppenaufgaben: ohne Ort und Bounty, die Edensteine bleiben.
 * „Nicht veröffentlichen, Entwurf“ nimmt die Challenge aus dem Feed: neuer Entwurf mit den Änderungen, dann wird die
 * veröffentlichte gelöscht (ohne Datenbankänderung möglich). Kommentare gehen dabei verloren.
 */
export default function EditChallenge() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUserId, canOfferBounties, dispatch, saveDraft } = useStore();
  const [busy, setBusy] = useState(false);
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
      <SubScreen title="Bearbeiten" navigation="close" onLeadingPress={() => router.back()}>
        <Text style={styles.secondary}>
          Diese Challenge lässt sich nicht mehr bearbeiten, da sie schon angenommen wurde.
        </Text>
      </SubScreen>
    );
  }

  const bountyOptions = bounty && !presets.includes(bounty) ? [...presets, bounty].sort((a, b) => a - b) : presets;
  const isGroup = !!challenge.groupId;
  const canSave = title.trim().length > 0 && title.trim().length <= 60 && (isGroup || location.trim().length > 0);

  const toDraft = () => {
    const comments = challenge.comments.length;
    Alert.alert(
      'Nicht veröffentlichen?',
      `Die Challenge verschwindet aus dem Feed und liegt mit Deinen Änderungen unter Entwürfe in „Deine Challenges“.${
        comments ? ` ${comments === 1 ? 'Der Kommentar geht' : `Die ${comments} Kommentare gehen`} dabei verloren.` : ''
      }`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entwurf',
          onPress: async () => {
            setBusy(true);
            try {
              await saveDraft(undefined, {
                title: title.trim(),
                text: body.trim(),
                location: location.trim(),
                bountyAmount: bounty,
                photo: challenge.image,
                imagePath: challenge.imagePath,
                extras: challenge.extraImages,
                coords: challenge.coords,
              });
              dispatch({ type: 'delete', id: challenge.id });
              router.dismissTo('/feed');
              router.push('/manage');
            } catch (error) {
              Alert.alert('Entwurf nicht gespeichert', (error as Error).message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

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
      title={isGroup ? 'Aufgabe bearbeiten' : 'Challenge bearbeiten'}
      navigation="close"
      onLeadingPress={() => router.back()}
      actions={
        <>
          <Button label="Speichern" onPress={save} disabled={!canSave || busy} />
          {isGroup ? null : (
            <Button
              label={busy ? 'Wird gespeichert …' : 'Nicht veröffentlichen, Entwurf'}
              variant="ghost"
              onPress={toDraft}
              disabled={busy || !title.trim()}
            />
          )}
        </>
      }
    >
      <TextField label="Titel" value={title} onChangeText={setTitle} maxLength={60} />
      <TextField label="Beschreibung" value={body} onChangeText={setBody} maxLength={500} multiline />
      {isGroup ? null : (
        <>
          <TextField label="Ort" value={location} onChangeText={setLocation} maxLength={120} />
          <FieldGroup label="Bounty">
            <ChipGroup>
              <Chip label="Keine" selected={bounty === undefined} onPress={() => setBounty(undefined)} />
              {bountyOptions.map((amount) => (
                <Chip key={amount} label={`${amount} €`} selected={bounty === amount} onPress={() => setBounty(amount)} />
              ))}
            </ChipGroup>
          </FieldGroup>
        </>
      )}
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
