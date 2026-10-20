import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
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
import { coordsIfAllowed, distanceMeters, formatDistance, type Coords } from '../data/location';
import { reiseEntries } from '../data/reise';
import { topChallenges as pickTopChallenges, useStore } from '../data/store';
import type { Challenge } from '../data/types';
import { color, space } from '../theme/tokens';

const COMPLETED = new Set(['confirmed', 'payment_open', 'paid_marked', 'paid']);

// Abgeschaltete Typen bleiben sichtbar, wenn es sie in der Datenbank gibt.
function matchesTab(challenge: Challenge, tab: FeedTab) {
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
  const listRef = useRef<FlatList<FeedItem>>(null);

  // Logo und Begrüßung gibt es nur bis zur ersten Interaktion (Reiter antippen oder scrollen).
  // Danach gleiten sie in einer Bewegung weg, die Segmente rücken nach oben neben die Kamera,
  // und die Stories erscheinen darunter. Das ist die Ziel-Ansicht.
  const progress = useRef(new Animated.Value(0)).current;
  const [collapsed, setCollapsed] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [storiesHeight, setStoriesHeight] = useState(0);

  const collapse = () => {
    if (collapsed) return;
    setCollapsed(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: 380,
      easing: Easing.bezier(0.2, 0, 0, 1),
      useNativeDriver: false,
    }).start();
  };

  // Eigene Position nur, wenn der Standort schon freigegeben ist. Bleibt auf dem Gerät.
  const [here, setHere] = useState<Coords | null>(null);
  useEffect(() => {
    let active = true;
    coordsIfAllowed().then((c) => active && setHere(c));
    return () => {
      active = false;
    };
  }, []);
  const distanceTo = useCallback(
    (c: Challenge) => (here && c.coords ? distanceMeters(here, c.coords) : undefined),
    [here],
  );

  // „In der Nähe“: die nächsten zuerst, Challenges ohne Punkt danach in der bisherigen Reihenfolge.
  const posts = useMemo(() => {
    const list = challenges.filter((c) => matchesTab(c, tab));
    if (tab !== 'nearby' || !here) return list;
    return list
      .map((c, i) => ({ c, i, d: distanceTo(c) }))
      .sort((a, b) => (a.d ?? Infinity) - (b.d ?? Infinity) || a.i - b.i)
      .map((x) => x.c);
  }, [challenges, tab, here, distanceTo]);
  const topChallenges = useMemo(
    () => pickTopChallenges({ mode, challenges, currentUserId }),
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
  const openCount = useMemo(() => challenges.filter((c) => c.status === 'open').length, [challenges]);
  const kiezName = profile.kiez?.split(',')[0];
  const showState =
    feedState === 'filled' || feedState === 'loading' ? (posts.length === 0 ? 'empty' : null) : feedState;

  const selectTab = (key: FeedTab) => {
    setTab(key);
    collapse();
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const typeOfTab = tab === 'wave' ? 'wave' : null;
  const planned = typeOfTab && !isTypeActive(typeOfTab) ? challengeTypes[typeOfTab] : null;
  // Stories erst in der Ziel-Ansicht und nur, wenn es welche gibt.
  // Echte Stories gibt es noch nicht; bis dahin füllen die Top-Challenges die Leiste.
  const showStories = collapsed && tab !== 'completed' && !planned && !loading && topChallenges.length > 0;

  const items: FeedItem[] = [];
  if (planned) items.push({ kind: 'planned' });
  if (loading) items.push({ kind: 'loading' });
  else if (showState && !(planned && showState === 'empty')) items.push({ kind: 'state' });
  else posts.forEach((challenge) => items.push({ kind: 'post', challenge }));

  const renderItem = ({ item }: { item: FeedItem }) => {
    switch (item.kind) {
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
        const meters = distanceTo(item.challenge);
        return (
          <ChallengePost
            challenge={item.challenge}
            author={author}
            distance={meters === undefined ? undefined : formatDistance(meters)}
            onPress={() => openChallenge(item.challenge.id)}
            onLike={() => dispatch({ type: 'toggleLike', id: item.challenge.id })}
            onManage={item.challenge.authorId === currentUserId ? openManage : undefined}
          />
        );
      }
    }
  };

  // Kopf: Höhe und Deckkraft gehen auf 0. Segmente: rechts Platz für die Kamera, sobald der Kopf weg ist.
  const headerStyle = headerHeight
    ? {
        height: progress.interpolate({ inputRange: [0, 1], outputRange: [headerHeight, 0] }),
        opacity: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] }),
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }],
      }
    : null;
  const tabsPaddingRight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [space[16], space[16] + CAMERA_WIDTH + space[8]],
  });
  const storiesStyle = {
    height: showStories ? progress.interpolate({ inputRange: [0, 1], outputRange: [0, storiesHeight] }) : 0,
    opacity: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] }),
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.clip, headerStyle]}>
        <View onLayout={(e) => !headerHeight && setHeaderHeight(e.nativeEvent.layout.height)}>
          <AppHeader
            onLogoPress={() => router.push('/reise')}
            onLogoLongPress={() => router.push('/demo')}
            hasTasks={hasTasks}
          />
          <FeedGreeting name={anrede(profile)} kiez={kiezName} count={openCount} />
        </View>
      </Animated.View>
      <Animated.View style={[styles.tabsRow, { paddingRight: tabsPaddingRight }]}>
        <TabsNavigation selectedKey={tab} onChange={selectTab} />
      </Animated.View>
      <Animated.View style={[styles.clip, storiesStyle]}>
        <View onLayout={(e) => setStoriesHeight(e.nativeEvent.layout.height)}>
          <TopChallengeBar items={topChallenges} onItemPress={openChallenge} />
        </View>
      </Animated.View>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => (item.kind === 'post' ? item.challenge.id : item.kind)}
        renderItem={renderItem}
        onScrollBeginDrag={collapse}
        contentContainerStyle={[styles.list, styles.listTop, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
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
        onReiseLongPress={() => router.push('/demo')}
        onMenuPress={() => router.push('/account')}
      />
    </View>
  );
}

/** Breite der Kamera oben rechts (TabBar.tsx, CameraButton) */
const CAMERA_WIDTH = 52;

type FeedItem =
  | { kind: 'planned' }
  | { kind: 'loading' }
  | { kind: 'state' }
  | { kind: 'post'; challenge: Challenge };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  clip: { overflow: 'hidden' },
  list: { gap: space[12] },
  listTop: { paddingTop: space[8] },
  tabsRow: {
    backgroundColor: color.bg.screen,
    paddingTop: space[8],
    paddingBottom: space[8],
    paddingLeft: space[16],
  },
});
