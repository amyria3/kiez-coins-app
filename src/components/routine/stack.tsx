import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Animated, PanResponder, Platform, Pressable, View, type LayoutChangeEvent, type PanResponderGestureState } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { setFocusCard, useFocusCard } from '../../data/routineView';
import { t } from '../../data/texts';
import { markCardSwipe } from '../../lib/cardSwipe';
import { color } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { Text } from '../T';
import { HandButton } from './cards';
import { DragLock, Motion, PageLock, ScrollToView, StackHead, shiftOf, tiltOf, useReduceMotion } from './shared';
import { stackStyles as styles } from './styles';

/**
 * Tagesstapel (Daria, 2026-11-28): „Die Karten legen wir übereinander und imitieren Swipe-Verhalten links rechts zur
 * Navigation. Ein Tag = ein Stapel.“ Zugeklappt schauen die hinteren Karten unten hervor, leicht versetzt und geneigt.
 * Vordere Karte nach links wischen: Sie fliegt hinaus und schiebt sich unter den Stapel („so kann ich fix alle Termine
 * checken“), nach rechts holt die unterste zurück. Nach unten ziehen fächert den Stapel in einem gerafften Bogen auf,
 * jede Karte zeigt Zeit und Titel, Tippen holt sie nach vorn. Alles läuft über Federn („Physik … organisch“).
 * Kurz halten und ziehen bleibt wie bisher: rechts erledigt, links abbrechen, oben später.
 */

/** So weit schauen die hinteren Karten zugeklappt unten hervor, höchstens drei */
const PEEK = 9;
const PEEK_MAX = 3;
/** Aufgefächert: Abstand unter Zeit und Titel bis zur nächsten Karte */
const ROW_PAD = 14 + 8;
/** Wie weit der Bogen zur Seite ausschlägt */
const ARC = 12;
/** Ab hier löst seitliches Wischen aus (oder schnell genug) */
const SWIPE_AT = 70;
const SWIPE_SPEED = 0.5;
/** Wie weit man nach unten zieht, bis der Stapel ganz offen ist */
const FAN_PULL = 220;
/** Federn: leicht nachschwingend, nicht wabbelig */
const SPRING = { stiffness: 240, damping: 22, mass: 1 };
/** Die Karte ist hinausgeflogen, jetzt wechselt sie die Lage */
const SWAP_MS = 170;

type Vals = { x: Animated.Value; y: Animated.Value; r: Animated.Value; s: Animated.Value; o: Animated.Value };
type Target = { x: number; y: number; r: number; s: number; o: number };

const keyOf = (c: ReactElement) => String(c.key);

export function DayStack({ cards, enter = 0 }: { cards: ReactElement[]; enter?: -1 | 0 | 1 }) {
  const motion = useContext(Motion);
  const reduce = useReduceMotion();
  const page = useContext(PageLock);
  const moving = motion && !reduce;
  const movingRef = useRef(moving);
  movingRef.current = moving;

  const incoming = cards.map(keyOf);
  const sequence = incoming.join('|');
  // Reihenfolge des Stapels, order[0] liegt vorn. Ändert sich der Tag (Karte erledigt, neue Karte), fängt er neu an.
  const [order, setOrder] = useState(incoming);
  const orderRef = useRef(order);
  useEffect(() => {
    orderRef.current = incoming;
    setOrder(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence]);
  const [open, setOpenState] = useState(false);
  const openRef = useRef(0);

  const width = useRef(360);
  const heights = useRef(new Map<string, number>());
  const heads = useRef(new Map<string, number>());
  const vals = useRef(new Map<string, Vals>());
  const valsOf = (key: string): Vals => {
    let v = vals.current.get(key);
    if (!v) {
      const from = movingRef.current ? enter : 0;
      v = {
        x: new Animated.Value(from * (width.current + 40)),
        y: new Animated.Value(0),
        r: new Animated.Value(from * 8),
        s: new Animated.Value(1),
        o: new Animated.Value(1),
      };
      vals.current.set(key, v);
    }
    return v;
  };
  const stackH = useRef(new Animated.Value(0)).current;

  /** Ziel jeder Karte bei Auffächer-Grad `t` (0 zu, 1 offen) */
  const targets = useCallback((fan: number) => {
    const keys = orderRef.current;
    const n = keys.length;
    const h = (k: string) => heights.current.get(k) ?? 0;
    const frontH = n ? h(keys[0]) : 0;
    const row = (k: string) => (heads.current.get(k) ?? 48) + ROW_PAD;
    const out = new Map<string, Target>();
    // Aufgefächert: hintere Karten oben in ihrer Reihenfolge, die vordere unten ganz sichtbar
    const rows = [...keys.slice(1), keys[0]];
    let top = 0;
    const fanY = new Map<string, number>();
    rows.forEach((k) => {
      fanY.set(k, top);
      top += row(k);
    });
    const fannedH = n ? (fanY.get(keys[0]) ?? 0) + frontH : 0;
    let closedH = frontH;
    keys.forEach((k, pos) => {
      const depth = Math.min(pos, PEEK_MAX);
      // Zu: hintere Karten unten bündig, je etwas tiefer, kleiner, versetzt und geneigt. Höhere Karten ragen unten weiter heraus.
      const cy = pos === 0 ? 0 : Math.max(depth * PEEK, frontH - h(k) + depth * PEEK);
      if (pos <= PEEK_MAX) closedH = Math.max(closedH, cy + h(k) * (1 - depth * 0.035));
      const closed = { x: pos === 0 ? 0 : shiftOf(k), y: cy, r: pos === 0 ? 0 : tiltOf(k) * 0.6, s: 1 - depth * 0.035, o: pos > PEEK_MAX ? 0 : 1 };
      // Offen: gerafter Bogen, in der Mitte am weitesten zur Seite, oben leicht nach links, unten nach rechts geneigt
      const k2 = rows.indexOf(k);
      const u = n > 1 ? k2 / (n - 1) : 1;
      const bow = Math.sin(u * Math.PI);
      const fanned = { x: bow * ARC + shiftOf(k) * 0.6, y: fanY.get(k) ?? 0, r: (u - 0.5) * 4 - bow + tiltOf(k) * 0.3, s: 1 - (1 - u) * 0.03, o: 1 };
      const mix = (a: number, b: number) => a + (b - a) * fan;
      out.set(k, { x: mix(closed.x, fanned.x), y: mix(closed.y, fanned.y), r: mix(closed.r, fanned.r), s: mix(closed.s, fanned.s), o: mix(closed.o, fanned.o) });
    });
    return { out, height: closedH + (fannedH - closedH) * fan + PEEK };
  }, []);

  /** Alle Karten an ihr Ziel: mit Feder (`animate`) oder sofort, beim Ziehen mit dem Finger */
  const place = useCallback(
    (fan: number, animate: boolean, skip?: string) => {
      const { out, height } = targets(fan);
      const keys = orderRef.current;
      const spring = (v: Animated.Value, to: number, delay: number) =>
        Animated.sequence([Animated.delay(delay), Animated.spring(v, { toValue: to, ...SPRING, useNativeDriver: false })]);
      const anims: Animated.CompositeAnimation[] = [];
      keys.forEach((k, pos) => {
        if (k === skip) return;
        const v = valsOf(k);
        const to = out.get(k);
        if (!to) return;
        if (!animate || !movingRef.current) {
          v.x.setValue(to.x);
          v.y.setValue(to.y);
          v.r.setValue(to.r);
          v.s.setValue(to.s);
          v.o.setValue(to.o);
          return;
        }
        // Gestaffelt, damit sich der Stapel wie Papier bewegt und nicht wie ein Block
        const delay = (fan > 0.5 ? pos : keys.length - pos) * 22;
        anims.push(spring(v.x, to.x, delay), spring(v.y, to.y, delay), spring(v.r, to.r, delay), spring(v.s, to.s, delay));
        v.o.setValue(to.o);
      });
      if (animate && movingRef.current) anims.push(Animated.spring(stackH, { toValue: height, ...SPRING, useNativeDriver: false }));
      else stackH.setValue(height);
      Animated.parallel(anims).start();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targets, stackH],
  );

  // Aufgefächert darf der Stapel den ganzen Bildschirm füllen. Danach scrollt die Seite sanft nach unten, bis
  // „Zusammenschieben“ zu sehen ist (Daria, 2026-11-28: „behutsam ganz nach unten gescrollt werden“).
  const scrollTo = useContext(ScrollToView);
  const foot = useRef<View>(null);
  const footTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealFoot = useCallback(() => {
    if (footTimer.current) clearTimeout(footTimer.current);
    // Warten, bis die Karten fast liegen und die Seite lang genug ist
    footTimer.current = setTimeout(() => foot.current && scrollTo?.(foot.current, 'bottom'), movingRef.current ? 380 : 30);
  }, [scrollTo]);
  useEffect(() => () => {
    if (footTimer.current) clearTimeout(footTimer.current);
  }, []);

  const setOpen = useCallback(
    (on: boolean) => {
      openRef.current = on ? 1 : 0;
      setOpenState(on);
      place(openRef.current, true);
      if (on) revealFoot();
    },
    [place, revealFoot],
  );

  // Neue Reihenfolge oder neue Maße: alles an seinen Platz
  useEffect(() => {
    place(openRef.current, true);
  }, [order, place]);
  const relayout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measured = () => {
    if (relayout.current) clearTimeout(relayout.current);
    relayout.current = setTimeout(() => place(openRef.current, true), 16);
  };
  useEffect(() => () => {
    if (relayout.current) clearTimeout(relayout.current);
  }, []);

  const reorder = (next: string[]) => {
    orderRef.current = next;
    setOrder(next);
  };
  /** `keepOpen`: aufgefächert bleibt der Stapel offen (Daria, 2026-11-28: „Karte nach oben holen, aber nicht komplett einklappen“) */
  const bringToFront = (key: string, keepOpen = false) => {
    reorder([key, ...orderRef.current.filter((k) => k !== key)]);
    if (keepOpen) {
      revealFoot();
      return;
    }
    openRef.current = 0;
    setOpenState(false);
  };
  /** Nach links: vordere Karte fliegt hinaus und legt sich unter den Stapel */
  const sendBack = (vx = 0) => {
    const keys = orderRef.current;
    if (keys.length < 2) return place(openRef.current, true);
    const [front, ...rest] = keys;
    const v = valsOf(front);
    if (!movingRef.current) return reorder([...rest, front]);
    Animated.parallel([
      Animated.spring(v.x, { toValue: -(width.current + 40), velocity: vx, ...SPRING, useNativeDriver: false }),
      Animated.spring(v.r, { toValue: -12, ...SPRING, useNativeDriver: false }),
    ]).start();
    setTimeout(() => reorder([...rest, front]), SWAP_MS);
  };
  /** Nach rechts: die unterste Karte kommt rechts heraus und legt sich oben drauf */
  const pullFront = (vx = 0) => {
    const keys = orderRef.current;
    if (keys.length < 2) return place(openRef.current, true);
    const last = keys[keys.length - 1];
    if (!movingRef.current) return reorder([last, ...keys.slice(0, -1)]);
    const front = valsOf(keys[0]);
    Animated.spring(front.x, { toValue: 0, velocity: vx, ...SPRING, useNativeDriver: false }).start();
    const v = valsOf(last);
    v.o.setValue(1);
    Animated.parallel([
      Animated.spring(v.x, { toValue: width.current + 40, ...SPRING, useNativeDriver: false }),
      Animated.spring(v.r, { toValue: 12, ...SPRING, useNativeDriver: false }),
    ]).start();
    setTimeout(() => reorder([last, ...keys.slice(0, -1)]), SWAP_MS);
  };

  // Angehobene Karte (Halten und Ziehen): Der Stapel lässt sie in Ruhe
  const lifted = useRef(false);
  const lock = useCallback(
    (on: boolean) => {
      lifted.current = on;
      page(on);
    },
    [page],
  );

  const mode = useRef<'side' | 'down' | null>(null);
  const actions = useRef({ sendBack, pullFront, setOpen, place });
  actions.current = { sendBack, pullFront, setOpen, place };
  const decide = (g: PanResponderGestureState) => {
    if (lifted.current || openRef.current > 0.5 || orderRef.current.length < 2) return false;
    if (Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy)) mode.current = 'side';
    else if (g.dy > 10 && g.dy >= Math.abs(g.dx)) mode.current = 'down';
    else return false;
    return true;
  };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_e, g) => decide(g),
        onMoveShouldSetPanResponder: (_e, g) => decide(g),
        onPanResponderGrant: () => page(true),
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_e, g) => {
          if (mode.current === 'side') {
            // Die Karte hängt am Finger und dreht sich mit, wie an einer Ecke gehalten
            const v = valsOf(orderRef.current[0]);
            v.x.setValue(g.dx);
            v.y.setValue(Math.abs(g.dx) * 0.05 + g.dy * 0.15);
            v.r.setValue(g.dx * 0.05);
          } else if (mode.current === 'down') {
            // Auffächern folgt dem Finger, mit Widerstand am Ende
            let fan = g.dy / FAN_PULL;
            if (fan > 1) fan = 1 + (fan - 1) * 0.25;
            openRef.current = Math.max(0, fan);
            actions.current.place(openRef.current, false);
          }
        },
        onPanResponderRelease: (_e, g) => {
          page(false);
          const a = actions.current;
          if (mode.current === 'side') {
            if (g.dx <= -SWIPE_AT || g.vx <= -SWIPE_SPEED) a.sendBack(g.vx);
            else if (g.dx >= SWIPE_AT || g.vx >= SWIPE_SPEED) a.pullFront(g.vx);
            else a.place(openRef.current, true);
          } else if (mode.current === 'down') a.setOpen(openRef.current > 0.35 || g.vy > SWIPE_SPEED);
          mode.current = null;
        },
        onPanResponderTerminate: () => {
          page(false);
          mode.current = null;
          actions.current.place(openRef.current, true);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page],
  );

  // Im Browser entscheidet die erste Fingerbewegung, ob die Seite scrollt. Seitlich und nach unten gehört sie dem
  // Stapel, nach oben scrollt die Seite. Aufgefächert scrollt die Seite in beide Richtungen.
  const node = useRef<View>(null);

  // Tippen auf einen Termin in der kurzen Liste (Daria, 2026-11-28): Karte nach vorn holen und hinscrollen
  const focus = useFocusCard();
  useEffect(() => {
    if (!focus || !incoming.includes(focus)) return;
    setFocusCard(null);
    if (orderRef.current[0] !== focus) bringToFront(focus);
    // Ohne Aufräumen: `setFocusCard(null)` rendert gleich neu und würde den Sprung sonst abbrechen
    setTimeout(() => node.current && scrollTo?.(node.current), 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, sequence]);
  useEffect(() => {
    const el = node.current as unknown as HTMLElement | null;
    if (Platform.OS !== 'web' || !el?.addEventListener) return;
    let sx = 0;
    let sy = 0;
    let mine: boolean | null = null;
    const start = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      mine = null;
    };
    const move = (e: TouchEvent) => {
      if (mine === null) {
        const dx = e.touches[0].clientX - sx;
        const dy = e.touches[0].clientY - sy;
        if (Math.hypot(dx, dy) < 6) return;
        mine = openRef.current < 0.5 && orderRef.current.length > 1 && (Math.abs(dx) > Math.abs(dy) || dy > 0);
      }
      if (mine && e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
    };
  }, []);

  const n = order.length;
  const frontIndex = n ? incoming.indexOf(order[0]) + 1 : 0;
  return (
    <View style={styles.wrap}>
      <View
        ref={node}
        onStartShouldSetResponderCapture={markCardSwipe}
        onLayout={(e: LayoutChangeEvent) => {
          width.current = e.nativeEvent.layout.width;
        }}
        {...pan.panHandlers}
      >
        <DragLock.Provider value={lock}>
          <Animated.View style={[styles.stack, { height: stackH }]}>
            {order.map((key, pos) => {
              const card = cards.find((c) => keyOf(c) === key);
              if (!card) return null;
              const v = valsOf(key);
              // Zu: vorn oben. Offen: von oben nach unten übereinander, die vordere unten und ganz oben drauf.
              const z = open ? (pos === 0 ? 100 : 10 + pos) : 100 - pos;
              return (
                <Animated.View
                  key={key}
                  style={[
                    styles.slot,
                    {
                      zIndex: z,
                      elevation: z / 10,
                      opacity: v.o,
                      transform: [
                        { translateX: v.x },
                        { translateY: v.y },
                        { rotate: v.r.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }) },
                        { scale: v.s },
                      ],
                    },
                  ]}
                  onLayout={(e: LayoutChangeEvent) => {
                    const h = e.nativeEvent.layout.height;
                    if (Math.abs((heights.current.get(key) ?? 0) - h) > 0.5) {
                      heights.current.set(key, h);
                      measured();
                    }
                  }}
                  accessibilityElementsHidden={!open && pos > 0}
                  importantForAccessibility={!open && pos > 0 ? 'no-hide-descendants' : 'auto'}
                >
                  <HeadReport
                    onHead={(h) => {
                      if (Math.abs((heads.current.get(key) ?? 0) - h) > 0.5) {
                        heads.current.set(key, h);
                        measured();
                      }
                    }}
                  >
                    {card}
                  </HeadReport>
                  {/* Hintere Karten: Tippen fächert auf, aufgefächert holt Tippen die Karte nach vorn */}
                  {pos > 0 ? (
                    <Pressable
                      style={styles.cover}
                      onPress={() => (open ? bringToFront(key, true) : setOpen(true))}
                      accessibilityRole="button"
                      accessibilityLabel={open ? t('Karte nach vorn holen') : t('Stapel auffächern')}
                    />
                  ) : null}
                </Animated.View>
              );
            })}
          </Animated.View>
        </DragLock.Provider>
      </View>
      {n > 1 ? (
        <View ref={foot} style={styles.foot}>
          <Pressable
            onPress={() => setOpen(!open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            hitSlop={8}
            style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
          >
            <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
              <Icon name="chevron-right" size={16} color={color.text.secondary} />
            </View>
            <Text style={styles.toggleText}>{open ? 'Zusammenschieben' : 'Auffächern'}</Text>
          </Pressable>
          <Text noTranslate style={styles.count}>
            {t('{n} von {all}', { n: frontIndex, all: n })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Reicht die Höhe von Zeit und Titel aus der Karte an den Stapel weiter */
function HeadReport({ onHead, children }: { onHead: (h: number) => void; children: ReactElement }) {
  const ref = useRef(onHead);
  ref.current = onHead;
  const report = useCallback((h: number) => ref.current(h), []);
  return <StackHead.Provider value={report}>{children}</StackHead.Provider>;
}

/**
 * Kopf über dem Stapel: Tag und Pfeile, darunter Punkte für die Tage. Waagerecht wischen auf der Zeile wechselt den
 * Tag, denn Wischen auf dem Stapel blättert durch die Karten (Daria, 2026-11-28).
 */
export function DayHead({ label, index, count, onDay }: { label: string; index: number; count: number; onDay: (i: number, dir: -1 | 1) => void }) {
  const go = (dir: -1 | 1) => {
    const i = index + dir;
    if (i >= 0 && i < count) onDay(i, dir);
  };
  const goRef = useRef(go);
  goRef.current = go;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_e, g) => {
          if (Math.abs(g.dx) > 50) goRef.current(g.dx < 0 ? 1 : -1);
        },
      }),
    [],
  );
  return (
    <View style={styles.head} onStartShouldSetResponderCapture={markCardSwipe} {...pan.panHandlers}>
      <View style={styles.headRow}>
        <Pressable
          onPress={() => go(-1)}
          disabled={index === 0}
          accessibilityRole="button"
          accessibilityLabel={t('Vorheriger Tag')}
          style={({ pressed }) => [styles.arrow, index === 0 && styles.arrowOff, pressed && styles.pressed]}
        >
          <Icon name="chevron-left" size={18} color={color.text.primary} />
        </Pressable>
        <Text noTranslate style={styles.day} accessibilityRole="header">
          {label}
        </Text>
        <Pressable
          onPress={() => go(1)}
          disabled={index >= count - 1}
          accessibilityRole="button"
          accessibilityLabel={t('Nächster Tag')}
          style={({ pressed }) => [styles.arrow, index >= count - 1 && styles.arrowOff, pressed && styles.pressed]}
        >
          <Icon name="chevron-right" size={18} color={color.text.primary} />
        </Pressable>
      </View>
      {count > 1 ? (
        <View style={styles.dots}>
          {Array.from({ length: count }, (_, i) => (
            <Pressable
              key={i}
              onPress={() => i !== index && onDay(i, i > index ? 1 : -1)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityState={{ selected: i === index }}
              accessibilityLabel={t('Tag {n}', { n: i + 1 })}
              style={[styles.dot, i === index && styles.dotOn]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * „Nach Typ sortieren“ (Daria, 2026-11-28): zweitrangiger Knopf mit Umriss, leicht schräg am rechten Rand. Er schwirrt
 * langsam ein paar Punkte hin und her; mit „Bewegung reduzieren“ steht er still. Sortiert heißt er „Alles zusammen“
 * und kippt zur anderen Seite.
 */
export function SortButton({ on, onPress }: { on: boolean; onPress: () => void }) {
  const reduce = useReduceMotion();
  const drift = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    const step = (to: number, ms: number) => Animated.timing(drift, { toValue: to, duration: ms, useNativeDriver: Platform.OS !== 'web' });
    const loop = Animated.loop(Animated.sequence([step(1, 1600), step(-0.6, 1400), step(0.4, 1300), step(0, 1500)]));
    loop.start();
    return () => loop.stop();
  }, [reduce, drift]);
  useEffect(() => {
    Animated.spring(tilt, { toValue: on ? 1 : 0, ...SPRING, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [on, tilt]);
  const transform = [
    { translateX: drift.interpolate({ inputRange: [-1, 1], outputRange: [-3, 3] }) },
    { translateY: drift.interpolate({ inputRange: [-1, 1], outputRange: [2, -3] }) },
    { rotate: tilt.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '4deg'] }) },
  ];
  return (
    <Animated.View style={[styles.sort, { transform }]}>
      <HandButton label={on ? 'Alles zusammen' : 'Nach Typ sortieren'} onPress={onPress} tone={color.text.primary} glyph={(ink) => <SortGlyph up={on} ink={ink} />} />
    </Animated.View>
  );
}

/**
 * Zeichen im Knopf (aus dem Entwurf, Daria, 2026-11-28: „süßes Icon, das für Aus- und Einklappen gut passt“): drei
 * Striche und ein Pfeil. Sortieren: längster Strich oben, Pfeil nach unten. Zusammen: Pfeil nach oben, längster Strich
 * unten.
 */
function SortGlyph({ up, ink }: { up: boolean; ink: string }) {
  const d = up ? 'M2 4h3M2 8h5M2 12h8M12 13V3M9.5 5.5 12 3l2.5 2.5' : 'M2 4h8M2 8h5M2 12h3M12 3v10M9.5 10.5 12 13l2.5-2.5';
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d={d} stroke={ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
