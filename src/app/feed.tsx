import { RoutineNudge } from '../components/RoutineNudge';
import { RoutineContent } from '../components/RoutineContent';
import { clearRoutinePost } from '../data/reminders';
import { clearShowcasePost, peekShowcasePost } from '../data/showcase';
import { nudgeCrystals } from '../components/icons/Brand';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  FlatList,
  PanResponder,
  RefreshControl,
  StyleSheet,
  View,
  type GestureResponderEvent,
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
import { AppHeader, FeedGreeting, MODE_OF_TAB, PlannedHint, Segments, TAB_OF_MODE, TabsNavigation, TopChallengeBar, type FeedTab } from '../components/FeedHeader';
import { FeedStateMessage } from '../components/FeedStateMessage';
import { GroupBar } from '../components/GroupBar';
import { AudienceHint, useAudienceHint } from '../components/AudienceHint';
import { GearsLoader } from '../components/GearsLoader';
import { SurveyOverlay, useSurveyPrompt } from '../components/SurveyOverlay';
import { TAB_BAR_SPACE, TabBar } from '../components/TabBar';
import { useRoutineEnabled, useRoutineIsStandard } from '../data/routine';
import { useRequireKiez } from '../data/kiez';
import { challengeTypes, isTypeActive, useModes, usePostsShown } from '../data/features';
import { anrede } from '../data/format';
import { coordsIfAllowed, distanceMeters, formatDistance, KIEZ_RADIUS_METERS, sameKiez, type Coords } from '../data/location';
import { reiseEntries } from '../data/reise';
import { runningBeforeAfter, topChallenges as pickTopChallenges, useStore } from '../data/store';
import { RunningBeforeAfter } from '../components/BeforeAfterTimer';
import { useFeedViews } from '../data/seen';
import type { Challenge } from '../data/types';
import { color, isFashionable, motion, space, text } from '../theme/tokens';
import { cardSwipe, resetCardSwipe } from '../lib/cardSwipe';

const COMPLETED = new Set(['confirmed', 'payment_open', 'paid_marked', 'paid']);

// Abgeschaltete Typen bleiben sichtbar, wenn es sie in der Datenbank gibt.
/** Reiter aus dem Parameter `reiter` */
const TAB_OF_PARAM: Record<string, FeedTab> = { privat: 'private', kiez: 'nearby', ueberall: 'everywhere', gruppen: 'groups' };

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

/** Beim Start schon entschieden, ob die Routine aufgeht; gilt einmal pro App-Start */
let startChecked = false;

/** Route `feed` – Figma „FeedScreen“ (Filled, Loading, Empty, Error, Offline). */
export default function FeedScreen() {
  const router = useRouter();
  const routineOn = useRoutineEnabled();
  const routineStandard = useRoutineIsStandard();
  const insets = useSafeAreaInsets();
  const { challenges, users, feedState, feedError, mode, currentUserId, profile, dispatch, load, groups } = useStore();
  const requireKiez = useRequireKiez();
  const [surveyVisible, closeSurvey] = useSurveyPrompt();
  // `gruppe`: aus der Gruppenseite („Aufgaben ansehen“) direkt in den Reiter „Gruppen“
  // `reiter=gruppen` und `erstellen=1`: aus der Leiste im Fashionable Look von anderen Seiten
  // `reiter` und `neu`: nach dem Posten in den passenden Reiter (`neu` ist die Id des Posts, damit es jedes Mal greift)
  const { gruppe, reiter, erstellen, neu } = useLocalSearchParams<{
    gruppe?: string;
    reiter?: string;
    erstellen?: string;
    neu?: string;
  }>();
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
  // Nach dem Posten (Daria, 07.11.2026): in den Reiter, in dem der neue Post steht, und nach oben
  useEffect(() => {
    const target = reiter ? TAB_OF_PARAM[reiter] : undefined;
    if (!target) return;
    setTab(target);
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: false }));
  }, [reiter, neu]);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<FeedItem>>(null);
  const feedViews = useFeedViews(mode === 'live', currentUserId);

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
    else if (settled && y <= 0 && maxY.current > 120) expand();
    else if (settled && dragging.current && y < -24) reveal();
    lastY.current = y;
  };

  // Ganz oben ein kleines Stück nach unten ziehen klappt den Kopf wieder auf (Daria, 31.10.2026).
  // Im Browser (auch als Web-App auf dem iPhone) gibt es kein Zurückfedern unter 0, deshalb zählt hier die Fingerbewegung.
  // Nur ein Zug nach unten zählt, kein seitliches Wischen zwischen den Reitern (Daria, 2026-11-12)
  const pullStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: GestureResponderEvent) => {
    pullStart.current = lastY.current <= 0 ? touchPoint(e) : null;
  };
  const onTouchMove = (e: GestureResponderEvent) => {
    if (pullStart.current === null) return;
    const now = touchPoint(e);
    const dy = now.y - pullStart.current.y;
    const dx = now.x - pullStart.current.x;
    if (!(dy >= 24 && dy > Math.abs(dx) * 1.5)) return;
    pullStart.current = null;
    reveal();
  };
  // Ganz oben weiter nach oben ziehen: Kopf zurück, in „Me & Myself“ auch der große Umschalter (Daria, 2026-11-12)
  const revealRef = useRef(() => {});
  const reveal = () => {
    expand();
    revealRef.current();
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
  // Ohne Standortfreigabe zählt der Kiez aus dem Profil (Ortsteil, PLZ oder Stadt, siehe sameKiez).
  // Eigene Beiträge stehen immer drin.
  const myKiez = profile.kiez;
  const postsShown = usePostsShown();
  const posts = useMemo(() => {
    // Bilder und Textposts (Typ „photo“, mit oder ohne Foto) im Kiez- oder Überall-Feed ausblenden,
    // wenn unter Dein Konto › Funktionen abgeschaltet (Daria, 09.11.2026). Eigene bleiben sichtbar.
    const hidden = (c: Challenge) =>
      ((tab === 'nearby' && !postsShown.kiez) || (tab === 'everywhere' && !postsShown.everywhere)) &&
      c.authorId !== currentUserId &&
      c.type === 'photo';
    const list = challenges.filter((c) => matchesTab(c, tab, groupId, currentUserId) && !hidden(c));
    if (tab !== 'nearby') return list;
    if (!here) {
      return list.filter(
        (c) => c.authorId === currentUserId || !myKiez || !c.kiez || sameKiez(c.kiez, myKiez),
      );
    }
    return list
      .map((c, i) => ({ c, i, d: distanceTo(c) }))
      .filter((x) => x.c.authorId === currentUserId || x.d === undefined || x.d <= KIEZ_RADIUS_METERS)
      .sort((a, b) => (a.d ?? Infinity) - (b.d ?? Infinity) || a.i - b.i)
      .map((x) => x.c);
  }, [challenges, tab, here, distanceTo, groupId, currentUserId, myKiez, postsShown.kiez, postsShown.everywhere]);
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
  // Beim Erstellen: Ort lila, bis die Person die Pille berührt; danach der Typ (Daria, 2026-10-31)
  const [placeTouched, setPlaceTouched] = useState(false);
  const composeAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const wasCollapsed = useRef(false);
  const createChallenge = () => {
    if ((tab === 'nearby' || tab === 'everywhere') && !requireKiez()) return;
    wasCollapsed.current = collapsed;
    setPlaceTouched(false);
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
    // Ohne Post verfällt ein Auftrag aus einer Erinnerung (data/reminders.ts)
    clearRoutinePost();
    clearShowcasePost();
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
  // Getrennt nach Art, ohne Gruppen und private Posts (Daria, 31.10.2026)
  const openCounts = useMemo(() => {
    const open = challenges.filter((c) => !c.groupId && !c.private && c.status === 'open');
    return {
      challenges: open.filter((c) => c.type === 'individual' || c.type === 'wave').length,
      me: open.filter((c) => c.type === 'before_after').length,
      photos: open.filter((c) => c.type === 'photo').length,
    };
  }, [challenges]);
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
  // Wechsel wie horizontales Wischen (Daria, 2026-11-10): Der Inhalt folgt dem Finger, gleitet beim Wechsel
  // ganz hinaus, und der neue Reiter kommt von der Seite herein, auf der er in der Leiste liegt. Er federt
  // mit der bisherigen Feder ein. Ohne Nachbarn auf der Seite gibt der Inhalt nur zäh nach und federt zurück.
  const { width: screenWidth } = useAppDimensions();
  const widthRef = useRef(screenWidth);
  widthRef.current = screenWidth;
  const slideOut = (dir: 1 | -1, done: () => void) =>
    Animated.timing(swipeX, {
      toValue: -dir * widthRef.current,
      duration: motion.tabSwitch.exit,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(done);
  // Der Schalter fährt sofort los, der Inhalt hinkt ein wenig hinterher: erst gleitet der alte Reiter hinaus,
  // dann fährt der neue sichtbar herein und federt am Ende nach (Daria, 2026-11-10).
  const [switchingTo, setSwitchingTo] = useState<FeedTab | null>(null);
  const slideIn = (dir: 1 | -1) => {
    swipeX.setValue(dir * widthRef.current);
    Animated.spring(swipeX, { toValue: 0, useNativeDriver: false, ...motion.tabSwitch.spring }).start();
  };
  // Routine ist ein Reiter links neben den anderen (Daria, 2026-11-11): dieselbe Bewegung wie zwischen den Reitern.
  // `routineActive`: Der helle Knopf steht auf „Routine“. `routineShown`: Der Inhalt zeigt die Routine.
  const [routineActive, setRoutineActive] = useState(false);
  const [routineShown, setRoutineShown] = useState(false);
  const routineShownRef = useRef(false);
  routineShownRef.current = routineShown;
  // „Me & Myself“ (Daria, 2026-11-12) ersetzt „Routine“ links im Umschalter. Darin „My Structure“ (Routine) und
  // „My Feed“ (Privat), umzuschalten über einen kleinen eigenen Umschalter. Der große Umschalter verschwindet in
  // „My Feed“ und kommt erst zurück, wenn man ganz oben weiter nach oben zieht oder in „Gruppe“ wischt.
  const privateOn = tabOrder.includes('private');
  const meOn = !isFashionable && !composing && (routineOn || privateOn);
  const meActive = meOn && (routineActive || (switchingTo ?? tab) === 'private');
  const meBoth = meOn && routineOn && privateOn;
  const [meSwitchOpen, setMeSwitchOpen] = useState(false);
  useEffect(() => {
    if (meActive) setMeSwitchOpen(false);
  }, [meActive]);
  const meActiveRef = useRef(meActive);
  meActiveRef.current = meActive;
  revealRef.current = () => meActiveRef.current && setMeSwitchOpen(true);
  // Nur in „My Feed“ (Privat) verschwindet der große Umschalter, in „My Structure“ bleibt er (Daria, 2026-11-12)
  const bigSwitchShown = !meActive || !meBoth || meSwitchOpen || routineActive;
  const slideToTab = useRef((key: FeedTab, dir: 1 | -1) => {
    setSwitchingTo(key);
    setRoutineActive(false);
    slideOut(dir, () => {
      selectTabRef.current(key);
      setSwitchingTo(null);
      setRoutineShown(false);
      slideIn(dir);
    });
  }).current;
  // Routine: Der Knopf gleitet hinüber, der Feed gleitet nach rechts hinaus, die Routine kommt von links und federt ein.
  const openRoutine = useRef(() => {
    setRoutineActive(true);
    slideOut(-1, () => {
      lastY.current = 0;
      setRoutineShown(true);
      slideIn(-1);
    });
  }).current;
  // Routine als Standard (Daria, 2026-11-10): Beim App-Start geht die Routine auf, zurück geht es in den Feed.
  // Nicht, wenn der Feed mit einem Ziel geöffnet wurde (Reiter, Gruppe, Erstellen, neuer Post).
  useEffect(() => {
    if (startChecked || !modes.ready) return;
    startChecked = true;
    if (routineStandard && !gruppe && !reiter && !erstellen && !neu) openRoutine();
  }, [modes.ready, routineStandard, gruppe, reiter, erstellen, neu, openRoutine]);
  // Android: Zurück aus der Routine führt zum ersten Reiter, wie sonst zurück in den Feed
  useEffect(() => {
    if (!routineShown) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      slideToTab(tabOrderRef.current[0], 1);
      return true;
    });
    return () => sub.remove();
  }, [routineShown, slideToTab]);
  // `reiter=routine`: Die Seite `routine` leitet hierher, die Routine steht dann gleich da, ohne Bewegung
  useEffect(() => {
    if (reiter !== 'routine') return;
    router.setParams({ reiter: undefined });
    if (!routineOn || isFashionable) return;
    swipeX.setValue(0);
    setRoutineActive(true);
    setRoutineShown(true);
  }, [reiter, router, routineOn, swipeX]);
  const routineLeftRef = useRef(false);
  routineLeftRef.current = routineOn && !composing && !isFashionable;

  const swipe = useMemo(
    () =>
      PanResponder.create({
        // Neue Berührung: Ob sie auf wischbaren Karten liegt, setzen die Karten danach selbst (lib/cardSwipe.ts)
        onStartShouldSetPanResponderCapture: resetCardSwipe,
        // Auf Karten, die man seitlich wischt (Routine), wechselt das Wischen nicht den Reiter (Daria, 2026-11-12)
        onMoveShouldSetPanResponderCapture: (_, g) =>
          !cardSwipe.active && Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderGrant: () => swipeX.stopAnimation(),
        onPanResponderMove: (_, g) => {
          const order = tabOrderRef.current;
          const index = order.indexOf(tabRef.current);
          // In der Routine liegt rechts der erste Reiter, links nichts
          const hasNext = routineShownRef.current
            ? g.dx < 0
            : g.dx < 0
              ? index < order.length - 1
              : index > 0 || routineLeftRef.current;
          swipeX.setValue(hasNext ? g.dx : g.dx * 0.25);
        },
        onPanResponderRelease: (_, g) => {
          const order = tabOrderRef.current;
          const index = order.indexOf(tabRef.current);
          const next = g.dx < -SWIPE_DISTANCE || g.vx < -0.5 ? index + 1 : g.dx > SWIPE_DISTANCE || g.vx > 0.5 ? index - 1 : index;
          // Aus der Routine nach links gewischt: zum ersten Reiter
          if (routineShownRef.current) {
            if (next > index) slideToTab(order[0], 1);
            else Animated.spring(swipeX, { toValue: 0, useNativeDriver: false, ...motion.tabSwitch.spring }).start();
            return;
          }
          if (next !== index && next >= 0 && next < order.length) {
            // Nach links gewischt: der rechte Nachbar kommt von rechts herein, und umgekehrt
            slideToTab(order[next], next > index ? 1 : -1);
            return;
          }
          // Ganz links nach rechts gewischt: Routine öffnet sich
          if (next === -1 && routineLeftRef.current) {
            openRoutine();
            return;
          }
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: false, ...motion.tabSwitch.spring }).start();
        },
        onPanResponderTerminate: () =>
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: false, ...motion.barrierSpring }).start(),
      }),
    [swipeX, slideToTab, openRoutine],
  );

  // Tippen auf einen Reiter: dieselbe Bewegung wie beim Wischen, aus der Richtung des Reiters.
  const switchTab = (key: FeedTab) => {
    // Aus der Routine liegt jeder Reiter rechts
    if (routineActive) {
      slideToTab(key, 1);
      return;
    }
    const from = tabOrder.indexOf(tab);
    const to = tabOrder.indexOf(key);
    if (to === from) {
      selectTab(key);
      return;
    }
    slideToTab(key, to > from ? 1 : -1);
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

  // Hinweis unter dem Umschalter: wer sieht, was Du hier postest (Daria, 27.10.2026). In allen vier Reitern,
  // auch in „Gruppe“ ohne Gruppe (Daria, 29.10.2026)
  const audience = MODE_OF_TAB[tab] ?? 'kiez';
  const [audienceHint, closeAudienceHint, audienceHidden, closeAudienceLine] = useAudienceHint(audience);
  const showAudience =
    audienceHint && !composing && !loading && (tab === 'nearby' || tab === 'everywhere' || tab === 'private' || tab === 'groups');

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

  // Leerer Zustand steht unter der Liste und füllt den Rest bis zur Leiste, mittig. So verteilt sich der Platz
  // oben und unten gleich (Daria, 2026-11-09).
  const emptyItem = items.find((i) => EMPTY_KINDS.has(i.kind));
  const listItems = emptyItem ? items.filter((i) => i !== emptyItem) : items;

  const renderItem = ({ item }: { item: FeedItem }) => {
    switch (item.kind) {
      // Leere Reiter sehen aus wie Kiez und Überall (Daria, 29.10.2026)
      case 'groupsEmpty':
        return (
          <FeedStateMessage
            style={styles.emptyState}
            variant="empty"
            body="Erstelle Deine erste Gruppe"
            action="Gruppe gründen"
            onAction={() => router.push('/groups/new')}
            secondary={{ label: 'Mit Passcode beitreten', onPress: () => router.push('/groups/join') }}
          />
        );
      case 'privateEmpty':
        return <FeedStateMessage style={styles.emptyState} variant="empty" body="Poste Deine erste Me-Challenge" onAction={createChallenge} />;
      case 'audience':
        return <AudienceHint audience={audience} onClose={closeAudienceHint} hidden={audienceHidden} onCloseLine={closeAudienceLine} />;
      case 'groupBar':
        return (
          <GroupBar
            groups={groups}
            selectedId={groupId}
            onSelect={setGroupChoice}
            onOpen={(id) => router.push(`/groups/${id}`)}
            onCreate={() => router.push('/groups/new')}
          />
        );
      case 'groupNoTasks': {
        // Zweiter Knopf lädt in die leere Gruppe ein: QR-Code oder Link und Passcode (Daria, 08.11.2026)
        const group = groups.find((g) => g.id === groupId);
        return (
          <FeedStateMessage
            style={styles.emptyState}
            variant="empty"
            body="Poste die erste Challenge in Deiner Gruppe"
            onAction={createChallenge}
            secondary={
              group
                ? { hint: 'Einsam hier? Lade Freunde und Familie zu Deiner Gruppe ein.', label: 'Einladen', onPress: () => router.push(`/groups/${group.id}/invite`) }
                : undefined
            }
          />
        );
      }
      case 'running':
        return (
          <RunningBeforeAfter
            challenge={item.challenge}
            onPress={() => router.push({ pathname: '/before-after/[id]', params: { id: item.challenge.id } })}
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
            style={styles.emptyState}
            variant={showState}
            detail={showState === 'error' ? feedError : undefined}
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
  // Die Kamera oben rechts ist weg (Daria, 2026-11-09), die Reiter nutzen die volle Breite.
  // Fashionable Look: Erstellen sitzt in der Leiste unten, die Reiter nutzen die volle Breite ohne Rand
  const tabsPaddingRight = isFashionable ? 0 : space[16];
  const composeHeaderStyle = {
    height: composeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, COMPOSE_HEADER] }),
    opacity: composeAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] }),
    transform: [{ translateY: composeAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
  };
  const composeTarget = tab === 'groups' ? groupId : tab === 'private' ? 'private' : 'public';
  // Kurz und gleich für jede Gruppe (Daria, 24.10.2026)
  // Post für ein Schaufenster: Der Kopf nennt es (Daria, 2026-11-10)
  const showcasePost = composing ? peekShowcasePost() : null;
  const composeLine = showcasePost
    ? t('Post für {name}', { name: showcasePost.name })
    : tab === 'groups'
      ? t('We-Challenge erstellen')
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
            onLogoPress={() => router.push('/me')}
            onLogoLongPress={() => router.push('/demo')}
            hasTasks={hasTasks}
          />
          <FeedGreeting name={anrede(profile)} kiez={kiezName} counts={feedState === 'loading' ? undefined : openCounts} />
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
      {bigSwitchShown ? (
      <Animated.View style={[styles.tabsRow, isFashionable && styles.tabsRowFashionable, { paddingRight: tabsPaddingRight }]}>
        <View style={styles.flex}>
        <TabsNavigation
          selectedKey={switchingTo ?? tab}
          onChange={(key) => {
            if (composing) setPlaceTouched(true);
            switchTab(key);
          }}
          // „Privat“ steckt in „Me & Myself“ (Daria, 2026-11-12); beim Erstellen bleibt es als Ziel wählbar
          visible={meOn ? modes.visible.filter((m) => m !== 'private') : modes.visible}
          accent={composing && !placeTouched}
          // „Me & Myself“ links neben den Reitern, wie vorher „Routine“ (Daria, 2026-11-12). Öffnet die Routine
          // („My Structure“), ohne Routine „My Feed“.
          lead={
            meOn
              ? { label: t('Me & Myself'), active: meActive, onPress: () => !meActive && (routineOn ? openRoutine() : switchTab('private')) }
              : routineOn && !composing && !isFashionable
                ? { label: t('Routine'), active: routineActive, onPress: () => !routineActive && openRoutine() }
                : undefined
          }
        />
        </View>
      </Animated.View>
      ) : null}
      {meActive && meBoth ? (
        <View style={[styles.tabsRow, { paddingRight: tabsPaddingRight }]}>
          <View style={styles.flex}>
            <Segments
              tabs={ME_TABS}
              selectedKey={routineActive ? 'structure' : 'private'}
              onChange={(key) => {
                if (key === 'structure') !routineActive && openRoutine();
                else if (routineActive) switchTab('private');
              }}
            />
          </View>
        </View>
      ) : null}
      <Animated.View style={[styles.clip, storiesStyle]}>
        <View onLayout={(e) => setStoriesHeight(e.nativeEvent.layout.height)}>
          <TopChallengeBar items={topChallenges} onItemPress={openChallenge} />
        </View>
      </Animated.View>
      <View style={styles.flex}>
        <Animated.View style={[styles.flex, { transform: [{ translateX: swipeX }] }]} {...swipe.panHandlers}>
        {routineShown ? (
          <View
            style={styles.flex}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={() => (pullStart.current = null)}
          >
            <RoutineContent
              topPad={space[8]}
              bottomPad={insets.bottom + TAB_BAR_SPACE}
              onScroll={(e) => (lastY.current = e.nativeEvent.contentOffset.y)}
            />
          </View>
        ) : (
        <FlatList
          ref={listRef}
          data={listItems}
          keyExtractor={(item) =>
            item.kind === 'post' ? item.challenge.id : item.kind === 'running' ? `running-${item.challenge.id}` : item.kind
          }
          renderItem={renderItem}
          viewabilityConfig={feedViews.viewabilityConfig}
          onViewableItemsChanged={feedViews.onViewableItemsChanged}
          onScroll={onScroll}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={() => (pullStart.current = null)}
          onScrollBeginDrag={() => (dragging.current = true)}
          onScrollEndDrag={() => (dragging.current = false)}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.list, isFashionable ? null : styles.listTop, emptyItem && styles.listGrow, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
          // Kater erinnert an fällige Erinnerungen, vorerst nur mit Routine (Daria, 2026-11-10)
          ListHeaderComponent={routineOn ? <RoutineNudge enabled onOpen={routineOn && !composing && !isFashionable ? openRoutine : undefined} /> : null}
          ListFooterComponent={emptyItem ? renderItem({ item: emptyItem }) : null}
          ListFooterComponentStyle={emptyItem ? styles.emptyFooter : undefined}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.text.secondary} />
          }
        />
        )}
        </Animated.View>
        {composing ? (
          <Animated.View
            style={[
              styles.composeSheet,
              { transform: [{ translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [screenHeight, 0] }) }] },
            ]}
          >
            <ComposeSheet
              key={composeKey}
              target={composeTarget}
              onDone={() => closeCompose(true)}
              placeConfirmed={placeTouched || modes.visible.length < 2}
            />
          </Animated.View>
        ) : null}
      </View>
      {composing ? null : <TabBar
        active="feed"
        onFeedPress={() => switchTab(standardTab)}
        onMenuPress={() => router.push('/account')}
        onCreatePress={createChallenge}
        onGroupsPress={groupsOn ? () => switchTab('groups') : undefined}
        groupsActive={tab === 'groups'}
        routineActive={routineActive}
        onRoutinePress={openRoutine}
      />}
      <SurveyOverlay visible={surveyVisible} onClose={closeSurvey} />
    </View>
  );
}

/** Fingerposition; im Browser steht sie nur in `touches`, nicht direkt im Ereignis */
function touchPoint(e: GestureResponderEvent) {
  const t = e.nativeEvent.touches?.[0] ?? e.nativeEvent;
  return { x: t.pageX, y: t.pageY };
}

/** Stories-Leiste oben im Feed (Top-Challenges, später Videos) */
const STORIES = false;
/** Nach so vielen Millisekunden ohne Interaktion gleiten Logo und Begrüßung weg */
const HEADER_HIDE_MS = 3500;
/** Höhe des schmalen Kopfs beim Erstellen */
const COMPOSE_HEADER = 52;

/** Reihenfolge der Reiter, auch für das Wischen: Privat, Gruppe, Kiez, Überall (Daria, 27./29.10.2026) */
const TAB_ORDER: FeedTab[] = ['private', 'groups', 'nearby', 'everywhere'];
/** Umschalter in „Me & Myself“: links „My Structure“ (Routine), rechts „My Feed“ (Privat), Daria, 2026-11-12 */
const ME_TABS: { key: 'structure' | 'private'; label: string }[] = [
  { key: 'structure', label: 'Meine Struktur' },
  { key: 'private', label: 'Mein Feed' },
];
/** Mindestweg in Punkten, ab dem ein Wischen den Reiter wechselt */
const SWIPE_DISTANCE = 64;

/** Leere Zustände: stehen als Fuß der Liste, mittig im freien Platz */
const EMPTY_KINDS = new Set<FeedItem['kind']>(['groupsEmpty', 'groupNoTasks', 'privateEmpty', 'state']);

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
  // Etwas mehr Abstand zwischen den Posts (Daria, 2026-11-09)
  list: { gap: isFashionable ? 0 : space[32] },
  listTop: { paddingTop: space[8] },
  listGrow: { flexGrow: 1 },
  // Unten etwas Luft über der Leiste, oben trennt schon der Abstand der Liste
  emptyFooter: { flex: 1, justifyContent: 'center', paddingBottom: space[12] },
  emptyState: { paddingTop: 0 },
  composeHeader: { height: COMPOSE_HEADER, flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: space[8] },
  composeLine: { ...text.title, flex: 1, color: color.text.primary },
  composeSheet: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    backgroundColor: color.bg.screen,
    paddingTop: space[8],
    paddingBottom: space[8],
    paddingLeft: space[16],
  },
  // Unterstrich-Reiter über die ganze Breite, Haarlinie unten schließt an den ersten Beitrag an
  tabsRowFashionable: { paddingTop: 0, paddingBottom: 0, paddingLeft: 0 },
});
