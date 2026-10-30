import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useBeforeAfterStartForm } from '../../../components/compose/BeforeAfterForm';
import { GROUP_TYPES } from '../../../components/compose/ComposeSheet';
import { useComposeContent } from '../../../components/compose/compose';
import { useGroupPhotoForm } from '../../../components/compose/GroupPhotoForm';
import { useGroupTaskForm } from '../../../components/compose/GroupTaskForm';
import { TypeSwitch } from '../../../components/compose/TypeSwitch';
import { SubScreen } from '../../../components/Screen';
import { useStore } from '../../../data/store';
import { useGoBack } from '../../../lib/goBack';

/**
 * Route `groups/[id]/task`: Gruppenaufgabe mit 1 bis 10 Edensteinen. Foto optional, kein Ort.
 * Der Schalter oben wechselt zur Me-Challenge oder zum Bild in dieser Gruppe (Daria, 27.10.2026), wie im Erstellen-Blatt über dem Feed.
 * Mit `copyOf` (aus „Deine Challenges“, „Kopie erstellen“) startet sie mit Foto, Titel, Text und Edensteinen einer alten Aufgabe.
 * Mit `draftId` (aus „Deine Challenges“, Entwürfe) bearbeitet sie einen Entwurf dieser Gruppe (Daria, 30.10.2026).
 * Dann gibt es nur We-Challenge und Bild: Vorher-Nachher hat einen eigenen Entwurf mit Timer.
 */
export default function NewGroupTask() {
  const { id, copyOf, draftId } = useLocalSearchParams<{ id: string; copyOf?: string; draftId?: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { groups, challenges } = useStore();
  const group = groups.find((g) => g.id === id);
  const draft = draftId ? challenges.find((c) => c.id === draftId && c.status === 'draft') : undefined;
  const original = draft ?? (copyOf ? challenges.find((c) => c.id === copyOf) : undefined);
  const options = draft ? GROUP_TYPES.filter((o) => o.key !== 'before_after') : GROUP_TYPES;
  const [choice, setType] = useState<(typeof GROUP_TYPES)[number]['key']>(draft?.type === 'photo' ? 'photo' : 'task');
  const type = options.some((o) => o.key === choice) ? choice : 'task';
  // Foto, Titel und Text bleiben beim Wechsel des Typs erhalten
  const shared = useComposeContent({ photo: original?.image, title: original?.title, text: original?.text });
  const participation = draft?.maxParticipants ? { max: draft.maxParticipants, mode: draft.joinMode ?? 'open' } : undefined;
  // Entwurf gespeichert: zurück, woher man kam
  const task = useGroupTaskForm(id, { edensteine: original?.edensteine, participation }, (taskId) => router.replace(`/challenge/${taskId}`), shared, goBack, draft);
  const photo = useGroupPhotoForm(id, (postId) => router.replace(`/challenge/${postId}`), shared, goBack, draft);
  const ba = useBeforeAfterStartForm(id, (baId) => router.replace({ pathname: '/before-after/[id]', params: { id: baId } }), shared);
  const form = type === 'before_after' ? ba : type === 'photo' ? photo : task;
  return (
    <SubScreen
      title={type === 'photo' ? 'Bild posten' : 'We-Challenge erstellen'}
      subtitle={group?.name}
      navigation="close"
      onLeadingPress={goBack}
      actions={form.button}
    >
      {options.length > 1 ? <TypeSwitch options={options} value={type} onChange={setType} /> : null}
      {form.fields}
    </SubScreen>
  );
}
