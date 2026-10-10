import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChallengePost } from '../components/ChallengePost';
import { AppHeader, TabsNavigation, TopChallengeBar, type FeedTab } from '../components/FeedHeader';
import { FeedStateMessage } from '../components/FeedStateMessage';
import { SkeletonPost } from '../components/Skeleton';
import { topChallengeIds } from '../data/sample';
import { useStore } from '../data/store';
import type { Challenge } from '../data/types';
import { color, space } from '../theme/tokens';

const COMPLETED = new Set(['confirmed', 'payment_open', 'paid_marked', 'paid']);

function matchesTab(challenge: Challenge, tab: FeedTab) {
  if (tab === 'wave') return challenge.type === 'wave';
  if (tab === 'completed') return COMPLETED.has(challenge.status);
  return true;
}

/** Route `feed` – Figma „FeedScreen“ (Filled, Loading, Empty, Error, Offline). */
export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { challenges, users, feedState, dispatch } = useStore();
  const [tab, setTab] = useState<FeedTab>('nearby');
  const [refreshing, setRefreshing] = useState(false);

  const posts = useMemo(() => challenges.filter((c) => matchesTab(c, tab)), [challenges, tab]);
  const topChallenges = useMemo(
    () => topChallengeIds.map((id) => challenges.find((c) => c.id === id)).filter((c): c is Challenge => !!c),
    [challenges],
  );

  const openChallenge = useCallback((id: string) => router.push(`/challenge/${id}`), [router]);
  const createChallenge = () => router.push('/challenge/create/step-1');

  const onRefresh = () => {
    // Beispieldaten: nur kurz den Ladezustand zeigen
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const loading = feedState === 'loading';
  const showState =
    feedState === 'filled' || feedState === 'loading' ? (posts.length === 0 ? 'empty' : null) : feedState;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <AppHeader
        onMenuPress={() => router.push('/account')}
        onCreatePress={createChallenge}
        onLogoLongPress={() => router.push('/demo')}
      />
      <TabsNavigation selectedKey={tab} onChange={setTab} />
      <TopChallengeBar items={loading ? [] : topChallenges} onItemPress={openChallenge} />
      {loading ? (
        <View style={styles.list}>
          <SkeletonPost />
          <SkeletonPost />
        </View>
      ) : showState ? (
        <FeedStateMessage
          variant={showState}
          onAction={() =>
            showState === 'empty' ? createChallenge() : dispatch({ type: 'setFeedState', feedState: 'filled' })
          }
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.text.secondary} />
          }
          renderItem={({ item }) => {
            const author = users.find((u) => u.id === item.authorId);
            if (!author) return null;
            return (
              <ChallengePost
                challenge={item}
                author={author}
                onPress={() => openChallenge(item.id)}
                onLike={() => dispatch({ type: 'toggleLike', id: item.id })}
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  list: { gap: space[12] },
});
