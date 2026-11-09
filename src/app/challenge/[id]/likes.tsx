import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthorRow } from '../../../components/AuthorRow';
import { Notice } from '../../../components/Content';
import { SubScreen } from '../../../components/Screen';
import { Text } from '../../../components/T';
import * as remote from '../../../data/remote';
import { useChallenge, useStore } from '../../../data/store';
import type { User } from '../../../data/types';
import { color, space, text } from '../../../theme/tokens';
import { t } from '../../../data/texts';
import { useGoBack } from '../../../lib/goBack';

/**
 * Route `challenge/[id]/likes`: wer den Post geliked hat, neueste zuerst. Sichtbar für alle, die den Post
 * sehen (Daria, 2026-11-05). Tipp auf eine Person öffnet ihr Profil.
 * Mit `?kommentar=<id>`: wer diesen Kommentar geliked hat (Daria, 2026-11-08).
 */
export default function LikesScreen() {
  const { id, kommentar } = useLocalSearchParams<{ id: string; kommentar?: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { mode, users } = useStore();
  const { challenge } = useChallenge(id);
  const comment = kommentar ? challenge?.comments.find((c) => c.id === kommentar) : undefined;
  const likeCount = kommentar ? comment?.likeCount : challenge?.likeCount;
  const ownerId = kommentar ? comment?.authorId : challenge?.authorId;
  // undefined: lädt, null: Datenbank kennt die Funktion noch nicht
  const [likers, setLikers] = useState<User[] | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    if (mode === 'demo') {
      // Beispieldaten: so viele Personen, wie der Post Likes hat
      setLikers(users.filter((u) => u.id !== ownerId).slice(0, likeCount ?? 0));
      return;
    }
    let alive = true;
    (kommentar ? remote.loadCommentLikers(kommentar) : remote.loadLikers(id)).then((list) => alive && setLikers(list));
    return () => {
      alive = false;
    };
  }, [id, kommentar, mode, users, ownerId, likeCount]);

  const count = likers?.length ?? likeCount ?? 0;
  const commentAuthor = comment ? users.find((u) => u.id === comment.authorId) : undefined;
  return (
    <SubScreen
      title="Likes"
      subtitle={kommentar ? (commentAuthor ? t('Kommentar von {name}', { name: commentAuthor.name }) : t('Kommentar')) : challenge?.title}
      navigation="back"
      onLeadingPress={goBack}
    >
      {likers === null ? (
        <Notice message={t('Die Liste der Likes ist gleich da. Bis dahin siehst Du nur die Zahl.')} />
      ) : likers === undefined ? null : likers.length === 0 ? (
        <Text style={styles.empty}>{t('Noch keine Likes.')}</Text>
      ) : (
        <View style={styles.list}>
          <Text style={styles.count}>{count === 1 ? t('1 Person mag das') : t('{n} Personen mögen das', { n: count })}</Text>
          {likers.map((u) => (
            <AuthorRow key={u.id} user={u} location={u.location} onPress={() => router.push({ pathname: '/user/[id]', params: { id: u.id } })} />
          ))}
        </View>
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[16] },
  count: { ...text.caption, color: color.text.secondary },
  empty: { ...text.body, color: color.text.secondary },
});
