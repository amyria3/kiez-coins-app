import { router } from 'expo-router';

import { useStore } from '../data/store';
import type { ImageSource } from '../data/types';
import { FieldGroup } from './Content';
import { Chip, ChipGroup } from './Form';

type Carry = { title?: string; text?: string; photo?: ImageSource };

const uriOf = (photo?: ImageSource) =>
  typeof photo === 'object' && photo && 'uri' in photo && typeof photo.uri === 'string' ? photo.uri : undefined;

/**
 * „Wo posten?“ beim Erstellen: öffentlich im Kiez oder in einer Deiner Gruppen (Daria, 22.10.2026).
 * Wechseln behält Titel, Text und Foto. Ohne Gruppen erscheint nichts.
 */
export function PostTarget({ current, carry }: { current: 'public' | string; carry: Carry }) {
  const { groups } = useStore();
  if (!groups.length) return null;
  const params = {
    ...(carry.title ? { title: carry.title } : {}),
    ...(carry.text ? { text: carry.text } : {}),
    ...(uriOf(carry.photo) ? { photo: uriOf(carry.photo) } : {}),
  };
  const choose = (target: 'public' | string) => {
    if (target === current) return;
    // Erst zurück zum Feed, dann den passenden Flow öffnen
    router.dismissTo('/feed');
    setTimeout(() => {
      if (target === 'public') router.push({ pathname: '/challenge/create/step-1', params });
      else router.push({ pathname: '/gruppen/[id]/aufgabe', params: { id: target, ...params } });
    }, 50);
  };
  return (
    <FieldGroup label="Wo posten?">
      <ChipGroup>
        <Chip label="Öffentlich" selected={current === 'public'} onPress={() => choose('public')} />
        {groups.map((g) => (
          <Chip key={g.id} label={g.name} selected={current === g.id} onPress={() => choose(g.id)} />
        ))}
      </ChipGroup>
    </FieldGroup>
  );
}
