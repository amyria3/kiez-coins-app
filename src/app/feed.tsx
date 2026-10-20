import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';
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

// Abgeschaltete Typen bleiben sichtbar, wenn es sie in der Datenbank gibt.
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
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<FeedItem>>(null);
  const headerHeight = useRef(0);

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
  const openCount = useMemo(
    () => challenges.filter((c) => c.status === 'open').length,
    [challenges],
  );
  const kiezName = profile.kiez?.split(',')[0];
  const showState =
    feedState === 'filled' || feedState === 'loading' ? (posts.length === 0 ? 'empty' : null) : feedState;

  // Antippen eines Reiters schiebt Logo und Begrüßung nach oben weg; die Segmente bleiben oben stehen,
  // der neue Inhalt beginnt direkt darunter.
  const selectTab = (key: FeedTab) => {
    setTab(key);
    const target = headerHeight.current;
    // Erst nach dem neuen Inhalt scrollen, sonst setzt der Wechsel die Position zurück
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: target, animated: true }));
  };

  const typeOfTab = tab === 'wave' ? 'wave' : null;
  const planned = typeOfTab && !isTypeActive(typeOfTab) ? challengeTypes[typeOfTab] : null;

  const items: FeedItem[] = [{ kind: 'tabs' }];
  if (tab !== 'completed' && !planned && (loading || topChallenges.length > 0)) items.push({ kind: 'stories' });
  if (planned) items.push({ kind: 'planned' });
  if (loading) items.push({ kind: 'loading' });
  else if (showState && !(planned && showState === 'empty')) items.push({ kind: 'state' });
  else posts.forEach((challenge) => items.push({ kind: 'post', challenge }));

  const renderItem = ({ item }: { item: FeedItem }) => {
    switch (item.kind) {
      case 'tabs':
        return (
          <View style={[styles.tabsRow, { width: windowWidth }]}>
            <TabsNavigation selectedKey={tab} onChange={selectTab} />
          </View>
        );
      case 'stories':
        return <TopChallengeBar items={loading ? [] : topChallenges} loading={loading} onItemPress={openChallenge} />;
      case 'planned':
        return planned ? <PlannedHint title={planned.plannedTitle} message={planned.plannedHint} /> : null;
      case 'loading':
        return (
          <View style={styles.list}>
            <SkeletonPost />
            <SkeletonPost />
          </View>
        );
      case 'state':
        return showState ? (
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
      case 'post': {
        const author = users.find((u) => u.id === item.challenge.authorId);
        if (!author) return null;
        return (
          <ChallengePost
            challenge={item.challenge}
            author={author}
            onPress={() => openChallenge(item.challenge.id)}
            onLike={() => dispatch({ type: 'toggleLike', id: item.challenge.id })}
          />
        );
      }
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => (item.kind === 'post' ? item.challenge.id : item.kind)}
        renderItem={renderItem}
        // Kind 0 ist der Kopf (Logo, Begrüßung), Kind 1 die Segmente: Sie bleiben oben kleben.
        stickyHeaderIndices={[1]}
        ListHeaderComponent={
          <View onLayout={(e) => (headerHeight.current = e.nativeEvent.layout.height)}>
            <AppHeader
              onLogoPress={() => router.push('/reise')}
              onLogoLongPress={() => router.push('/demo')}
              hasTasks={hasTasks}
            />
            <FeedGreeting name={anrede(profile)} kiez={kiezName} count={openCount} />
          </View>
        }
        contentContainerStyle={[
          styles.list,
          // Genug Höhe, damit der Kopf auch bei kurzen Listen wegscrollen kann
          { minHeight: windowHeight + headerHeight.current, paddingBottom: insets.bottom + TAB_BAR_SPACE },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.text.secondary} />
        }
      />
      <CameraButton onPress={createChallenge} />
      <TabBar
        active="feed"
        hasTasks={hasTasks}
        onFeedPress={() => selectTab('nearby')}
        onReisePress={() => router.push('/reise')}
        onMenuPress={() => router.push('/account')}
      />
    </View>
  );
}

type FeedItem =
  | { kind: 'tabs' }
  | { kind: 'stories' }
  | { kind: 'planned' }
  | { kind: 'loading' }
  | { kind: 'state' }
  | { kind: 'post'; challenge: Challenge };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  list: { gap: space[16] },
  // Rechts Platz für die Kamera, die oben rechts schwebt
  tabsRow: {
    alignSelf: 'stretch',
    backgroundColor: color.bg.screen,
    paddingTop: space[8],
    paddingBottom: space[8],
    paddingLeft: space[16],
    paddingRight: space[16] + 52 + space[8],
  },
});
