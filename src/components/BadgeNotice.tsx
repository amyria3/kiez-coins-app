import { useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '../data/auth';
import { checkMyBadges } from '../data/badges';
import { useStore } from '../data/store';

/**
 * Neues Abzeichen (Daria, 2026-10-31): Die App fragt beim Start, beim Zurückkommen und nach jedem eigenen Post
 * nach. Ist ein Abzeichen noch nicht gesehen, öffnet sie den Hinweis (Route `badge/[kind]`). Rendert nichts.
 */
export function BadgeNotice() {
  const { session } = useAuth();
  const { mode, challenges, currentUserId } = useStore();
  const live = mode === 'live' && !!session;
  const shown = useRef(new Set<string>());
  // Eigene Posts und erledigte We-Challenges: Ändert sich die Zahl, kann ein Abzeichen dazugekommen sein
  const activity = useMemo(
    () => challenges.filter((c) => c.authorId === currentUserId && c.status !== 'draft' && c.status !== 'deleted').length,
    [challenges, currentUserId],
  );

  useEffect(() => {
    if (!live) return;
    let busy = false;
    const check = async () => {
      if (busy) return;
      busy = true;
      try {
        const mine = await checkMyBadges();
        const next = mine?.badges.find((b) => !b.seen && !shown.current.has(b.badge));
        if (next) {
          shown.current.add(next.badge);
          router.push({ pathname: '/badge/[kind]', params: { kind: next.badge } });
        }
      } catch {
        // ohne Netz oder ohne Migration: beim nächsten Mal
      } finally {
        busy = false;
      }
    };
    check();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => sub.remove();
  }, [live, activity]);

  return null;
}
