import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { FieldGroup } from '../../../components/Content';
import { Chip, ChipGroup, TextField } from '../../../components/Form';
import { SubScreen } from '../../../components/Screen';
import { formatDayMonthShort, formatRemainingShort } from '../../../data/format';
import { useChallenge, useStore } from '../../../data/store';
import { color, text } from '../../../theme/tokens';

const presets = [5, 15, 50];
const durations = [
  { days: 1, label: '1 Tag' },
  { days: 3, label: '3 Tage' },
  { days: 7, label: '1 Woche' },
  { days: 30, label: '1 Monat' },
];

const DAY = 24 * 60 * 60 * 1000;

/**
 * Route `challenge/[id]/edit` (Modal). Eigene Challenge bearbeiten, solange niemand sie angenommen hat:
 * Titel, Text, Ort, Bounty und Frist. Die Frist bleibt, bis eine neue gewählt wird.
 * Gruppenaufgaben: ohne Ort und Bounty, die Edensteine bleiben.
 * „Nicht veröffentlichen, Entwurf“ speichert die Änderungen und nimmt die Challenge aus dem Feed (status deleted).
 * Gelöschte Challenges öffnet „Bearbeiten“ in „Deine Challenges“ hier: „Veröffentlichen“ holt sie samt Kommentaren
 * zurück, „Nicht veröffentlichen, Entwurf“ speichert nur die Änderungen.
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

  const own = !!challenge && challenge.authorId === currentUserId && !challenge.assigneeId;
  const deleted = own && challenge?.status === 'deleted';
  const editable = own && (challenge?.status === 'open' || deleted);

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

  // Abgelaufene Frist einer gelöschten Challenge: läuft beim Veröffentlichen neu, so lang wie ursprünglich.
  const expired = new Date(challenge.deadline).getTime() <= Date.now();
  const renewed = () => {
    const original = new Date(challenge.deadline).getTime() - new Date(challenge.createdAt).getTime();
    return new Date(Date.now() + Math.max(original, DAY)).toISOString();
  };
  const editOf = () => ({
    title: title.trim(),
    text: body.trim(),
    location: location.trim(),
    bountyAmount: bounty,
    deadline: durationDays
      ? new Date(Date.now() + durationDays * DAY).toISOString()
      : expired
        ? renewed()
        : challenge.deadline,
  });
  const changed =
    title.trim() !== challenge.title ||
    body.trim() !== challenge.text ||
    location.trim() !== challenge.location ||
    bounty !== challenge.bountyAmount ||
    durationDays !== null;
  const bountyBlocked = !!bounty && bounty > (challenge.bountyAmount ?? 0) && !canOfferBounties;
  const backToManage = () => {
    router.dismissTo('/feed');
    router.push('/manage');
  };

  // Gelöschte Challenge veröffentlichen: zurückholen (mit gültiger Frist), dann die Änderungen speichern.
  const publish = () => {
    if (!canSave) return;
    if (bounty && !canOfferBounties) {
      Alert.alert('Keine Bounty möglich', 'Du kannst gerade keine Bounties anbieten. Wähl „Keine“ als Bounty.');
      return;
    }
    const edit = editOf();
    dispatch({ type: 'restore', id: challenge.id, deadline: edit.deadline });
    if (changed || expired) dispatch({ type: 'edit', id: challenge.id, edit });
    router.back();
  };

  // Gelöschte Challenge bleibt unveröffentlicht. Die Datenbank ändert nur offene Challenges, deshalb kurz
  // zurückholen, ändern und wieder löschen.
  const keepUnpublished = () => {
    if (!changed) return router.back();
    if (!canSave) return;
    if (bounty && !canOfferBounties) {
      Alert.alert('Keine Bounty möglich', 'Du kannst gerade keine Bounties anbieten. Wähl „Keine“ als Bounty.');
      return;
    }
    const edit = editOf();
    dispatch({ type: 'restore', id: challenge.id, deadline: edit.deadline });
    dispatch({ type: 'edit', id: challenge.id, edit });
    dispatch({ type: 'delete', id: challenge.id });
    router.back();
  };

  // Nicht veröffentlichen: Änderungen speichern und die Challenge aus dem Feed nehmen (status deleted).
  // In „Deine Challenges“ unter „Gelöschte und geschlossene“ lässt sie sich wieder bearbeiten und veröffentlichen.
  const toDraft = () =>
    Alert.alert(
      'Nicht veröffentlichen?',
      'Die Challenge verschwindet mit Deinen Änderungen aus dem Feed. In „Deine Challenges“ unter „Gelöschte und geschlossene“ kannst Du sie wieder veröffentlichen.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Nicht veröffentlichen',
          onPress: () => {
            if (canSave) dispatch({ type: 'edit', id: challenge.id, edit: editOf() });
            dispatch({ type: 'delete', id: challenge.id });
            backToManage();
          },
        },
      ],
    );

  const save = () => {
    if (!canSave) return;
    if (bountyBlocked) {
      Alert.alert('Keine Bounty möglich', 'Du kannst gerade keine Bounties anbieten oder erhöhen.');
      return;
    }
    dispatch({ type: 'edit', id: challenge.id, edit: editOf() });
    router.back();
  };

  return (
    <SubScreen
      title={isGroup ? 'Aufgabe bearbeiten' : 'Challenge bearbeiten'}
      navigation="close"
      onLeadingPress={() => router.back()}
      actions={
        deleted ? (
          <>
            <Button label="Veröffentlichen" onPress={publish} disabled={!canSave} />
            <Button label="Nicht veröffentlichen, Entwurf" variant="ghost" onPress={keepUnpublished} />
          </>
        ) : (
          <>
            <Button label="Speichern" onPress={save} disabled={!canSave} />
            <Button label="Nicht veröffentlichen, Entwurf" variant="ghost" onPress={toDraft} />
          </>
        )
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
      <FieldGroup label="Zeitraum">
        <ChipGroup>
          <Chip label="Unverändert" selected={durationDays === null} onPress={() => setDurationDays(null)} />
          {durations.map(({ days, label }) => (
            <Chip key={days} label={label} selected={durationDays === days} onPress={() => setDurationDays(days)} />
          ))}
        </ChipGroup>
        <Text style={styles.secondary}>
          {durationDays
            ? `Neu ab jetzt: ${durations.find((d) => d.days === durationDays)?.label}.`
            : expired
              ? `Abgelaufen. Läuft beim Veröffentlichen neu bis ${formatDayMonthShort(renewed())}.`
              : formatRemainingShort(challenge.deadline)}
        </Text>
      </FieldGroup>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  secondary: { ...text.caption, color: color.text.secondary },
});
