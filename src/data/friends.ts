import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { loadFriends, type FriendLists } from './remote';
import { useStore } from './store';

/**
 * Freund:innen und offene Anfragen für Leisten und Zähler (Reiter „Gruppen“, Profil).
 * `undefined`: lädt, `null`: Migration fehlt. Mit Beispieldaten dieselbe Auswahl wie in account/freunde.
 */
export function useFriends(): FriendLists | null | undefined {
  const { mode, users, currentUserId } = useStore();
  const [lists, setLists] = useState<FriendLists | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (mode !== 'live') {
      const others = users.filter((u) => u.id !== currentUserId);
      setLists({ incoming: others.slice(0, 1), friends: others.slice(1, 3), outgoing: [] });
      return;
    }
    if (!currentUserId) return;
    try {
      setLists(await loadFriends(currentUserId));
    } catch {
      setLists(null);
    }
  }, [mode, users, currentUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  // Zurück aus „Freundschaften“ oder einem Profil: Stand neu laden
  useFocusEffect(
    useCallback(() => {
      if (mode === 'live') refresh();
    }, [mode, refresh]),
  );
  return lists;
}
