import { useLocalSearchParams, useRouter } from 'expo-router';

import { useGroupTaskForm } from '../../../components/compose/GroupTaskForm';
import { SubScreen } from '../../../components/Screen';
import { useStore } from '../../../data/store';
import { useGoBack } from '../../../lib/goBack';

/**
 * Route `gruppen/[id]/aufgabe`: Gruppenaufgabe mit 1 bis 10 Edensteinen. Foto optional, kein Ort, kein Entwurf.
 * Mit `copyOf` (aus „Deine Challenges“, „Kopie erstellen“) startet sie mit Foto, Titel, Text und Edensteinen einer alten Aufgabe.
 * Neue Aufgaben aus dem Feed entstehen im Blatt über dem Feed (components/compose).
 */
export default function NewGroupTask() {
  const { id, copyOf } = useLocalSearchParams<{ id: string; copyOf?: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { groups, challenges } = useStore();
  const group = groups.find((g) => g.id === id);
  const original = copyOf ? challenges.find((c) => c.id === copyOf) : undefined;
  const { fields, button } = useGroupTaskForm(
    id,
    { photo: original?.image, title: original?.title, text: original?.text, edensteine: original?.edensteine },
    (taskId) => router.replace(`/challenge/${taskId}`),
  );
  return (
    <SubScreen title="Aufgabe erstellen" subtitle={group?.name} navigation="close" onLeadingPress={goBack} actions={button}>
      {fields}
    </SubScreen>
  );
}
