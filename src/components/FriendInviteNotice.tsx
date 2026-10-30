import { useEffect } from 'react';
import { Alert, AppState } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '../data/auth';
import { takeNewInviteFriends } from '../data/remote';
import { useStore } from '../data/store';
import { t } from '../data/texts';

/**
 * Hinweis an die einladende Person: Wer ihre Freundschaftseinladung angenommen hat, meldet die App beim Start
 * und jedes Mal, wenn sie wieder nach vorn kommt. Die Datenbank merkt sich, dass der Hinweis gesehen ist.
 * Rendert nichts.
 */
export function FriendInviteNotice() {
  const { session } = useAuth();
  const { mode } = useStore();
  const live = mode === 'live' && !!session;

  useEffect(() => {
    if (!live) return;
    let busy = false;
    const check = async () => {
      if (busy) return;
      busy = true;
      try {
        const friends = await takeNewInviteFriends();
        if (!friends.length) return;
        const names = friends.map((f) => f.name).join(', ');
        Alert.alert(
          'Neue Freundschaft',
          friends.length === 1
            ? t('{name} hat Deine Einladung angenommen. Ihr seid jetzt befreundet.', { name: names })
            : t('{names} haben Deine Einladung angenommen. Ihr seid jetzt befreundet.', { names }),
          [
            { text: 'OK', style: 'cancel' },
            { text: 'Ansehen', onPress: () => router.push('/account/friends') },
          ],
        );
      } catch {
        // kein Netz: beim nächsten Mal
      } finally {
        busy = false;
      }
    };
    check();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => sub.remove();
  }, [live]);

  return null;
}
