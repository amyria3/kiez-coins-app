import { RoutineNudge } from '../components/RoutineNudge';
import { GalleryWall } from '../components/feed/GalleryFrame';
import { RoutineCalendarDesktop, RoutineCalendarStages } from '../components/RoutineList';
import { getCalendarLevel, setCalendarLevel, useCalendarLevel, useRoutineData } from '../data/routineView';
import { RoutineContent } from '../components/RoutineContent';
import { clearRoutinePost } from '../data/reminders';
import { clearShowcasePost, peekShowcasePost, SEARCH_MIN, searchShowcases, type ShowcaseHit } from '../data/showcase';
import { useFeature } from '../data/unlock';
import { ShowcaseHitList, ShowcaseSearchField } from '../components/ShowcaseSearch';
import { nudgeCrystals } from '../components/icons/Brand';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  FlatList,
  Keyboard,
  PanResponder,
  Platform,
  RefreshControl,
  View,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChallengePost } from '../components/ChallengePost';
import { COMPOSE_TITLE, ComposeSheet, type ComposeKind } from '../components/compose/ComposeSheet';
import { PrivateSignalProvider, useSpaceOverride, type Space } from '../theme/signal';
import { takeComposeDone } from '../components/compose/compose';
import { IconButton } from '../components/IconButton';
import { Text } from '../components/T';
import { t } from '../data/texts';
import { FEED_WALL_FROM, FEED_WALL_WIDTH, useAppDimensions, useDesktop } from '../theme/layout';
import { DesktopAside } from '../components/DesktopAside';
import { useDesktopContentWidth } from '../components/DesktopNav';
import { FeedAside } from '../components/FeedAside';
import { useFeedEvents, useOwnToday, type FeedScope } from '../data/feedSummary';
import { AppHeader, FeedGreeting, greetingParts, MODE_OF_TAB, PlannedHint, Segments, TAB_OF_MODE, TabsNavigation, TopChallengeBar, type FeedTab } from '../components/FeedHeader';
import { FeedStateMessage } from '../components/FeedStateMessage';
import { GroupBar } from '../components/GroupBar';
import { AudienceHint, useAudienceHint } from '../components/AudienceHint';
import { GearsLoader } from '../components/GearsLoader';
import { SurveyOverlay, useSurveyPrompt } from '../components/SurveyOverlay';
import { TAB_BAR_HEIGHT, TAB_BAR_SPACE, TabBar, tabBarBottom } from '../components/TabBar';
import { useRoutineEnabled, useRoutineIsStandard } from '../data/routine';
import { useRequireKiez } from '../data/kiez';
import { challengeTypes, isTypeActive, useModes, usePostsShown } from '../data/features';
import { salutation } from '../data/format';
import { coordsIfAllowed, distanceMeters, formatDistance, KIEZ_RADIUS_METERS, sameKiez, type Coords } from '../data/location';
import { journeyEntries } from '../data/journey';
import { isModerator } from '../data/remote';
import { runningBeforeAfter, topChallenges as pickTopChallenges, useStore } from '../data/store';
import { RunningBeforeAfter } from '../components/BeforeAfterTimer';
import { useFeedViews } from '../data/seen';
import type { Challenge } from '../data/types';
import { forgetMove, MOVE_LINK, useMovedPosts } from '../data/movedPosts';
import { Notice } from '../components/Content';
import { color, motion, space } from '../theme/tokens';
import { cardSwipe, resetCardSwipe } from '../lib/cardSwipe';
import { touchEnded, touchStarted, whenUntouched } from '../lib/touching';
import { useIntroDone } from '../lib/intro';
import { PageSlideProvider, slideNext, takeSlide, type SlideDir } from '../lib/pageSlide';
import { TAB_OF_PARAM, matchesTab, touchPoint, STORIES, HEADER_HIDE_MS, SEARCH_FADE_MS, PULL_SEARCH, PULL_HEADER, COMPOSE_HEADER, TAB_ORDER, ME_TABS, SWIPE_DISTANCE, EMPTY_KINDS, FeedItem } from '../components/feed/feedConstants';
import { styles } from '../components/feed/feedStyles';

/** Beim Start schon entschieden, ob die Routine aufgeht; gilt einmal pro App-Start */
let startChecked = false;

/** Route `feed` – Figma „FeedScreen“ (Filled, Loading, Empty, Error, Offline). */
const WallGap = () => <View style={styles.wallGap} />;

export default function FeedScreen() {
  const router = useRouter();
  const routineOn = useRoutineEnabled();
  const routineStandard = useRoutineIsStandard();
  const insets = useSafeAreaInsets();
  const { challenges, users, feedState, feedError, mode, currentUserId, profile, dispatch, load, groups } = useStore();
  const requireKiez = useRequireKiez();
  const [surveyVisible, closeSurvey] = useSurveyPrompt();
  // `gruppe`: aus der Gruppenseite („Aufgaben ansehen“) direkt in den Reiter „Gruppen“
  // `reiter` und `neu`: nach dem Posten in den passenden Reiter (`neu` ist die Id des Posts, damit es jedes Mal greift)
  const { gruppe: groupParam, reiter: tabParam, erstellen: create, neu: isNew } = useLocalSearchParams<{
    gruppe?: string;
    reiter?: string;
    erstellen?: string;
    neu?: string;
  }>();
  const [chosenTab, setTab] = useState<FeedTab | undefined>(groupParam || tabParam === 'gruppen' ? 'groups' : undefined);
  // Modi Privat, Gruppe, Kiez (Dein Konto › Funktionen, Daria, 27.10.2026): verborgene haben keinen Reiter,
  // ohne eigene Wahl gilt der Standard
  const modes = useModes();
  const groupsOn = modes.isVisible('groups');
  const tabOrder = TAB_ORDER.filter((key) => modes.visible.some((m) => TAB_OF_MODE[m] === key));
  const standardTab = TAB_OF_MODE[modes.standard];
  const tab: FeedTab = chosenTab && tabOrder.includes(chosenTab) ? chosenTab : standardTab;
  const tabOrderRef = useRef(tabOrder);
  // „Me & Myself“ aktiv, für die Kamera (createChallenge)
  const meActiveRef = useRef(false);
  tabOrderRef.current = tabOrder;
  const [groupChoice, setGroupChoice] = useState<string | undefined>(groupParam);
  // Gewählte Art im Erstellen-Blatt, für die Überschrift (Daria, 2026-11-14)
  const [composeKind, setComposeKind] = useState<ComposeKind>('photo');
  const groupId = groups.find((g) => g.id === groupChoice)?.id ?? groups[0]?.id;
  // Mit Ziel geöffnet (Gruppe, Reiter, Erstellen, neuer Post): Die Routine weicht, sonst landet man in
  // „My Structure“ statt im Ziel. Wird unten gesetzt, wo der Zustand der Routine steht.
  const leaveRoutineRef = useRef(() => {});
  // Demo-Menü (langes Drücken aufs Logo) nur für Moderatorinnen oder schon im Demo-Modus, nicht für alle (Launch, 15.11.2026)
  const [moderator, setModerator] = useState(false);
  useEffect(() => {
    if (mode === 'live') isModerator().then(setModerator).catch(() => undefined);
  }, [mode]);
  // Beim ersten Öffnen mit Ziel startet die Routine nicht von selbst, auch wenn die Parameter schon geleert sind
  const openedWithTarget = useRef(!!(groupParam || tabParam || create || isNew)).current;
  useEffect(() => {
    if (!groupParam) return;
    leaveRoutineRef.current();
    setTab('groups');
    setGroupChoice(groupParam);
    // Parameter leeren, damit „Aufgaben ansehen“ derselben Gruppe auch beim nächsten Mal greift
    router.setParams({ gruppe: undefined });
  }, [groupParam, router]);
  // Nach dem Posten (Daria, 07.11.2026): in den Reiter, in dem der neue Post steht, und nach oben
  useEffect(() => {
    // `standard`: Feed in der Leiste einer anderen Seite (nicht in die Routine, Daria, 2026-11-17). `letzter`: von den
    // Nachrichten nach rechts gewischt, dort liegt der letzte Reiter (lib/pageSlide)
    const target =
      tabParam === 'standard'
        ? standardTab
        : tabParam === 'letzter'
          ? tabOrderRef.current[tabOrderRef.current.length - 1]
          : tabParam
            ? TAB_OF_PARAM[tabParam]
            : undefined;
    if (!target) return;
    leaveRoutineRef.current();
    setTab(target);
    // Parameter leeren, damit derselbe Reiter beim nächsten Mal wieder greift (z. B. „Post erstellen“ im Schaufenster)
    router.setParams({ reiter: undefined, neu: undefined });
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: false }));
  }, [tabParam, isNew, router, standardTab]);
  const [refreshing, setRefreshing] = useState(false);
  // Routine: „Neue Erinnerung“ ganz zu sehen, dann fehlt das Plus in der Leiste (Daria, 2026-11-23)
  const [routineNewShown, setRoutineNewShown] = useState(false);
  const listRef = useRef<FlatList<FeedItem>>(null);
  const feedViews = useFeedViews(mode === 'live', currentUserId);

  // Logo und Begrüßung gibt es nur bis zur ersten Interaktion (Reiter antippen oder scrollen).
  // Danach gleiten sie in einer Bewegung weg, die Segmente rücken nach oben neben die Kamera,
  // und die Stories erscheinen darunter. Das ist die Ziel-Ansicht.
  const progress = useRef(new Animated.Value(0)).current;
  const [collapsed, setCollapsed] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [storiesHeight, setStoriesHeight] = useState(0);

  // Weich ohne Nachschwingen (Daria, 2026-11-13: „needs to be smoother“)
  const animateHeader = (toValue: 0 | 1) =>
    Animated.timing(progress, {
      toValue,
      duration: motion.barrier.duration,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();

  /**
   * Suchfeld unter dem Umschalter (Daria, 2026-11-13): Beim Ausblenden geht erst der Kopf, das Suchfeld folgt
   * verzögert. Beim Aufziehen kommt erst das Suchfeld; der Kopf mit „Hallo“ erst, wenn man weiterzieht oder bei
   * offenem Suchfeld noch einmal von oben herunterzieht. Weiche Kurve ohne Nachschwingen.
   */
  const searchAnim = useRef(new Animated.Value(1)).current;
  const [searchHidden, setSearchHidden] = useState(false);
  const searchHiddenRef = useRef(false);
  const animateSearch = (show: boolean, delay = 0) => {
    searchHiddenRef.current = !show;
    setSearchHidden(!show);
    searchAnim.stopAnimation();
    Animated.timing(searchAnim, {
      toValue: show ? 1 : 0,
      duration: SEARCH_FADE_MS,
      delay,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();
  };

  /**
   * Kalender der Routine hinter den Umschaltern (Daria, 2026-11-14): Er kommt hervor, wenn man oben aufzieht oder über
   * den Umschaltern nach unten wischt, und geht beim Weiterscrollen oder Wischen nach oben wieder weg.
   */
  // Kalender als Teil der Seite in Stufen (Daria, 2026-11-28); Wischen über den Umschaltern und Ziehen oben gehen
  // weiter eine Stufe auf bzw. ganz zu
  const routineData = useRoutineData();
  const calendarStep = () => setCalendarLevel(getCalendarLevel() + 1);
  const calendarBack = () => setCalendarLevel(0);
  const showCalendar = (show: boolean) => setCalendarLevel(show ? Math.max(1, getCalendarLevel()) : 0);
  const showCalendarRef = useRef(showCalendar);
  showCalendarRef.current = showCalendar;
  const calendarStepRef = useRef({ step: calendarStep, back: calendarBack });
  calendarStepRef.current = { step: calendarStep, back: calendarBack };
  // Senkrecht über den Umschaltern wischen: nach unten Kalender auf, nach oben zu. Tippen bleibt bei den Umschaltern.
  const switchPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => routineActiveRef.current && Math.abs(g.dy) > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderRelease: (_e, g) => {
        // Nach unten: zu → Woche → Monat; nach oben ganz zu (Daria, 2026-11-14)
        if (g.dy > 24) calendarStepRef.current.step();
        else if (g.dy < -24) calendarStepRef.current.back();
      },
    }),
  ).current;

  const collapse = () => {
    clearTimeout(autoHide.current);
    if (collapsed) return;
    collapsedAt.current = Date.now();
    maxY.current = 0;
    setCollapsed(true);
    animateHeader(1);
    // Kopf zuerst, das Suchfeld folgt, wenn der Kopf fast weg ist
    animateSearch(false, Math.round(motion.barrier.duration * 0.6));
  };

  // Ganz oben angekommen (oder dort nach unten gezogen): Logo und Begrüßung kommen zurück.
  const expand = () => {
    if (searchHiddenRef.current) animateSearch(true);
    if (!collapsed) return;
    setCollapsed(false);
    animateHeader(0);
  };

  // Kopf geht auch ohne Interaktion weg (Daria, 23.10.2026): nach HEADER_HIDE_MS, sobald er sichtbar ist.
  const autoHide = useRef<ReturnType<typeof setTimeout>>(undefined);
  const collapseRef = useRef(collapse);
  collapseRef.current = collapse;
  // Die Uhr läuft erst nach dem Startbildschirm, sonst ist der Kopf schon weg, bevor man ihn sieht
  const introDone = useIntroDone();
  useEffect(() => {
    if (collapsed || !introDone) return;
    // Liegt dann noch ein Finger auf dem Bildschirm, erst danach (Daria, 2026-11-14: sonst springt alles unter dem Finger)
    let cancel = () => {};
    autoHide.current = setTimeout(() => {
      cancel = whenUntouched(() => collapseRef.current());
    }, HEADER_HIDE_MS);
    return () => {
      clearTimeout(autoHide.current);
      cancel();
    };
  }, [collapsed, introDone]);

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
    // Zurück nach oben: erst nur das Suchfeld
    else if (settled && y <= 0 && maxY.current > 120) revealSearch();
    else if (settled && dragging.current && y < -PULL_HEADER) reveal();
    else if (settled && dragging.current && y < -PULL_SEARCH) revealSearch();
    lastY.current = y;
  };

  // Ganz oben ein kleines Stück nach unten ziehen klappt den Kopf wieder auf (Daria, 31.10.2026).
  // Im Browser (auch als Web-App auf dem iPhone) gibt es kein Zurückfedern unter 0, deshalb zählt hier die Fingerbewegung.
  // Nur ein Zug nach unten zählt, kein seitliches Wischen zwischen den Reitern (Daria, 2026-11-12)
  // Erst das Suchfeld; wer weiterzieht (oder bei offenem Suchfeld erneut zieht), holt den Kopf (Daria, 2026-11-13)
  const pullStart = useRef<{ x: number; y: number; search: boolean } | null>(null);
  const onTouchStart = (e: GestureResponderEvent) => {
    pullStart.current = lastY.current <= 0 ? { ...touchPoint(e), search: false } : null;
  };
  const onTouchMove = (e: GestureResponderEvent) => {
    const start = pullStart.current;
    if (start === null) return;
    const now = touchPoint(e);
    const dy = now.y - start.y;
    const dx = now.x - start.x;
    if (!(dy >= PULL_SEARCH && dy > Math.abs(dx) * 1.5)) return;
    // Routine: Ein kurzer Zug klappt den Kalender einen Schritt weiter auf (Woche, dann Monat), ein langer holt
    // zusätzlich den Kopf und zeigt den ganzen Monat (Daria, 2026-11-14)
    if (routineActiveRef.current) {
      if (!start.search) {
        start.search = true;
        calendarStep();
      }
      if (dy < PULL_HEADER) return;
      pullStart.current = null;
      reveal();
      return;
    }
    if (searchHiddenRef.current && !start.search) {
      start.search = true;
      revealSearch();
      return;
    }
    if (start.search && dy < PULL_HEADER) return;
    pullStart.current = null;
    reveal();
  };
  const revealSearch = () => {
    if (searchHiddenRef.current) animateSearch(true);
  };
  // Ganz oben weiter nach oben ziehen: Kopf zurück, in „My Structure“ auch der große Umschalter (2026-11-12)
  const revealRef = useRef(() => {});
  const reveal = () => {
    expand();
    revealRef.current();
  };
  // Im Browser am Rechner gibt es kein Herunterziehen (Daria, 2026-11-28: „Finde den Header hier nicht“, „Komme
  // nicht in die Suche“). Ganz oben weiter nach oben scrollen (Mausrad, Trackpad) zählt deshalb wie der Zug:
  // erst das Suchfeld, ein zweiter Schub holt den Kopf. In „My Structure“ bleibt es beim Ziehen.
  const wheelRef = useRef({ sum: 0, last: 0, blocked: false });
  const revealSearchRef = useRef(() => {});
  revealSearchRef.current = () => {
    if (routineActiveRef.current) return;
    if (searchHiddenRef.current) revealSearch();
    else reveal();
  };
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'web' || typeof window === 'undefined') return;
      const onWheel = (e: WheelEvent) => {
        const w = wheelRef.current;
        const now = Date.now();
        if (e.deltaY >= 0 || lastY.current > 0) {
          w.sum = 0;
          return;
        }
        // Ein Schub endet nach einer kurzen Pause; Nachlauf des Trackpads zählt nicht doppelt
        if (now - w.last > 250) {
          w.sum = 0;
          w.blocked = false;
        }
        w.last = now;
        if (w.blocked) return;
        w.sum -= e.deltaY;
        if (w.sum < PULL_SEARCH) return;
        w.sum = 0;
        w.blocked = true;
        revealSearchRef.current();
      };
      window.addEventListener('wheel', onWheel, { passive: true });
      return () => window.removeEventListener('wheel', onWheel);
    }, []),
  );

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
  const movedPosts = useMovedPosts();
  const posts = useMemo(() => {
    // Bilder und Textposts (Typ „photo“, mit oder ohne Foto) im Kiez- oder Überall-Feed ausblenden,
    // wenn unter Dein Konto › Funktionen abgeschaltet (Daria, 09.11.2026). Eigene bleiben sichtbar.
    const hidden = (c: Challenge) =>
      ((tab === 'nearby' && !postsShown.kiez) || (tab === 'everywhere' && !postsShown.everywhere)) &&
      c.authorId !== currentUserId &&
      c.type === 'photo';
    // Gerade verschoben (Daria, 2026-11-16): bleibt an seiner Stelle, dort steht dann der Hinweis statt des Posts
    const wasHere = (c: Challenge) => {
      const m = movedPosts.get(c.id);
      return !!m && matchesTab({ ...c, private: m.before.private, localOnly: m.before.localOnly }, tab, groupId, currentUserId);
    };
    const list = challenges.filter((c) => (matchesTab(c, tab, groupId, currentUserId) && !hidden(c)) || wasHere(c));
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
  }, [challenges, tab, here, distanceTo, groupId, currentUserId, myKiez, postsShown.kiez, postsShown.everywhere, movedPosts]);

  const topChallenges = useMemo(
    () => pickTopChallenges({ mode, challenges, currentUserId }),
    [mode, challenges, currentUserId],
  );

  const hasTasks = useMemo(
    () => journeyEntries(challenges, currentUserId).some((e) => e.needsAction),
    [challenges, currentUserId],
  );

  const openChallenge = useCallback((id: string) => router.push(`/challenge/${id}`), [router]);
  // Zahnrad am eigenen Post: „Meine Posts“ mit dieser Karte im Fokus (Daria, 2026-11-16)
  const openManage = useCallback((id: string) => router.push({ pathname: '/manage', params: { fokus: id } }), [router]);

  // Schaufenster-Suche (Daria, 2026-11-13): Im Kiez- und Überall-Feed steht unter dem Umschalter ein Suchfeld, solange
  // der Kopf aufgeklappt ist. Mit einer Suche gehen Kopf und Umschalter weg, das Feld bleibt, darunter die Treffer
  // statt der Posts. Ein Treffer öffnet das Schaufenster; „Zurück“ führt wieder zu den Treffern, das Feed-Icon unten
  // oder das Kreuz im Feld zurück in den Feed. Nur öffentliche, online geschaltete Schaufenster (Migration
  // 20261113000500). Kiez: im Umkreis von 5 km oder im selben Kiez wie die Posts. Überall: alle, nach Name.
  // Später (TODO.md in Documentation): Überall nach Entfernung sortieren, in anderen Gegenden suchen.
  const searchOn = useFeature('schaufenster_suche') && mode === 'live';
  const searchTab = tab === 'nearby' || tab === 'everywhere';
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHeight, setSearchHeight] = useState(0);
  const [hits, setHits] = useState<ShowcaseHit[] | null | undefined>(undefined);
  const searching = searchOn && searchTab && query.trim().length >= SEARCH_MIN;
  useEffect(() => {
    if (!searching) return setHits(undefined);
    let active = true;
    setHits(undefined);
    const timer = setTimeout(() => {
      searchShowcases(query).then(
        (found) => active && setHits(found),
        () => active && setHits(null),
      );
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searching, query]);
  const clearSearch = useCallback(() => {
    setQuery('');
    Keyboard.dismiss();
  }, []);

  // Treffer im Kiez: wie die Posts im Umkreis von 5 km, ohne Ort im selben Kiez wie im Profil
  const shownHits = useMemo(() => {
    if (!hits || tab !== 'nearby') return hits;
    return hits.filter(
      (h) =>
        (here && h.coords && distanceMeters(here, h.coords) <= KIEZ_RADIUS_METERS) ||
        (!!myKiez && !!h.kiez && sameKiez(h.kiez, myKiez)),
    );
  }, [hits, tab, here, myKiez]);

  // Suche geleert: Kopf und Umschalter kommen zurück
  const wasSearching = useRef(false);
  useEffect(() => {
    if (wasSearching.current && !searching) {
      setCollapsed(false);
      animateHeader(0);
      if (searchHiddenRef.current) animateSearch(true);
    }
    wasSearching.current = searching;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching]);
  // Android-Zurück während der Suche leert sie
  useFocusEffect(
    useCallback(() => {
      if (!searching) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        clearSearch();
        return true;
      });
      return () => sub.remove();
    }, [searching, clearSearch]),
  );
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
  // `target`: Reiter, der gerade erst gesetzt wird (z. B. `reiter=kiez` zusammen mit `erstellen=1`)
  const startCompose = (target: FeedTab) => {
    if ((target === 'nearby' || target === 'everywhere') && !requireKiez()) return;
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
  // Kamera in „Me & Myself“: Der Post geht standardmäßig in My Feed, alles bleibt gelb (Daria, 2026-11-13)
  const createChallenge = () => {
    if (meActiveRef.current && tabOrder.includes('private')) {
      setTab('private');
      startCompose('private');
    } else startCompose(tab);
  };
  // Aus der Leiste einer anderen Seite: Reiter „Gruppen“ oder Erstellen öffnen
  const createRef = useRef(startCompose);
  createRef.current = startCompose;
  useEffect(() => {
    if (tabParam === 'gruppen') {
      setTab('groups');
      router.setParams({ reiter: undefined });
    }
  }, [tabParam, router]);
  useEffect(() => {
    if (create !== '1') return;
    router.setParams({ erstellen: undefined });
    leaveRoutineRef.current();
    createRef.current((tabParam && TAB_OF_PARAM[tabParam]) || tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [create, router]);
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
  leaveRoutineRef.current = () => {
    if (!routineShownRef.current && !routineActive) return;
    swipeX.setValue(0);
    setSwitchingTo(null);
    setRoutineActive(false);
    setRoutineShown(false);
  };
  // „Me & Myself“ (Daria, 2026-11-12) ersetzt „Routine“ links im Umschalter. Darin „My Structure“ (Routine) und
  // „My Feed“ (Privat), umzuschalten über einen kleinen eigenen Umschalter. Der große Umschalter verschwindet nur in
  // „My Structure“ und kommt zurück, wenn man ganz oben weiter nach oben zieht oder zu „My Feed“ wechselt.
  const privateOn = tabOrder.includes('private');
  const meOn = !composing && (routineOn || privateOn);
  const meActive = meOn && (routineActive || (switchingTo ?? tab) === 'private');
  meActiveRef.current = meActive;
  const meBoth = meOn && routineOn && privateOn;
  const [meSwitchOpen, setMeSwitchOpen] = useState(false);
  useEffect(() => {
    if (routineActive) setMeSwitchOpen(false);
  }, [routineActive]);
  const routineActiveRef = useRef(routineActive);
  routineActiveRef.current = routineActive;
  // Kalender offen: kein großer Umschalter darüber (Daria, 2026-11-28: „When calendar view is open I don't want the
  // upper switch be visible too, it's just too much“). Ganz oben weiter ziehen holt den Umschalter, der Kalender
  // klappt dafür bis auf den Kater zu.
  const calendarLevel = useCalendarLevel();
  const calendarOpen = routineActive && calendarLevel >= 2;
  revealRef.current = () => {
    if (!routineActiveRef.current) return;
    setMeSwitchOpen(true);
    setCalendarLevel(Math.min(getCalendarLevel(), 1));
  };
  useEffect(() => {
    if (calendarOpen) setMeSwitchOpen(false);
  }, [calendarOpen]);
  // Nur in „My Structure“ (Routine) verschwindet der große Umschalter. In „My Feed“ und allen anderen Feeds
  // (Gruppe, Kiez, Überall) bleibt er sichtbar (Entscheidung 12.11.2026, ersetzt die frühere Regel „nur in My Feed“).
  // Ohne kleinen Umschalter (nur Routine, kein Privat) bleibt er, sonst gäbe es keinen sichtbaren Weg zurück.
  const bigSwitchShown = !routineActive || !meBoth || (meSwitchOpen && !calendarOpen);
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
  // Zu Nachrichten und Konto (Daria, 2026-11-17): Der Feed gleitet hinaus wie beim Reiterwechsel, die neue Seite
  // federt selbst ein (lib/pageSlide). Zurück kommt der Feed von der Seite herein, auf der er liegt.
  const awayRef = useRef(false);
  const leavePage = useRef((dir: SlideDir, go: () => void) => {
    awayRef.current = true;
    slideNext(dir);
    slideOut(dir, go);
  }).current;
  useFocusEffect(
    useCallback(() => {
      const dir = takeSlide();
      if (dir) slideIn(dir);
      else if (awayRef.current) swipeX.setValue(0);
      awayRef.current = false;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
  const toChatRef = useRef(() => leavePage(1, () => router.push('/chat')));
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
    if (routineStandard && !openedWithTarget && !groupParam && !tabParam && !create && !isNew) openRoutine();
  }, [modes.ready, routineStandard, openedWithTarget, groupParam, tabParam, create, isNew, openRoutine]);
  // Android: Zurück aus der Routine führt zum ersten Reiter, wie sonst zurück in den Feed.
  // Nur solange der Feed vorn ist: Sonst schluckte der Feed das Zurück einer darüber geöffneten Seite.
  useFocusEffect(
    useCallback(() => {
      if (!routineShown) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        slideToTab(tabOrderRef.current[0], 1);
        return true;
      });
      return () => sub.remove();
    }, [routineShown, slideToTab]),
  );
  // `reiter=routine`: Die Seite `routine` leitet hierher, die Routine steht dann gleich da, ohne Bewegung
  useEffect(() => {
    if (tabParam !== 'routine') return;
    router.setParams({ reiter: undefined });
    if (!routineOn) return;
    swipeX.setValue(0);
    // Oben in der Routine: Ziehen nach unten holt den großen Umschalter, auch wenn der Feed weit unten stand
    lastY.current = 0;
    setRoutineActive(true);
    setRoutineShown(true);
  }, [tabParam, router, routineOn, swipeX]);
  const routineLeftRef = useRef(false);
  routineLeftRef.current = routineOn && !composing && true;

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
          // Rechts vom letzten Reiter liegen die Nachrichten (Daria, 2026-11-17)
          const hasNext = routineShownRef.current ? g.dx < 0 : g.dx < 0 ? true : index > 0 || routineLeftRef.current;
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
          // Ganz rechts nach links gewischt: Nachrichten
          if (next === order.length) {
            toChatRef.current();
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

  // Desktop (Daria, 2026-11-28): ab 1200 px ist der Feed breiter als die Lesebreite, die Posts stehen als Wand
  const { desktop, wideNav } = useDesktop();
  useDesktopContentWidth(wideNav ? FEED_WALL_WIDTH : undefined);
  const [listWidth, setListWidth] = useState(0);
  const wall = wideNav && listWidth >= FEED_WALL_FROM;

  // Verschobener Post: Hinweis statt Post, solange er in diesen Reiter nicht mehr gehört
  const postItem = (challenge: Challenge): FeedItem =>
    movedPosts.has(challenge.id) && !matchesTab(challenge, tab, groupId, currentUserId) ? { kind: 'moved', challenge } : { kind: 'post', challenge };
  const items: FeedItem[] = [];
  if (showAudience) items.push({ kind: 'audience' });
  if (planned) items.push({ kind: 'planned' });
  if (!loading && !composing) running.forEach((challenge) => items.push({ kind: 'running', challenge }));
  if (tab === 'groups' && !loading) {
    if (groups.length === 0) items.push({ kind: 'groupsEmpty' });
    else {
      items.push({ kind: 'groupBar' });
      if (posts.length === 0) items.push({ kind: 'groupNoTasks' });
      else posts.forEach((challenge) => items.push(postItem(challenge)));
    }
  } else if (tab === 'private' && !loading && posts.length === 0) items.push({ kind: 'privateEmpty' });
  else if (loading) items.push({ kind: 'loading' });
  else if (showState && !(planned && showState === 'empty')) items.push({ kind: 'state' });
  else posts.forEach((challenge) => items.push(postItem(challenge)));
  if (searching && !composing) {
    items.length = 0;
    if (shownHits === undefined) items.push({ kind: 'loading' });
    else if (shownHits === null) items.push({ kind: 'searchError' });
    else if (shownHits.length === 0) items.push({ kind: 'searchEmpty' });
    // Alle Treffer in einer Karte mit Zeilen (Daria, 2026-11-28: Entwurf A, vorher „bisschen erbärmlich“)
    else items.push({ kind: 'showcases', hits: shownHits });
  }

  // Leerer Zustand steht unter der Liste und füllt den Rest bis zur Leiste, mittig. So verteilt sich der Platz
  // oben und unten gleich (Daria, 2026-11-09).
  const emptyItem = items.find((i) => EMPTY_KINDS.has(i.kind));
  const flatItems = emptyItem ? items.filter((i) => i !== emptyItem) : items;
  // Desktop: Ist die Spalte breit genug, stehen die Posts als Wand in zwei Spalten, je zwei in einer Zeile
  // (Daria, 2026-11-28). Alles andere, z. B. Hinweise und der Gruppen-Kopf, bleibt in voller Breite.
  const listItems: FeedItem[] = [];
  for (const item of flatItems) {
    const last = listItems[listItems.length - 1];
    if (!wall || (item.kind !== 'post' && item.kind !== 'moved')) listItems.push(item);
    else if (last?.kind === 'pair' && last.items.length < 2) last.items.push(item);
    else listItems.push({ kind: 'pair', items: [item] });
  }
  // Gruppen-Kopf, „Aufgabe wartet“ (Daria, 2026-11-16): zu dieser Karte scrollen
  const showPost = (id: string) => {
    const index = listItems.findIndex(
      (i) => (i.kind === 'post' && i.challenge.id === id) || (i.kind === 'pair' && i.items.some((x) => x.challenge.id === id)),
    );
    if (index >= 0) listRef.current?.scrollToIndex({ index, viewPosition: 0.15, animated: true });
  };

  const renderItem = ({ item }: { item: FeedItem }): React.ReactElement | null => {
    switch (item.kind) {
      case 'pair':
        return (
          <GalleryWall value>
          <View style={styles.pair}>
            {item.items.map((i) => (
              <View key={i.challenge.id} style={styles.pairCell}>
                {renderItem({ item: i })}
              </View>
            ))}
            {item.items.length < 2 ? <View style={styles.pairCell} /> : null}
          </View>
          </GalleryWall>
        );
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
            summary={{
              users,
              challenges,
              currentUserId,
              onMembers: () => groupId && router.push(`/groups/${groupId}`),
              onWaiting: showPost,
              onShowcase: (id) => router.push({ pathname: '/schaufenster/[id]', params: { id } }),
            }}
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
      case 'showcases':
        return <ShowcaseHitList hits={item.hits} onOpen={(id) => router.push({ pathname: '/schaufenster/[id]', params: { id } })} />;
      case 'searchEmpty':
      case 'searchError':
        return (
          <Text style={styles.searchNote}>
            {item.kind === 'searchError'
              ? t('Die Suche hat gerade nicht geklappt. Versuch es gleich noch einmal.')
              : tab === 'nearby'
                ? t('Kein öffentliches Schaufenster in Deinem Kiez passt dazu. Im Überall-Feed suchst Du überall.')
                : t('Kein öffentliches Schaufenster passt dazu.')}
          </Text>
        );
      case 'moved': {
        const moved = movedPosts.get(item.challenge.id);
        if (!moved) return null;
        const target = moved.to;
        return (
          <View style={styles.movedNotice}>
            <Notice
              feed
              message={t('Dein Post wurde verschoben.')}
              action={{
                label: MOVE_LINK[target],
                onPress: () => {
                  forgetMove(item.challenge.id);
                  selectTab(target);
                },
              }}
              onClose={() => forgetMove(item.challenge.id)}
            />
          </View>
        );
      }
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
            onManage={item.challenge.authorId === currentUserId ? () => openManage(item.challenge.id) : undefined}
          />
        );
      }
    }
  };

  // Desktop (Daria, 2026-11-28): rechte Spalte mit der Zusammenfassung zum gewählten Feed, ab 1200 px
  const asideOn = wideNav && !composing && !routineActive && !searching;
  const summaryScope = useMemo<FeedScope | null>(
    () =>
      tab === 'nearby'
        ? { kind: 'kiez', kiez: myKiez }
        : tab === 'everywhere'
          ? { kind: 'everywhere' }
          : tab === 'groups' && groupId
            ? { kind: 'group', groupId }
            : null,
    [tab, myKiez, groupId],
  );
  const summaryEvents = useFeedEvents(summaryScope, asideOn);
  const ownToday = useOwnToday(asideOn);
  const summaryOpen = useMemo(
    () =>
      posts
        .filter((c) => c.status === 'open' && (c.type === 'individual' || c.type === 'wave'))
        .sort((a, b) => (a.deadline || '9').localeCompare(b.deadline || '9')),
    [posts],
  );
  const summaryTitle =
    tab === 'nearby'
      ? kiezName
        ? t('Im Kiez {kiez}', { kiez: kiezName })
        : t('In Deinem Kiez')
      : tab === 'groups'
        ? (groups.find((g) => g.id === groupId)?.name ?? t('Gruppen'))
        : tab === 'private'
          ? t('Me & Myself')
          : t('Überall');

  // Kopf: Höhe und Deckkraft gehen auf 0. Segmente: rechts Platz für die Kamera, sobald der Kopf weg ist.
  // Desktop: kein Kopf, der wegfahren könnte. Die Luft über den Schaltern bleibt stehen, sonst springt das Raster.
  const headerStyle = headerHeight && !desktop
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
  const tabsPaddingRight = space[16];
  const composeHeaderStyle = {
    height: composeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, COMPOSE_HEADER] }),
    opacity: composeAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] }),
    transform: [{ translateY: composeAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
  };
  const composeTarget = tab === 'groups' ? groupId : tab === 'private' ? 'private' : 'public';
  // Ein Bereich für alle Farben (theme/signal.tsx, Daria, 2026-11-13). Beim Erstellen zählt das Ziel des Posts.
  const area: Space = composing
    ? composeTarget === 'private'
      ? 'me'
      : composeTarget === 'public'
        ? 'public'
        : 'group'
    : meActive
      ? 'me'
      : tab === 'groups'
        ? 'group'
        : 'public';
  // Der Feed bestimmt den Bereich selbst (Reiter, Ziel beim Erstellen). Seite und Dialoge darüber folgen ihm (RouteSpace).
  useSpaceOverride(area);
  // Kurz und gleich für jede Gruppe (Daria, 24.10.2026)
  // Post für ein Schaufenster: Der Kopf nennt es (Daria, 2026-11-10)
  const showcasePost = composing ? peekShowcasePost() : null;
  // Überschrift folgt der gewählten Art (Daria, 2026-11-14)
  const composeLine = showcasePost ? t('Post für {name}', { name: showcasePost.name }) : t(COMPOSE_TITLE[composeKind]);
  const storiesStyle = {
    height: showStories && !composing
      ? progress.interpolate({ inputRange: [0, 1], outputRange: [0, storiesHeight], extrapolateLeft: 'clamp' })
      : 0,
    opacity: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' }),
  };

  return (
    <View
      style={[styles.screen, { paddingTop: insets.top }]}
      // In der App gibt es keine Zuhörer am Dokument; Berührungen melden für `whenUntouched` (lib/touching.ts)
      onTouchStart={Platform.OS === 'web' ? undefined : touchStarted}
      onTouchEnd={Platform.OS === 'web' ? undefined : touchEnded}
      onTouchCancel={Platform.OS === 'web' ? undefined : touchEnded}
    >
      {searching ? null : (
      <Animated.View style={[styles.clip, headerStyle]}>
        {/* Höhe folgt dem Inhalt, z. B. wenn nach dem Laden die Zeile mit den Zahlen dazukommt */}
        <View onLayout={(e) => { const next = e.nativeEvent.layout.height; setHeaderHeight((h) => (h === next ? h : next)); }}>
          <AppHeader
            onLogoPress={() => router.push('/me')}
            onLogoLongPress={mode !== 'live' || moderator ? () => router.push('/demo') : undefined}
            hasTasks={hasTasks}
          />
          {/* In „Me & Myself“ weder Kiez noch Zahlen der Posts (Daria, 2026-11-14) */}
          {/* Ab 1200 px sagt der Kater den Gruß in der rechten Spalte (Daria, 2026-11-28) */}
          {wideNav ? null : (
            <FeedGreeting
              name={salutation(profile)}
              kiez={area === 'me' ? undefined : kiezName}
              counts={feedState === 'loading' || area === 'me' ? undefined : openCounts}
            />
          )}
        </View>
      </Animated.View>
      )}
      <Animated.View style={[styles.clip, composeHeaderStyle]}>
        <View style={styles.composeHeader}>
          <IconButton icon="close" accessibilityLabel={t('Schließen')} onPress={() => closeCompose()} />
          <Text style={styles.composeLine} numberOfLines={1} accessibilityRole="header">
            {composeLine}
          </Text>
        </View>
      </Animated.View>
      {/* Im Browser zieht ein Wischen hier sonst die ganze Seite mit und federt zurück (Daria, 2026-11-14) */}
      <View style={[styles.noBrowserPan, styles.headerLayer]} {...switchPan.panHandlers}>
      {bigSwitchShown && !searching ? (
      <Animated.View style={[styles.tabsRow, { paddingRight: tabsPaddingRight }]}>
        {/* Desktop: Umschalter nur so breit, wie die Schrift es braucht (Daria, 2026-11-28: „viel zu breite Switch bei kleiner Schrift“) */}
        <View style={[styles.flex, desktop && styles.desktopSwitch]}>
        <TabsNavigation
          selectedKey={switchingTo ?? tab}
          onChange={(key) => {
            if (composing) setPlaceTouched(true);
            switchTab(key);
          }}
          // „Privat“ steckt in „Me & Myself“ (Daria, 2026-11-12); beim Erstellen bleibt es als Ziel wählbar
          visible={meOn ? modes.visible.filter((m) => m !== 'private') : modes.visible}
          // Im Feed gewählt papierweiß, beim Tippen kurz lila (Daria, 2026-11-13); „Me & Myself“ / „Private“ gelb.
          // Beim Erstellen immer in der Akzentfarbe, ohne Wechsel nach dem Berühren (Daria, 2026-11-15)
          accent={composing}
          // „Me & Myself“ links neben den Reitern, wie vorher „Routine“ (Daria, 2026-11-12). Öffnet „My Feed“
          // (Daria, 2026-11-13), ohne privaten Feed die Routine („My Structure“).
          lead={
            meOn
              ? { label: t('Me & Myself'), active: meActive, private: true, onPress: () => !meActive && (privateOn ? switchTab('private') : openRoutine()) }
              : routineOn && !composing && true
                ? { label: t('Routine'), active: routineActive, onPress: () => !routineActive && openRoutine() }
                : undefined
          }
        />
        </View>
      </Animated.View>
      ) : null}
      {searchOn && searchTab && !composing && !routineActive ? (
        <Animated.View
          style={[
            styles.clip,
            searching || searchFocused || !!query || !searchHeight
              ? null
              : {
                  height: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, searchHeight] }),
                  opacity: searchAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.2, 1] }),
                },
          ]}
          pointerEvents={searchHidden && !searching && !searchFocused && !query ? 'none' : 'auto'}
        >
          <View onLayout={(e) => { const next = e.nativeEvent.layout.height; setSearchHeight((h) => (h === next ? h : next)); }}>
            <ShowcaseSearchField value={query} onChangeText={setQuery} onClear={clearSearch} onFocusChange={setSearchFocused} />
          </View>
        </Animated.View>
      ) : null}
      {meActive && meBoth ? (
        // Kein zusätzlicher Abstand zwischen den beiden Umschaltern (Daria, 2026-11-14)
        <View style={[styles.tabsRow, { paddingRight: tabsPaddingRight }, bigSwitchShown && !searching && styles.tabsRowJoined]}>
          <View style={[styles.flex, desktop && styles.desktopSwitch]}>
            <PrivateSignalProvider value>
            <Segments
              // Gewählt immer gelb, auch „My Structure“ (Daria, 2026-11-12)
              accent
              tabs={ME_TABS}
              selectedKey={routineActive ? 'structure' : 'private'}
              onChange={(key) => {
                if (key === 'structure') !routineActive && openRoutine();
                else if (routineActive) switchTab('private');
              }}
            />
            </PrivateSignalProvider>
          </View>
        </View>
      ) : null}
      {/* Kalender als Teil der Seite, darunter die Pille zum Schieben (Daria, 2026-11-28) */}
      {routineActive && !composing && routineData ? (
        wideNav ? (
          // Desktop ab 1200 px: Der Monat steht fest in der rechten Spalte (Daria, 2026-11-28, Entwurf B)
          <DesktopAside>
            <RoutineCalendarDesktop list={routineData.list} events={routineData.events} saved={routineData.saved} />
          </DesktopAside>
        ) : (
          <View style={styles.calendarSlot}>
            <RoutineCalendarStages list={routineData.list} events={routineData.events} saved={routineData.saved} />
          </View>
        )
      ) : null}
      </View>
      <Animated.View style={[styles.clip, storiesStyle]}>
        <View onLayout={(e) => setStoriesHeight(e.nativeEvent.layout.height)}>
          <TopChallengeBar items={topChallenges} onItemPress={openChallenge} />
        </View>
      </Animated.View>
      {/* In „Me & Myself“ ist Gelb die Signalfarbe (Daria, 2026-11-12) */}
      <>
      <View style={styles.flex} onLayout={(e) => { const w = Math.round(e.nativeEvent.layout.width); setListWidth((x) => (x === w ? x : w)); }}>
        <Animated.View style={[styles.flex, { transform: [{ translateX: swipeX }] }]} {...swipe.panHandlers}>
        {routineShown ? (
          <View
            // Desktop: Die Karten bleiben in Lesebreite, auch wenn der Feed daneben breiter ist
            style={[styles.flex, wideNav && styles.routineDesktop]}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={() => (pullStart.current = null)}
          >
            <RoutineContent
              topPad={space[8]}
              bottomPad={insets.bottom + TAB_BAR_SPACE}
              floatBottom={tabBarBottom(insets.bottom) + TAB_BAR_HEIGHT + space[8]}
              calendarInList={false}
              onNewButtonShown={setRoutineNewShown}
              onScroll={(e) => {
                const y = e.nativeEvent.contentOffset.y;
                lastY.current = y;
              }}
            />
          </View>
        ) : (
        <FlatList
          ref={listRef}
          data={listItems}
          // „Aufgabe wartet“ springt zu einer Karte, die vielleicht noch nicht gemessen ist: erst ungefähr, dann genau
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
            setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, viewPosition: 0.15, animated: true }), 300);
          }}
          keyExtractor={(item) =>
            item.kind === 'post'
              ? item.challenge.id
              : item.kind === 'running'
                ? `running-${item.challenge.id}`
                : item.kind === 'pair'
                  ? `pair-${item.items.map((i) => i.challenge.id).join('-')}`
                : item.kind
          }
          renderItem={renderItem}
          // Am Desktop stünde der Rollbalken mitten im Fenster zwischen Posts und rechter Spalte
          showsVerticalScrollIndicator={!wideNav}
          viewabilityConfig={feedViews.viewabilityConfig}
          onViewableItemsChanged={feedViews.onViewableItemsChanged}
          onScroll={onScroll}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={() => (pullStart.current = null)}
          onScrollBeginDrag={() => (dragging.current = true)}
          onScrollEndDrag={() => (dragging.current = false)}
          scrollEventThrottle={16}
          // Wand: Abstand als Trenner statt als `gap`, sonst schiebt der leere Listenkopf die erste Reihe aus dem Raster
          ItemSeparatorComponent={wall ? WallGap : undefined}
          contentContainerStyle={[wall ? null : styles.list, styles.listTop, wall && styles.listTopWall, emptyItem && styles.listGrow, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
          // Kater erinnert an fällige Erinnerungen, vorerst nur mit Routine (Daria, 2026-11-10)
          ListHeaderComponent={routineOn ? <RoutineNudge enabled onOpen={routineOn && !composing && true ? openRoutine : undefined} /> : null}
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
              groups={groups}
              onSelectGroup={setGroupChoice}
              onKindChange={setComposeKind}
            />
          </Animated.View>
        ) : null}
      </View>
      </>
      {composing ? null : <PageSlideProvider value={leavePage}><TabBar
        active="feed"
        onFeedPress={() => {
          clearSearch();
          switchTab(standardTab);
        }}
        onMenuPress={() => router.push('/account')}
        onCreatePress={createChallenge}
        onGroupsPress={groupsOn ? () => switchTab('groups') : undefined}
        groupsActive={tab === 'groups'}
        routineActive={routineActive}
        onRoutinePress={openRoutine}
        hidePlus={routineNewShown}
      /></PageSlideProvider>}
      <SurveyOverlay visible={surveyVisible} onClose={closeSurvey} />
      {asideOn ? (
        <DesktopAside>
          <FeedAside
            greeting={greetingParts(salutation(profile), area === 'me' ? undefined : kiezName, feedState === 'loading' || area === 'me' ? undefined : openCounts)}
            onKater={() => router.push('/me')}
            title={summaryTitle}
            events={summaryScope ? summaryEvents : undefined}
            open={summaryOpen}
            own={ownToday}
            onEvent={(e) => (mode === 'live' ? router.push(`/schaufenster/${e.showcaseId}`) : undefined)}
            onChallenge={openChallenge}
            onOwn={openRoutine}
          />
        </DesktopAside>
      ) : null}
    </View>
  );
}
