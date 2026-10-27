import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useBeforeAfterStartForm } from '../../../components/compose/BeforeAfterForm';
import { GROUP_TYPES } from '../../../components/compose/ComposeSheet';
import { useComposeContent } from '../../../components/compose/compose';
import { useGroupTaskForm } from '../../../components/compose/GroupTaskForm';
import { TypeSwitch } from '../../../components/compose/TypeSwitch';
import { SubScreen } from '../../../components/Screen';
import { useStore } from '../../../data/store';
import { useGoBack } from '../../../lib/goBack';

/**
 * Route `gruppen/[id]/aufgabe`: Gruppenaufgabe mit 1 bis 10 Edensteinen. Foto optional, kein Ort, kein Entwurf.
 * Der Schalter oben wechselt zur Me-Challenge in dieser Gruppe (Daria, 27.10.2026), wie im Erstellen-Blatt über dem Feed.
 * Mit `copyOf` (aus „Deine Challenges“, „Kopie erstellen“) startet sie mit Foto, Titel, Text und Edensteinen einer alten Aufgabe.
 */
export default function NewGroupTask() {
  const { id, copyOf } = useLocalSearchParams<{ id: string; copyOf?: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { groups, challenges } = useStore();
  const group = groups.find((g) => g.id === id);
  const original = copyOf ? challenges.find((c) => c.id === copyOf) : undefined;
  const [type, setType] = useState<(typeof GROUP_TYPES)[number]['key']>('task');
  // Foto, Titel und Text bleiben beim Wechsel des Typs erhalten
  const shared = useComposeContent({ photo: original?.image, title: original?.title, text: original?.text });
  const task = useGroupTaskForm(id, { edensteine: original?.edensteine }, (taskId) => router.replace(`/challenge/${taskId}`), shared);
  const ba = useBeforeAfterStartForm(id, (draftId) => router.replace({ pathname: '/vorher-nachher/[id]', params: { id: draftId } }), shared);
  const isBa = type === 'before_after';
  return (
    <SubScreen
      title="Aufgabe erstellen"
      subtitle={group?.name}
      navigation="close"
      onLeadingPress={goBack}
      actions={isBa ? ba.button : task.button}
    >
      <TypeSwitch options={GROUP_TYPES} value={type} onChange={setType} />
      {isBa ? ba.fields : task.fields}
    </SubScreen>
  );
}
