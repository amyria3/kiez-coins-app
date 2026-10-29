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
import { AppHeader, FeedGreeting, MODE_OF_TAB, PlannedHint, TAB_OF_MODE, TabsNavigation, TopChallengeBar, type FeedTab } from '../components/FeedHeader';
import { FeedStateMessage } from '../components/FeedStateMessage';
import { GroupBar } from '../components/GroupBar';
import { AudienceHint, useAudienceHint } from '../components/AudienceHint';
import { GearsLoader } from '../components/GearsLoader';
import { SurveyOverlay, useSurveyPrompt } from '../components/SurveyOverlay';
import { CAMERA_W, CameraButton, TAB_BAR_SPACE, TabBar } from '../components/TabBar';
import { useRequireKiez } from '../data/kiez';
import { challengeTypes, isTypeActive, useModes } from '../data/features';
import { anrede } from '../data/format';
import { coordsIfAllowed, distanceMeters, formatDistance, KIEZ_RADIUS_METERS, type Coords } from '../data/location';
import { reiseEntries } from '../data/reise';
import { runningBeforeAfter, topChallenges as pickTopChallenges, useStore } from '../data/store';
import { RunningBeforeAfter } from '../components/BeforeAfterTimer';
import type { Challenge } from '../data/types';
import { color, isFashionable, motion, space, text } from '../theme/tokens';

const COMPLETED = new Set(['confirmed', 'payment_open', 'paid_marked', 'paid']);

// Abgeschaltete Typen bleiben sichtbar, wenn es sie in der Datenbank gibt.
function matchesTab(challenge: Challenge, tab: FeedTab, groupId: string | undefined, me: string) {
  // Entwürfe und gelöschte stehen nur in „Deine Challenges“. Geschlossene bleiben in der Timeline.
  if (challenge.status === 'draft' || challenge.status === 'deleted') return false;
  // Privat: nur eigene private Beiträge, und die nur hier (Daria, 27.10.2026)
  if (tab === 'private') return !!challenge.private && challenge.authorId === me;
  if (challenge.private) return false;
  // Gruppenaufgaben nur im Reiter „Gruppen“, dort nur die der gewählten Gruppe
  if (tab === 'groups') return !!groupId && challenge.groupId === groupId;
  if (challenge.groupId) return false;
  if (tab === 'wave') return challenge.type === 'wave';
  if (tab === 'completed') return COMPLETED.has(challenge.status);
  // Überall: alles Öffentliche außer „nur im Umkreis“, eigene Beiträge immer (Daria, 29.10.2026)
  if (tab === 'everywhere') return !challenge.localOnly || challenge.authorId === me;
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
  // `reiter=gruppen` und `erstellen=1`: aus der Leiste im Fashionable Look von anderen Seiten
  const { gruppe, reiter, erstellen } = useLocalSearchParams<{ gruppe?: string; reiter?: string; erstellen?: string }>();
  const [chosenTab, setTab] = useState<FeedTab | undefined>(gruppe || reiter === 'gruppen' ? 'groups' : undefined);
  // Modi Privat, Gruppe, Kiez (Dein Konto › Funktionen, Daria, 27.10.2026): verborgene haben keinen Reiter,
  // ohne eigene Wahl gilt der Standard
  const modes = useModes();
  const groupsOn = modes.isVisible('groups');
  const tabOrder = TAB_ORDER.filter((key) => modes.visible.some((m) => TAB_OF_MODE[m] === key));
  const standardTab = TAB_OF_MODE[modes.standard];
  const tab: FeedTab = chosenTab && tabOrder.includes(chosenTab) ? chosenTab : standardTab;
  const tabOrderRef = useRef(tabOrder);
  tabOrderRef.current = tabOrder;
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
    clearTimeout(autoHide.current);
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

  // Kopf geht auch ohne Interaktion weg (Daria, 23.10.2026): nach HEADER_HIDE_MS, sobald er sichtbar ist.
  const autoHide = useRef<ReturnType<typeof setTimeout>>(undefined);
  const collapseRef = useRef(collapse);
  collapseRef.current = collapse;
  useEffect(() => {
    if (collapsed) return;
    autoHide.current = setTimeout(() => collapseRef.current(), HEADER_HIDE_MS);
    return () => clearTimeout(autoHide.current);
  }, [collapsed]);

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

  // „Kiez“: nur bis 5 km (Daria, 29.10.2026), die nächsten zuerst, Challenges ohne Punkt danach.
  // Ohne Standortfreigabe zählt der Kiez aus dem Profil. Eigene Beiträge stehen immer drin.
  const myKiez = profile.kiez?.split(',')[0].trim().toLowerCase();
  const posts = useMemo(() => {
    const list = challenges.filter((c) => matchesTab(c, tab, groupId, currentUserId));
    if (tab !== 'nearby') return list;
    if (!here) {
      return list.filter(
        (c) => c.authorId === currentUserId || !myKiez || !c.kiez || c.kiez.split(',')[0].trim().toLowerCase() === myKiez,
      );
    }
    return list
      .map((c, i) => ({ c, i, d: distanceTo(c) }))
      .filter((x) => x.c.authorId === currentUserId || x.d === undefined || x.d <= KIEZ_RADIUS_METERS)
      .sort((a, b) => (a.d ?? Infinity) - (b.d ?? Infinity) || a.i - b.i)
      .map((x) => x.c);
  }, [challenges, tab, here, distanceTo, groupId, currentUserId, myKiez]);
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
    if ((tab === 'nearby' || tab === 'everywhere') && !requireKiez()) return;
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
  // Aus der Leiste einer anderen Seite: Reiter „Gruppen“ oder Erstellen öffnen
  const createRef = useRef(createChallenge);
  createRef.current = createChallenge;
  useEffect(() => {
    if (reiter === 'gruppen') {
      setTab('groups');
      router.setParams({ reiter: undefined });
    }
  }, [reiter, router]);
  useEffect(() => {
    if (erstellen !== '1') return;
    router.setParams({ erstellen: undefined });
    createRef.current();
  }, [erstellen, router]);
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
    // Sprung nach oben ist kein Zurückscrollen: Kopf bleibt weg
    maxY.current = 0;
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
          const order = tabOrderRef.current;
          const index = order.indexOf(tabRef.current);
          const next = g.dx < -SWIPE_DISTANCE || g.vx < -0.5 ? index + 1 : g.dx > SWIPE_DISTANCE || g.vx > 0.5 ? index - 1 : index;
          if (next !== index && next >= 0 && next < order.length) {
            selectTabRef.current(order[next]);
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
    const from = tabOrder.indexOf(tab);
    const to = tabOrder.indexOf(key);
    selectTab(key);
    if (to === from) return;
    swipeX.setValue(to > from ? motion.tabSwitch.offset : -motion.tabSwitch.offset);
    Animated.spring(swipeX, { toValue: 0, useNativeDriver: false, ...motion.tabSwitch.spring }).start();
  };

  const typeOfTab = tab === 'wave' ? 'wave' : null;
  const planned = typeOfTab && !isTypeActive(typeOfTab) ? challengeTypes[typeOfTab] : null;
  // Stories erst in der Ziel-Ansicht und nur, wenn es welche gibt.
  // Echte Stories gibt es noch nicht; bis dahin füllen die Top-Challenges die Leiste.
  // Leiste vorerst aus: reserviert für Video-Stories später (Daria, 23.10.2026). Zum Einschalten STORIES auf true setzen.
  const showStories =
    STORIES && collapsed && tab !== 'completed' && tab !== 'groups' && !planned && !loading && topChallenges.length > 0;

  // Eigene Vorher-Nachher-Timer, die gerade laufen: oben im Feed (Daria, 23.10.2026)
  const running = useMemo(() => runningBeforeAfter(challenges, currentUserId), [challenges, currentUserId]);

  // Hinweis unter dem Umschalter: wer sieht, was Du hier postest (Daria, 27.10.2026)
  const audience = MODE_OF_TAB[tab] ?? 'kiez';
  const [audienceHint, closeAudienceHint] = useAudienceHint(audience);
  const showAudience =
    audienceHint && !composing && !loading && (tab === 'nearby' || tab === 'everywhere' || tab === 'private' || (tab === 'groups' && groups.length > 0));

  const items: FeedItem[] = [];
  if (showAudience) items.push({ kind: 'audience' });
  if (planned) items.push({ kind: 'planned' });
  if (!loading && !composing) running.forEach((challenge) => items.push({ kind: 'running', challenge }));
  if (tab === 'groups' && !loading) {
    if (groups.length === 0) items.push({ kind: 'groupsEmpty' });
    else {
      items.push({ kind: 'groupBar' });
      if (posts.length === 0) items.push({ kind: 'groupNoTasks' });
      else posts.forEach((challenge) => items.push({ kind: 'post', challenge }));
    }
  } else if (tab === 'private' && !loading && posts.length === 0) items.push({ kind: 'privateEmpty' });
  else if (loading) items.push({ kind: 'loading' });
  else if (showState && !(planned && showState === 'empty')) items.push({ kind: 'state' });
  else posts.forEach((challenge) => items.push({ kind: 'post', challenge }));

  const renderItem = ({ item }: { item: FeedItem }) => {
    switch (item.kind) {
      // Leere Reiter sehen aus wie Kiez und Überall (Daria, 29.10.2026)
      case 'groupsEmpty':
        return (
          <FeedStateMessage
            variant="empty"
            body="Erstelle Deine erste Gruppe"
            action="Gruppe gründen"
            onAction={() => router.push('/gruppen/neu')}
            secondary={{ label: 'Mit Beitrittscode beitreten', onPress: () => router.push('/gruppen/beitreten') }}
          />
        );
      case 'privateEmpty':
        return <FeedStateMessage variant="empty" body="Poste Deine erste Me-Challenge" onAction={createChallenge} />;
      case 'audience':
        return <AudienceHint audience={audience} onClose={closeAudienceHint} />;
      case 'groupBar':
        return (
          <GroupBar
            groups={groups}
            selectedId={groupId}
            onSelect={setGroupChoice}
            onOpen={(id) => router.push(`/gruppen/${id}`)}
            onCreate={() => router.push('/gruppen/neu')}
          />
        );
      case 'groupNoTasks':
        return <FeedStateMessage variant="empty" body="Poste die erste Challenge in Deiner Gruppe" onAction={createChallenge} />;
      case 'running':
        return (
          <RunningBeforeAfter
            challenge={item.challenge}
            onPress={() => router.push({ pathname: '/vorher-nachher/[id]', params: { id: item.challenge.id } })}
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
  // Fashionable Look: Der Kopf trägt Profil und Chats und bleibt stehen (Daria, 24.10.2026). Nur beim Erstellen geht er weg.
  const headerStyle = headerHeight && isFashionable
    ? {
        height: composeAnim.interpolate({ inputRange: [0, 1], outputRange: [headerHeight, 0] }),
        opacity: composeAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] }),
      }
    : headerHeight
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
  // Fashionable Look: Erstellen sitzt in der Leiste unten, die Reiter nutzen die volle Breite ohne Rand
  const tabsPaddingRight = isFashionable
    ? 0
    : Animated.add(
        progress.interpolate({ inputRange: [0, 1], outputRange: [space[16], space[16] + CAMERA_WIDTH + space[8]] }),
        composeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -(CAMERA_WIDTH + space[8])] }),
      );
  const composeHeaderStyle = {
    height: composeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, COMPOSE_HEADER] }),
    opacity: composeAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] }),
    transform: [{ translateY: composeAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
  };
  const composeTarget = tab === 'groups' ? groupId : tab === 'private' ? 'private' : 'public';
  // Kurz und gleich für jede Gruppe (Daria, 24.10.2026)
  const composeLine = tab === 'groups' ? t('Aufgabe erstellen') : t('Challenge erstellen');
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
      <Animated.View style={[styles.tabsRow, isFashionable && styles.tabsRowFashionable, { paddingRight: tabsPaddingRight }]}>
        <TabsNavigation selectedKey={tab} onChange={switchTab} visible={modes.visible} />
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
          keyExtractor={(item) =>
            item.kind === 'post' ? item.challenge.id : item.kind === 'running' ? `running-${item.challenge.id}` : item.kind
          }
          renderItem={renderItem}
          onScroll={onScroll}
          onScrollBeginDrag={() => (dragging.current = true)}
          onScrollEndDrag={() => (dragging.current = false)}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.list, isFashionable ? null : styles.listTop, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
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
      {composing || isFashionable ? null : <CameraButton onPress={createChallenge} />}
      {composing ? null : <TabBar
        active="feed"
        onFeedPress={() => switchTab(standardTab)}
        onMenuPress={() => router.push('/account')}
        onCreatePress={createChallenge}
        onGroupsPress={groupsOn ? () => switchTab('groups') : undefined}
        groupsActive={tab === 'groups'}
      />}
      <SurveyOverlay visible={surveyVisible} onClose={closeSurvey} />
    </View>
  );
}

/** Breite der Kamera oben rechts (TabBar.tsx, CameraButton) */
const CAMERA_WIDTH = CAMERA_W;
/** Stories-Leiste oben im Feed (Top-Challenges, später Videos) */
const STORIES = false;
/** Nach so vielen Millisekunden ohne Interaktion gleiten Logo und Begrüßung weg */
const HEADER_HIDE_MS = 3500;
/** Höhe des schmalen Kopfs beim Erstellen */
const COMPOSE_HEADER = 52;

/** Reihenfolge der Reiter, auch für das Wischen: Privat, Gruppe, Kiez, Überall (Daria, 27./29.10.2026) */
const TAB_ORDER: FeedTab[] = ['private', 'groups', 'nearby', 'everywhere'];
/** Mindestweg in Punkten, ab dem ein Wischen den Reiter wechselt */
const SWIPE_DISTANCE = 64;

type FeedItem =
  | { kind: 'planned' }
  | { kind: 'audience' }
  | { kind: 'groupsEmpty' }
  | { kind: 'groupBar' }
  | { kind: 'groupNoTasks' }
  | { kind: 'privateEmpty' }
  | { kind: 'loading' }
  | { kind: 'state' }
  | { kind: 'running'; challenge: Challenge }
  | { kind: 'post'; challenge: Challenge };

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: space[48] },
  screen: { flex: 1, backgroundColor: color.bg.screen },
  flex: { flex: 1 },
  clip: { overflow: 'hidden' },
  // Fashionable Look: Beiträge ohne Lücke, jeder Beitrag bringt 16 pt Abstand unten selbst mit
  list: { gap: isFashionable ? 0 : space[24] },
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
  // Unterstrich-Reiter über die ganze Breite, Haarlinie unten schließt an den ersten Beitrag an
  tabsRowFashionable: { paddingTop: 0, paddingBottom: 0, paddingLeft: 0 },
});
