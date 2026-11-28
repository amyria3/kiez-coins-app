import { useEffect, useRef } from 'react';
import type { ViewToken } from 'react-native';

import { recordViews } from './remote';
import type { Challenge } from './types';

/**
 * Gesehen im Feed (Daria, 02.11.2026): Ein Post zählt als gesehen, wenn mindestens die Hälfte der Karte
 * eine Sekunde lang auf dem Bildschirm steht. Pro Person zählt jeder Post einmal (Primärschlüssel in
 * `challenge_views`), eigene Posts zählen nicht. Die App sammelt die Posts und schickt sie gebündelt.
 */
const VIEWABILITY = { itemVisiblePercentThreshold: 50, minimumViewTime: 1000 };
const FLUSH_MS = 3000;

// Schon geschickt in dieser Sitzung: spart doppelte Anfragen beim Hin- und Herscrollen
const sent = new Set<string>();

type PostItem = { kind: string; challenge?: Challenge; items?: { kind: string; challenge: Challenge }[] };

export function useFeedViews(active: boolean, currentUserId: string | undefined) {
  const pending = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const state = useRef({ active, currentUserId });
  state.current = { active, currentUserId };

  const flush = () => {
    timer.current = null;
    const ids = [...pending.current];
    pending.current.clear();
    if (!ids.length) return;
    ids.forEach((id) => sent.add(id));
    recordViews(ids).catch(() => ids.forEach((id) => sent.delete(id)));
  };

  // Beim Verlassen des Feeds den Rest schicken
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      flush();
    },
    [],
  );

  // FlatList verlangt eine Funktion, die sich nie ändert. Deshalb liest sie den Zustand aus dem Ref.
  const onViewableItemsChanged = useRef(({ changed }: { changed: ViewToken<PostItem>[] }) => {
    const { active: live, currentUserId: me } = state.current;
    if (!live || !me) return;
    for (const token of changed) {
      if (!token.isViewable) continue;
      // Desktop: Zwei Posts stehen als Paar in einer Zeile der Wand
      const shown = 
        token.item?.kind === 'post' && token.item.challenge
          ? [token.item.challenge]
          : (token.item?.items ?? []).filter((i) => i.kind === 'post').map((i) => i.challenge);
      for (const c of shown) {
        if (c.authorId === me || sent.has(c.id)) continue;
        pending.current.add(c.id);
      }
    }
    if (pending.current.size && !timer.current) timer.current = setTimeout(flush, FLUSH_MS);
  }).current;

  return { viewabilityConfig: VIEWABILITY, onViewableItemsChanged };
}
