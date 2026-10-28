import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { Text } from '../../../components/T';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { FieldGroup } from '../../../components/Content';
import { Chip, ChipGroup, PhotoPicker, TextField } from '../../../components/Form';
import { TagTextField } from '../../../components/compose/BeforeAfterForm';
import { PHOTO_TAG } from '../../../components/WithMentions';
import type { ImageSource } from '../../../data/types';
import { SubScreen } from '../../../components/Screen';
import { formatDayMonthShort, formatRemainingShort } from '../../../data/format';
import { useChallenge, useStore } from '../../../data/store';
import { color, text } from '../../../theme/tokens';
import { useNudge } from '../../../components/Nudge';
import { t, tAbout } from '../../../data/texts';
import { useGoBack } from '../../../lib/goBack';
import { RewardField, rewardOf, type RewardValue } from '../../../components/compose/RewardField';
import { bountyFits, clampBounty } from '../../../data/coins';
import { ParticipantsField } from '../../../components/compose/ParticipantsField';
import { MAX_MEMBERS } from '../../../data/groups';
import type { Participation } from '../../../data/remote';

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
  const goBack = useGoBack();
  const { currentUserId, canOfferBounties, dispatch } = useStore();
  const { challenge, assignee } = useChallenge(id);

  const [title, setTitle] = useState(challenge?.title ?? '');
  const [body, setBody] = useState(challenge?.text ?? '');
  const [location, setLocation] = useState(challenge?.location ?? '');
  // Kiez-We-Challenge: Edensteine oder Coins (Daria, 28.10.2026). Gruppenaufgaben behalten ihre Edensteine.
  const [rewardValue, setRewardValue] = useState<RewardValue>(() => {
    const eden = challenge?.groupId ? undefined : challenge?.edensteine;
    return { reward: rewardOf(eden, challenge?.bountyAmount), edensteine: eden, bountyAmount: challenge?.bountyAmount };
  });
  const reward = rewardValue.reward;
  const bounty = rewardValue.bountyAmount;
  const eden = rewardValue.edensteine;
  const [durationDays, setDurationDays] = useState<number | null>(null);
  // Mehrere Personen (Daria, 27.10.2026)
  const [participation, setParticipation] = useState<Participation>({
    max: challenge?.maxParticipants ?? 1,
    mode: challenge?.joinMode ?? 'open',
  });
  const [photo, setPhoto] = useState<ImageSource>();
  const titleField = useNudge();
  const locationField = useNudge();

  const own = !!challenge && challenge.authorId === currentUserId && !challenge.assigneeId;
  const deleted = own && challenge?.status === 'deleted';
  const editable = own && (challenge?.status === 'open' || deleted);

  if (!challenge || !editable) {
    return (
      <SubScreen title="Bearbeiten" navigation="close" onLeadingPress={goBack}>
        <Text style={styles.secondary}>
          {assignee
            ? tAbout(assignee, 'Diese Challenge lässt sich nicht mehr bearbeiten, weil {name} sie schon angenommen hat.', { name: assignee.firstName })
            : 'Diese Challenge lässt sich nicht mehr bearbeiten, da sie schon angenommen wurde.'}
        </Text>
      </SubScreen>
    );
  }

  const isGroup = !!challenge.groupId;
  const whyNot = () =>
    !title.trim() ? titleField.nudge('Gib einen Titel ein.') : locationField.nudge('Wo soll es stattfinden?');
  const canSave = title.trim().length > 0 && title.trim().length <= 60 && (isGroup || location.trim().length > 0);

  // Abgelaufene Frist einer gelöschten Challenge: läuft beim Veröffentlichen neu, so lang wie ursprünglich.
  const expired = new Date(challenge.deadline).getTime() <= Date.now();
  const renewed = () => {
    const original = new Date(challenge.deadline).getTime() - new Date(challenge.createdAt).getTime();
    return new Date(Date.now() + Math.max(original, DAY)).toISOString();
  };
  const isTask = challenge.type === 'individual';
  const participationChanged =
    isTask && (participation.max !== (challenge.maxParticipants ?? 1) || participation.mode !== (challenge.joinMode ?? 'open'));
  // Mit Coins: höchstens 10 Personen, pro Platz 5 bis 50 € (Daria, 28.10.2026)
  const changeParticipation = (next: Participation) => {
    setParticipation(next);
    if (reward === 'euro' && bounty !== undefined && !bountyFits(bounty, next.max)) {
      setRewardValue((r) => ({ ...r, bountyAmount: clampBounty(bounty, next.max) }));
    }
  };
  const editOf = () => ({
    title: title.trim(),
    text: body.trim(),
    location: location.trim(),
    bountyAmount: reward === 'euro' ? bounty : undefined,
    // Gruppenaufgabe: Edensteine nicht mitschicken, sonst wären sie in der App kurz weg
    ...(isGroup ? {} : { edensteine: reward === 'eden' ? eden : undefined }),
    deadline: durationDays
      ? new Date(Date.now() + durationDays * DAY).toISOString()
      : expired
        ? renewed()
        : challenge.deadline,
    ...(photo ? { photo } : {}),
    ...(participationChanged ? { participation } : {}),
  });
  const changed =
    title.trim() !== challenge.title ||
    body.trim() !== challenge.text ||
    location.trim() !== challenge.location ||
    (reward === 'euro' ? bounty : undefined) !== challenge.bountyAmount ||
    (!isGroup && (reward === 'eden' ? eden : undefined) !== challenge.edensteine) ||
    durationDays !== null ||
    participationChanged ||
    !!photo;
  const bountyBlocked = reward === 'euro' && !!bounty && bounty > (challenge.bountyAmount ?? 0) && !canOfferBounties;
  const backToManage = () => {
    router.dismissTo('/feed');
    router.push('/manage');
  };

  // Gelöschte Challenge veröffentlichen: zurückholen (mit gültiger Frist), dann die Änderungen speichern.
  const publish = () => {
    if (!canSave) return;
    if (reward === 'euro' && bounty && !canOfferBounties) {
      Alert.alert('Keine Coins möglich', 'Du kannst gerade keine Coins anbieten. Schalte „Das ist mir bares Geld wert“ aus.');
      return;
    }
    const edit = editOf();
    dispatch({ type: 'restore', id: challenge.id, deadline: edit.deadline });
    if (changed || expired) dispatch({ type: 'edit', id: challenge.id, edit });
    goBack();
  };

  // Gelöschte Challenge bleibt unveröffentlicht: in einem Schritt ändern (edit_deleted_challenge).
  const keepUnpublished = () => {
    if (!changed) return goBack();
    if (!canSave) return;
    if (reward === 'euro' && bounty && !canOfferBounties) {
      Alert.alert('Keine Coins möglich', 'Du kannst gerade keine Coins anbieten. Schalte „Das ist mir bares Geld wert“ aus.');
      return;
    }
    dispatch({ type: 'editDeleted', id: challenge.id, edit: editOf() });
    goBack();
  };

  // Nicht veröffentlichen: Änderungen speichern und die Challenge aus dem Feed nehmen (status deleted).
  // In „Deine Challenges“ unter „Archiv“ lässt sie sich wieder bearbeiten und veröffentlichen.
  const toDraft = () =>
    Alert.alert(
      'Doch nicht veröffentlichen?',
      'Die Challenge verschwindet aus dem Feed. Deine letzten Änderungen werden gespeichert. Du findest die Challenge in „Deine Challenges“ unter „Archiv“.',
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
      Alert.alert('Keine Coins möglich', 'Du kannst gerade keine Coins anbieten oder erhöhen.');
      return;
    }
    dispatch({ type: 'edit', id: challenge.id, edit: editOf() });
    goBack();
  };

  return (
    <SubScreen
      title={isGroup ? 'Aufgabe bearbeiten' : 'Challenge bearbeiten'}
      navigation="close"
      onLeadingPress={goBack}
      actions={
        deleted ? (
          <>
            <Button label="Veröffentlichen" onPress={publish} disabled={!canSave} whyDisabled={() => whyNot()} />
            <Button label="Nicht veröffentlichen, Entwurf" variant="ghost" onPress={keepUnpublished} />
          </>
        ) : (
          <>
            <Button label="Speichern" onPress={save} disabled={!canSave} whyDisabled={() => whyNot()} />
            <Button label="Nicht veröffentlichen, Entwurf" variant="ghost" onPress={toDraft} />
          </>
        )
      }
    >
      {/* Foto ändern oder hinzufügen, Titel direkt auf dem Foto wie beim Erstellen */}
      <PhotoPicker
        photo={photo ?? challenge.image}
        hint={isGroup ? 'Optional. Zeige, worum es geht.' : 'Zeige, wo geholfen werden soll.'}
        onChange={setPhoto}
        title={{ value: title, onChange: setTitle, nudge: titleField }}
      />
      {challenge.type === 'individual' ? (
        <TagTextField label="Beschreibung" tag="#vorher" placeholder="Was ist hier zu tun?" value={body} onChangeText={setBody} maxLength={500} />
      ) : challenge.type === 'photo' ? (
        <TagTextField label="Dein Text" tag={PHOTO_TAG} value={body} onChangeText={setBody} maxLength={500} />
      ) : (
        <TextField label="Beschreibung" value={body} onChangeText={setBody} maxLength={500} multiline />
      )}
      {isGroup ? null : (
        <>
          <TextField label="Ort" required nudge={locationField} value={location} onChangeText={setLocation} maxLength={120} />
          {challenge.type === 'photo' ? null : (
            <RewardField value={rewardValue} onChange={setRewardValue} places={participation.max} seed={challenge.id} />
          )}
        </>
      )}
      {isTask ? (
        <ParticipantsField
          value={participation}
          onChange={changeParticipation}
          limit={isGroup ? MAX_MEMBERS - 1 : undefined}
          coins={reward === 'euro'}
        />
      ) : null}
      <FieldGroup label="Zeitraum">
        <ChipGroup>
          <Chip label="Unverändert" selected={durationDays === null} onPress={() => setDurationDays(null)} />
          {durations.map(({ days, label }) => (
            <Chip key={days} label={label} selected={durationDays === days} onPress={() => setDurationDays(days)} />
          ))}
        </ChipGroup>
        <Text style={styles.secondary}>
          {durationDays
            ? t('Neu ab jetzt: {label}.', { label: durations.find((d) => d.days === durationDays)?.label })
            : expired
              ? t('Abgelaufen. Läuft beim Veröffentlichen neu bis {datum}.', { datum: formatDayMonthShort(renewed()) })
              : formatRemainingShort(challenge.deadline)}
        </Text>
      </FieldGroup>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  secondary: { ...text.caption, color: color.text.secondary },
});
