import { nudgeCrystals } from '../components/icons/Brand';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  PanResponder,
  RefreshControl,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChallengePost } from '../components/ChallengePost';
import { ComposeSheet } from '../components/compose/ComposeSheet';
import { takeComposeDone } from '../components/compose/compose';
import { IconButton } from '../components/IconButton';
import { Text } from '../components/T';
import { t } from '../data/texts';
import { useAppDimensions } from '../theme/layout';
import { AppHeader, FeedGreeting, PlannedHint, TabsNavigation, TopChallengeBar, type FeedTab } from '../components/FeedHeader';
import { FeedStateMessage } from '../components/FeedStateMessage';
import { GroupBar, GroupsEmpty } from '../components/GroupBar';
import { GearsLoader } from '../components/GearsLoader';
import { SurveyOverlay, useSurveyPrompt } from '../components/SurveyOverlay';
import { CAMERA_W, CameraButton, TAB_BAR_SPACE, TabBar } from '../components/TabBar';
import { useRequireKiez } from '../data/kiez';
import { challengeTypes, isTypeActive } from '../data/features';
import { anrede } from '../data/format';
import { coordsIfAllowed, distanceMeters, formatDistance, type Coords } from '../data/location';
import { reiseEntries } from '../data/reise';
import { topChallenges as pickTopChallenges, useStore } from '../data/store';
import type { Challenge } from '../data/types';
import { color, motion, space, text } from '../theme/tokens';

const COMPLETED = new Set(['confirmed', 'payment_open', 'paid_marked', 'paid']);

// Abgeschaltete Typen bleiben sichtbar, wenn es sie in der Datenbank gibt.
function matchesTab(challenge: Challenge, tab: FeedTab, groupId?: string) {
  // Entwürfe und gelöschte stehen nur in „Deine Challenges“. Geschlossene bleiben in der Timeline.
  if (challenge.status === 'draft' || challenge.status === 'deleted') return false;
  // Gruppenaufgaben nur im Reiter „Gruppen“, dort nur die der gewählten Gruppe
  if (tab === 'groups') return !!groupId && challenge.groupId === groupId;
  if (challenge.groupId) return false;
  if (tab === 'wave') return challenge.type === 'wave';
  if (tab === 'completed') return COMPLETED.has(challenge.status);
  return true;
}

/** Route `feed` – Figma „FeedScreen“ (Filled, Loading, Empty, Error, Offline). */
export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { challenges, users, feedState, mode, currentUserId, profile, dispatch, load, groups } = useStore();
  const requireKiez = useRequireKiez();
  const [surveyVisible, closeSurvey] = useSurveyPrompt();
  // `gruppe`: aus der Gruppenseite („Aufgaben ansehen“) direkt in den Reiter „Gruppen“
  const { gruppe } = useLocalSearchParams<{ gruppe?: string }>();
  const [tab, setTab] = useState<FeedTab>(gruppe ? 'groups' : 'nearby');
  const [groupChoice, setGroupChoice] = useState<string | undefined>(gruppe);
  const groupId = groups.find((g) => g.id === groupChoice)?.id ?? groups[0]?.id;
  useEffect(() => {
    if (!gruppe) return;
    setTab('groups');
    setGroupChoice(gruppe);
  }, [gruppe]);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<FeedItem>>(null);

  // Logo und Begrüßung gibt es nur bis zur ersten Interaktion (Reiter antippen oder scrollen).
  // Danach gleiten sie in einer Bewegung weg, die Segmente rücken nach oben neben die Kamera,
  // und die Stories erscheinen darunter. Das ist die Ziel-Ansicht.
  const progress = useRef(new Animated.Value(0)).current;
  const [collapsed, setCollapsed] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [storiesHeight, setStoriesHeight] = useState(0);

  const animateHeader = (toValue: 0 | 1) =>
    Animated.timing(progress, {
      toValue,
      duration: motion.barrier.duration,
      easing: Easing.bezier(...motion.barrier.bezier),
      useNativeDriver: false,
    }).start();

  const collapse = () => {
    if (collapsed) return;
    collapsedAt.current = Date.now();
    maxY.current = 0;
    setCollapsed(true);
    animateHeader(1);
  };

  // Ganz oben angekommen (oder dort nach unten gezogen): Logo und Begrüßung kommen zurück.
  const expand = () => {
    if (!collapsed) return;
    setCollapsed(false);
    animateHeader(0);
  };

  // Ausblenden: nach unten scrollen. Einblenden nur durch echtes Zurückscrollen nach oben
  // (vorher mehr als 120 Punkte weit unten) oder Herunterziehen ganz oben.
  // Das Zurückfedern einer kurzen Liste auf 0 blendet den Kopf nicht wieder ein.
  const lastY = useRef(0);
  const maxY = useRef(0);
  const collapsedAt = useRef(0);
  const dragging = useRef(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    maxY.current = Math.max(maxY.current, y);
    const settled = Date.now() - collapsedAt.current > motion.barrier.duration + 200;
    nudgeCrystals(y - lastY.current);
    if (y > 8 && y > lastY.current) collapse();
    else if (settled && ((y <= 0 && maxY.current > 120) || (dragging.current && y < -48))) expand();
    lastY.current = y;
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
    const list = challenges.filter((c) => matchesTab(c, tab, groupId));
    if (tab !== 'nearby' || !here) return list;
    return list
      .map((c, i) => ({ c, i, d: distanceTo(c) }))
      .sort((a, b) => (a.d ?? Infinity) - (b.d ?? Infinity) || a.i - b.i)
      .map((x) => x.c);
  }, [challenges, tab, here, distanceTo, groupId]);
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
  // Erstellen über dem Feed (Daria, 22.10.2026): Logo und Begrüßung gleiten weg wie beim Scrollen, ein schmaler
  // Kopf mit „Challenge erstellen“ erscheint, die Pille bleibt, und das Blatt kommt federnd von unten.
  // Die Pille wechselt im Blatt zwischen öffentlicher Challenge und Gruppenaufgabe.
  const { height: screenHeight } = useAppDimensions();
  const [composing, setComposing] = useState(false);
  const [composeKey, setComposeKey] = useState(0);
  const composeAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const wasCollapsed = useRef(false);
  const createChallenge = () => {
    if (tab === 'nearby' && !requireKiez()) return;
    wasCollapsed.current = collapsed;
    setComposing(true);
    if (!collapsed) animateHeader(1);
    Animated.timing(composeAnim, {
      toValue: 1,
      duration: motion.barrier.duration,
      easing: Easing.bezier(...motion.barrier.bezier),
      useNativeDriver: false,
    }).start();
    sheetAnim.setValue(0);
    Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, ...motion.barrierSpring }).start();
  };
  const closeCompose = (reset = false) => {
    Animated.timing(sheetAnim, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
      setComposing(false);
      if (reset) setComposeKey((k) => k + 1);
    });
    Animated.timing(composeAnim, {
      toValue: 0,
      duration: motion.barrier.duration,
      easing: Easing.bezier(...motion.barrier.bezier),
      useNativeDriver: false,
    }).start();
    if (!wasCollapsed.current) animateHeader(0);
  };
  // Nach dem Veröffentlichen zurück im Feed: Blatt zu und leer
  useFocusEffect(
    useCallback(() => {
      if (takeComposeDone()) closeCompose(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

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
  const openCount = useMemo(() => challenges.filter((c) => !c.groupId && c.status === 'open').length, [challenges]);
  const kiezName = profile.kiez?.split(',')[0];
  const showState =
    feedState === 'filled' || feedState === 'loading' ? (posts.length === 0 ? 'empty' : null) : feedState;

  const selectTab = (key: FeedTab) => {
    setTab(key);
    collapse();
    lastY.current = 0;
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  // Wischen nach links oder rechts wechselt den Reiter. Nur über der Liste, damit die Stories frei scrollen.
  const swipeX = useRef(new Animated.Value(0)).current;
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const selectTabRef = useRef(selectTab);
  selectTabRef.current = selectTab;
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderMove: (_, g) => swipeX.setValue(g.dx * 0.25),
        onPanResponderRelease: (_, g) => {
          const index = TAB_ORDER.indexOf(tabRef.current);
          const next = g.dx < -SWIPE_DISTANCE || g.vx < -0.5 ? index + 1 : g.dx > SWIPE_DISTANCE || g.vx > 0.5 ? index - 1 : index;
          if (next !== index && next >= 0 && next < TAB_ORDER.length) {
            selectTabRef.current(TAB_ORDER[next]);
            // Neuer Reiter schwingt von der Seite herein, aus der gewischt wurde
            swipeX.setValue(next > index ? motion.tabSwitch.offset : -motion.tabSwitch.offset);
          }
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: false, ...motion.tabSwitch.spring }).start();
        },
        onPanResponderTerminate: () =>
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: false, ...motion.barrierSpring }).start(),
      }),
    [swipeX],
  );

  // Tippen auf einen Reiter: dieselbe Bewegung wie beim Wischen, aus der Richtung des Reiters.
  const switchTab = (key: FeedTab) => {
    const from = TAB_ORDER.indexOf(tab);
    const to = TAB_ORDER.indexOf(key);
    selectTab(key);
    if (to === from) return;
    swipeX.setValue(to > from ? motion.tabSwitch.offset : -motion.tabSwitch.offset);
    Animated.spring(swipeX, { toValue: 0, useNativeDriver: false, ...motion.tabSwitch.spring }).start();
  };

  const typeOfTab = tab === 'wave' ? 'wave' : null;
  const planned = typeOfTab && !isTypeActive(typeOfTab) ? challengeTypes[typeOfTab] : null;
  // Stories erst in der Ziel-Ansicht und nur, wenn es welche gibt.
  // Echte Stories gibt es noch nicht; bis dahin füllen die Top-Challenges die Leiste.
  const showStories =
    collapsed && tab !== 'completed' && tab !== 'groups' && !planned && !loading && topChallenges.length > 0;

  const items: FeedItem[] = [];
  if (planned) items.push({ kind: 'planned' });
  if (tab === 'groups' && !loading) {
    if (groups.length === 0) items.push({ kind: 'groupsEmpty' });
    else {
      items.push({ kind: 'groupBar' });
      if (posts.length === 0) items.push({ kind: 'groupNoTasks' });
      else posts.forEach((challenge) => items.push({ kind: 'post', challenge }));
    }
  } else if (loading) items.push({ kind: 'loading' });
  else if (showState && !(planned && showState === 'empty')) items.push({ kind: 'state' });
  else posts.forEach((challenge) => items.push({ kind: 'post', challenge }));

  const renderItem = ({ item }: { item: FeedItem }) => {
    switch (item.kind) {
      case 'groupsEmpty':
        return <GroupsEmpty onCreate={() => router.push('/gruppen/neu')} onJoin={() => router.push('/gruppen/beitreten')} />;
      case 'groupBar':
        return (
          <GroupBar
            groups={groups}
            selectedId={groupId}
            onSelect={setGroupChoice}
            onOpen={(id) => router.push(`/gruppen/${id}`)}
            onAll={() => router.push('/gruppen')}
          />
        );
      case 'groupNoTasks':
        return (
          <GroupsEmpty
            title="Noch keine Aufgaben"
            message="Tipp oben rechts auf die Kamera und stell die erste Aufgabe für Eure Gruppe ein."
          />
        );
      case 'planned':
        return planned ? <PlannedHint title={planned.plannedTitle} message={planned.plannedHint} /> : null;
      case 'loading':
        return (
          // Lade-Animation mit Darias Zahnrädern statt grauer Platzhalter
          <View style={styles.loading}>
            <GearsLoader size={160} />
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
            onCommentPress={() => router.push({ pathname: '/challenge/[id]', params: { id: item.challenge.id, kommentare: '1' } })}
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
        // Nachschwingen über 1 hinaus: Höhe bleibt bei 0, nur die Verschiebung schwingt mit
        // Beim Erstellen immer weg, egal wo der Feed gerade steht
        height: Animated.multiply(
          progress.interpolate({ inputRange: [0, 1], outputRange: [headerHeight, 0], extrapolateRight: 'clamp' }),
          composeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        ),
        opacity: Animated.multiply(
          progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0], extrapolate: 'clamp' }),
          composeAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] }),
        ),
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }],
      }
    : null;
  // Beim Erstellen ist die Kamera weg, die Pille nutzt die volle Breite
  const tabsPaddingRight = Animated.add(
    progress.interpolate({ inputRange: [0, 1], outputRange: [space[16], space[16] + CAMERA_WIDTH + space[8]] }),
    composeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -(CAMERA_WIDTH + space[8])] }),
  );
  const composeHeaderStyle = {
    height: composeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, COMPOSE_HEADER] }),
    opacity: composeAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] }),
    transform: [{ translateY: composeAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
  };
  const composeTarget = tab === 'groups' ? groupId : 'public';
  const composeLine =
    tab === 'groups'
      ? groups.find((g) => g.id === groupId)
        ? t('Aufgabe für {name}', { name: groups.find((g) => g.id === groupId)!.name })
        : t('Aufgabe erstellen')
      : t('Challenge erstellen');
  const storiesStyle = {
    height: showStories && !composing
      ? progress.interpolate({ inputRange: [0, 1], outputRange: [0, storiesHeight], extrapolateLeft: 'clamp' })
      : 0,
    opacity: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' }),
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
      <Animated.View style={[styles.clip, composeHeaderStyle]}>
        <View style={styles.composeHeader}>
          <IconButton icon="close" accessibilityLabel={t('Schließen')} onPress={() => closeCompose()} />
          <Text style={styles.composeLine} numberOfLines={1} accessibilityRole="header">
            {composeLine}
          </Text>
        </View>
      </Animated.View>
      <Animated.View style={[styles.tabsRow, { paddingRight: tabsPaddingRight }]}>
        <TabsNavigation selectedKey={tab} onChange={switchTab} />
      </Animated.View>
      <Animated.View style={[styles.clip, storiesStyle]}>
        <View onLayout={(e) => setStoriesHeight(e.nativeEvent.layout.height)}>
          <TopChallengeBar items={topChallenges} onItemPress={openChallenge} />
        </View>
      </Animated.View>
      <View style={styles.flex}>
        <Animated.View style={[styles.flex, { transform: [{ translateX: swipeX }] }]} {...swipe.panHandlers}>
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item) => (item.kind === 'post' ? item.challenge.id : item.kind)}
          renderItem={renderItem}
          onScroll={onScroll}
          onScrollBeginDrag={() => (dragging.current = true)}
          onScrollEndDrag={() => (dragging.current = false)}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.list, styles.listTop, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.text.secondary} />
          }
        />
        </Animated.View>
        {composing ? (
          <Animated.View
            style={[
              styles.composeSheet,
              { transform: [{ translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [screenHeight, 0] }) }] },
            ]}
          >
            <ComposeSheet key={composeKey} target={composeTarget} onDone={() => closeCompose(true)} />
          </Animated.View>
        ) : null}
      </View>
      {composing ? null : <CameraButton onPress={createChallenge} />}
      {composing ? null : <TabBar
        active="feed"
        hasTasks={hasTasks}
        onFeedPress={() => switchTab('nearby')}
        onReisePress={() => router.push('/reise')}
        onReiseLongPress={() => router.push('/demo')}
        onMenuPress={() => router.push('/account')}
      />}
      <SurveyOverlay visible={surveyVisible} onClose={closeSurvey} />
    </View>
  );
}

/** Breite der Kamera oben rechts (TabBar.tsx, CameraButton) */
const CAMERA_WIDTH = CAMERA_W;
/** Höhe des schmalen Kopfs beim Erstellen */
const COMPOSE_HEADER = 52;

/** Reihenfolge der Reiter für das Wischen */
const TAB_ORDER: FeedTab[] = ['nearby', 'groups'];
/** Mindestweg in Punkten, ab dem ein Wischen den Reiter wechselt */
const SWIPE_DISTANCE = 64;

type FeedItem =
  | { kind: 'planned' }
  | { kind: 'groupsEmpty' }
  | { kind: 'groupBar' }
  | { kind: 'groupNoTasks' }
  | { kind: 'loading' }
  | { kind: 'state' }
  | { kind: 'post'; challenge: Challenge };

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: space[48] },
  screen: { flex: 1, backgroundColor: color.bg.screen },
  flex: { flex: 1 },
  clip: { overflow: 'hidden' },
  list: { gap: space[24] },
  listTop: { paddingTop: space[8] },
  composeHeader: { height: COMPOSE_HEADER, flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: space[8] },
  composeLine: { ...text.title, flex: 1, color: color.text.primary },
  composeSheet: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  tabsRow: {
    backgroundColor: color.bg.screen,
    paddingTop: space[8],
    paddingBottom: space[8],
    paddingLeft: space[16],
  },
});
