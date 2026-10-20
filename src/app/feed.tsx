import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChallengePost } from '../components/ChallengePost';
import { AppHeader, FeedGreeting, PlannedHint, TabsNavigation, TopChallengeBar, type FeedTab } from '../components/FeedHeader';
import { FeedStateMessage } from '../components/FeedStateMessage';
import { SkeletonPost } from '../components/Skeleton';
import { CameraButton, TAB_BAR_SPACE, TabBar } from '../components/TabBar';
import { useRequireKiez } from '../data/kiez';
import { challengeTypes, isTypeActive } from '../data/features';
import { anrede } from '../data/format';
import { reiseEntries } from '../data/reise';
import { topChallenges as pickTopChallenges, useStore } from '../data/store';
import type { Challenge } from '../data/types';
import { color, space } from '../theme/tokens';

const COMPLETED = new Set(['confirmed', 'payment_open', 'paid_marked', 'paid']);

function matchesTab(challenge: Challenge, tab: FeedTab) {
  if (!isTypeActive(challenge.type)) return false;
  // Entwürfe stehen nur in „Deine Challenges“. Geschlossene bleiben in der Timeline.
  if (challenge.status === 'draft') return false;
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
  const [plannedTab, setPlannedTab] = useState<FeedTab | null>(null);

  const posts = useMemo(() => challenges.filter((c) => matchesTab(c, tab)), [challenges, tab]);
  const topChallenges = useMemo(
    () => pickTopChallenges({ mode, challenges, currentUserId }).filter((c) => isTypeActive(c.type)),
    [mode, challenges, currentUserId],
  );

  const hasTasks = useMemo(
    () => reiseEntries(challenges, currentUserId).some((e) => e.needsAction),
    [challenges, currentUserId],
  );

  const openChallenge = useCallback((id: string) => router.push(`/challenge/${id}`), [router]);
  const openManage = useCallback(() => router.push('/manage'), [router]);
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
  const openCount = useMemo(
    () => challenges.filter((c) => c.status === 'open' && isTypeActive(c.type)).length,
    [challenges],
  );
  const kiezName = profile.kiez?.split(',')[0];
  const showState =
    feedState === 'filled' || feedState === 'loading' ? (posts.length === 0 ? 'empty' : null) : feedState;

  const header = (
    <View>
      <AppHeader
        onLogoPress={() => router.push('/reise')}
        onLogoLongPress={() => router.push('/demo')}
        hasTasks={hasTasks}
      />
      <FeedGreeting name={anrede(profile)} kiez={kiezName} count={openCount} />
      <TabsNavigation
        selectedKey={tab}
        onChange={(key) => (setTab(key), setPlannedTab(null))}
        onPlannedPress={(key) => setPlannedTab((current) => (current === key ? null : key))}
      />
      {plannedTab === 'wave' ? (
        <PlannedHint message={challengeTypes.wave.plannedHint} onClose={() => setPlannedTab(null)} />
      ) : null}
      <TopChallengeBar items={loading ? [] : topChallenges} loading={loading} onItemPress={openChallenge} />
    </View>
  );

  const empty = loading ? (
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
  ) : null;

  return (
    <View style={styles.screen}>
      {/* Kopf, Begrüßung, Segmente und Top-Challenges scrollen mit dem Feed weg. */}
      <FlatList
        data={loading || showState ? [] : posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top, paddingBottom: insets.bottom + TAB_BAR_SPACE },
        ]}
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
              onManage={item.authorId === currentUserId ? openManage : undefined}
            />
          );
        }}
      />
      {/* Unter der Statusleiste nichts durchscheinen lassen */}
      <View style={[styles.statusBar, { height: insets.top }]} />
      <CameraButton onPress={createChallenge} />
      <TabBar
        active="feed"
        hasTasks={hasTasks}
        onFeedPress={() => setTab('nearby')}
        onReisePress={() => router.push('/reise')}
        onMenuPress={() => router.push('/account')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  list: { gap: space[24] },
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: color.bg.screen },
});
