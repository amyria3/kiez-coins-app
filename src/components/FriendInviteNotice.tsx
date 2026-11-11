import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KaterCard } from './Content';
import { space } from '../theme/tokens';

import { useAuth } from '../data/auth';
import { takeNewInviteFriends } from '../data/remote';
import { useStore } from '../data/store';
import { t } from '../data/texts';

/**
 * Hinweis an die einladende Person: Wer ihre Freundschaftseinladung angenommen hat, meldet die App beim Start
 * und jedes Mal, wenn sie wieder nach vorn kommt. Die Datenbank merkt sich, dass der Hinweis gesehen ist.
 * Der Kater meldet es als Sprechblase oben über dem Screen (Daria, 2026-11-11: „Uh-la-la, das ging aber schnell!“).
 * Ein Tipp öffnet die Freundschaften, das Kreuz schließt die Blase.
 */
export function FriendInviteNotice() {
  const { session } = useAuth();
  const { mode } = useStore();
  const live = mode === 'live' && !!session;
  const insets = useSafeAreaInsets();
  const [line, setLine] = useState<string | null>(null);

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
        setLine(
          friends.length === 1
            ? t('Uh-la-la, das ging aber schnell! {name} hat Deine Einladung angenommen. Ihr seid jetzt befreundet.', { name: names })
            : t('Uh-la-la, das ging aber schnell! {names} haben Deine Einladung angenommen. Ihr seid jetzt befreundet.', { names }),
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

  if (!line) return null;
  return (
    <View style={[styles.wrap, { top: insets.top + space[8] }]} pointerEvents="box-none">
      <KaterCard
        floating
        accessibilityHint={t('Öffnet Deine Freundschaften')}
        onPress={() => {
          setLine(null);
          router.push('/account/friends');
        }}
        onClose={() => setLine(null)}
      >
        {line}
      </KaterCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space[16], right: space[16], zIndex: 20 },
});
