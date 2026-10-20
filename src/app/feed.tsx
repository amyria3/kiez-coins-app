import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChallengePost } from '../components/ChallengePost';
import { AppHeader, FeedGreeting, TabsNavigation, TopChallengeBar, type FeedTab } from '../components/FeedHeader';
import { FeedStateMessage } from '../components/FeedStateMessage';
import { SkeletonPost } from '../components/Skeleton';
import { TAB_BAR_SPACE, TabBar } from '../components/TabBar';
import { useRequireKiez } from '../data/kiez';
import { anrede } from '../data/format';
import { reiseEntries } from '../data/reise';
import { topChallenges as pickTopChallenges, useStore } from '../data/store';
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
  const { challenges, users, feedState, mode, currentUserId, profile, dispatch, load } = useStore();
  const requireKiez = useRequireKiez();
  const [tab, setTab] = useState<FeedTab>('nearby');
  const [refreshing, setRefreshing] = useState(false);

  const posts = useMemo(() => challenges.filter((c) => matchesTab(c, tab)), [challenges, tab]);
  const topChallenges = useMemo(
    () => pickTopChallenges({ mode, challenges, currentUserId }),
    [mode, challenges, currentUserId],
  );

  const hasTasks = useMemo(
    () => reiseEntries(challenges, currentUserId).some((e) => e.needsAction),
    [challenges, currentUserId],
  );

  const openChallenge = useCallback((id: string) => router.push(`/challenge/${id}`), [router]);
  const createChallenge = () => requireKiez() && router.push('/challenge/create/step-1');

  const reload = async () => {
    if (mode === 'live' && currentUserId) await load(currentUserId);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (mode === 'live') await reload();
    else await new Promise((resolve) => setTimeout(resolve, 600)); // Beispieldaten: nur kurz den Ladezustand zeigen
    setRefreshing(false);
  };

  const loading = feedState === 'loading';
  const openCount = useMemo(() => challenges.filter((c) => c.status === 'open').length, [challenges]);
  const kiezName = profile.kiez?.split(',')[0];
  const showState =
    feedState === 'filled' || feedState === 'loading' ? (posts.length === 0 ? 'empty' : null) : feedState;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <AppHeader
        onMenuPress={() => router.push('/account')}
        onLogoPress={() => router.push('/reise')}
        onLogoLongPress={() => router.push('/demo')}
        hasTasks={hasTasks}
      />
      <FeedGreeting name={anrede(profile)} kiez={kiezName} count={openCount} />
      <TopChallengeBar items={loading ? [] : topChallenges} loading={loading} onItemPress={openChallenge} />
      <TabsNavigation selectedKey={tab} onChange={setTab} />
      {loading ? (
        <View style={styles.list}>
          <SkeletonPost />
          <SkeletonPost />
        </View>
      ) : showState ? (
        <FeedStateMessage
          variant={showState}
          onAction={() =>
            showState === 'empty'
              ? createChallenge()
              : mode === 'live'
                ? (dispatch({ type: 'setFeedState', feedState: 'loading' }), reload())
                : dispatch({ type: 'setFeedState', feedState: 'filled' })
          }
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
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
      <TabBar
        active="feed"
        hasTasks={hasTasks}
        onFeedPress={() => setTab('nearby')}
        onReisePress={() => router.push('/reise')}
        onCreatePress={createChallenge}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  list: { gap: space[24] },
});
