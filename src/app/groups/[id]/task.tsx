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
 * Route `groups/[id]/task`: Gruppenaufgabe mit 1 bis 10 Edensteinen. Foto optional, kein Ort, kein Entwurf.
 * Der Schalter oben wechselt zur Me-Challenge oder zum Bild in dieser Gruppe (Daria, 27.10.2026), wie im Erstellen-Blatt über dem Feed.
 * Mit `copyOf` (aus „Deine Challenges“, „Kopie erstellen“) startet sie mit Foto, Titel, Text und Edensteinen einer alten Aufgabe.
 */
export default function NewGroupTask() {
  const { id, copyOf } = useLocalSearchParams<{ id: string; copyOf?: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { groups, challenges } = useStore();
  const group = groups.find((g) => g.id === id);
  const original = copyOf ? challenges.find((c) => c.id === copyOf) : undefined;
  const options = GROUP_TYPES;
  const [choice, setType] = useState<(typeof GROUP_TYPES)[number]['key']>('task');
  const type = options.some((o) => o.key === choice) ? choice : 'task';
  // Foto, Titel und Text bleiben beim Wechsel des Typs erhalten
  const shared = useComposeContent({ photo: original?.image, title: original?.title, text: original?.text });
  const task = useGroupTaskForm(id, { edensteine: original?.edensteine }, (taskId) => router.replace(`/challenge/${taskId}`), shared);
  const photo = useGroupPhotoForm(id, (postId) => router.replace(`/challenge/${postId}`), shared);
  const ba = useBeforeAfterStartForm(id, (draftId) => router.replace({ pathname: '/before-after/[id]', params: { id: draftId } }), shared);
  const form = type === 'before_after' ? ba : type === 'photo' ? photo : task;
  return (
    <SubScreen
      title={type === 'photo' ? 'Bild posten' : 'Aufgabe erstellen'}
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
