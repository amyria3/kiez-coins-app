import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { markCardSwipe } from '../../lib/cardSwipe';

import { addToMyCalendar, eventDate, eventTime, type CalendarEvent } from '../../data/calendar';
import { hideEvent } from '../../data/hiddenEvents';
import { dayName, goalText, katerMood, whenText, type KaterMood } from '../../data/katerRoutine';
import { capitalize, goalOf, type Reminder } from '../../data/reminders';
import { asSingleEvent, eventWhen, saveEvent } from '../../data/showcase';
import { t, useTexts } from '../../data/texts';
import { color, space } from '../../theme/tokens';
import { KaterCircle } from '../Content';
import { handShapePath } from '../handShape';
import { Icon } from '../icons/Icon';
import { ReminderExtrasRow } from '../ReminderExtras';
import { ManageButton } from '../ShowcaseManage';
import { Text } from '../T';
import { CARD_MAX, CARD_MIN, DRAG_AT, GUTTER, INK, INK_SOFT, LIFT_MS, MUSTARD, OLIVE, POWDER, UP_FACTOR, UP_ROOM } from './constants';
import { DragLock, Motion, PageLock, Saved, stickerOf, tiltOf, useReduceMotion } from './shared';
import { styles } from './styles';

export function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const { width: screen } = useWindowDimensions();
  const page = useContext(PageLock);
  const [locked, setLocked] = useState(false);
  const lock = useCallback(
    (on: boolean) => {
      setLocked(on);
      page(on);
    },
    [page],
  );
  // Breite der Spalte; im Browser ist die App schmaler als das Fenster
  const [width, setWidth] = useState(screen - GUTTER * 2);
  // Länglich, so breit es geht (Daria, 2026-11-12); die nächste Karte schaut rechts ein Stück herein
  const cards = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean);
  // Nur eine Karte: über die ganze Breite (Daria, 2026-11-12)
  const cardWidth = cards.length === 1 ? width : Math.max(CARD_MIN, Math.min(CARD_MAX, width - 36));
  return (
    <View style={styles.group} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.groupHead}>
        <Text style={styles.groupTitle} accessibilityRole="header">
          {title}
        </Text>
        <Text noTranslate style={styles.groupCount}>
          {count}
        </Text>
      </View>
      {/* Seitliches Wischen hier bewegt nur die Karten, nicht die Reiter im Feed (Daria, 2026-11-12) */}
      <View onStartShouldSetResponderCapture={markCardSwipe} onTouchEnd={() => locked && lock(false)} onTouchCancel={() => locked && lock(false)}>
        <DragLock.Provider value={lock}>
          {/* Eine Karte: keine Reihe zum Scrollen. Ein abgeschalteter ScrollView sperrt im Browser jede Berührung
              (touch-action: none), dann scrollt die Seite nicht, wenn der Finger auf der Karte startet (Daria, 2026-11-13). */}
          {cards.length === 1 ? (
            <View style={[styles.rowScroll, styles.row]}>
              <View style={{ width: cardWidth }}>{cards[0]}</View>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled={!locked}
              snapToInterval={cardWidth + space[12]}
              decelerationRate="fast"
              style={styles.rowScroll}
              contentContainerStyle={styles.row}
            >
              {cards.map((c, i) => (
                <View key={i} style={{ width: cardWidth }}>
                  {c}
                </View>
              ))}
            </ScrollView>
          )}
        </DragLock.Provider>
      </View>
    </View>
  );
}

/** Stand des Katers auf der Karte, bis die Videos da sind als Wort am Avatar */
type Mood = KaterMood;
const moodOf = (r: Reminder) => katerMood(r);


type DragActions = { right?: () => void; left?: () => void; up?: () => void };

/** Anheben nach kurzem Halten, dann folgt die Karte dem Finger; ab `DRAG_AT` löst das Loslassen aus */
function useLiftDrag(actions: DragActions) {
  const lock = useContext(DragLock);
  const native = Platform.OS !== 'web';
  const pos = useRef(new Animated.ValueXY()).current;
  const lift = useRef(new Animated.Value(0)).current;
  const [lifted, setLifted] = useState(false);
  const state = useRef({ lifted: false, dragging: false, skipPress: false, timer: null as ReturnType<typeof setTimeout> | null });
  const now = useRef(actions);
  useEffect(() => {
    now.current = actions;
  });
  const on = !!(actions.right || actions.left || actions.up);
  // Im Browser zählt für das Scrollen nur, was beim Aufsetzen des Fingers galt. Solange die Karte angehoben ist, hält
  // deshalb ein eigener Zuhörer jede Fingerbewegung vom Scrollen ab (Daria, 2026-11-13: „Seite scrollt mit“).
  useEffect(() => {
    if (!lifted || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('touchmove', stop, { passive: false });
    return () => document.removeEventListener('touchmove', stop);
  }, [lifted]);

  const drop = () => {
    state.current.lifted = false;
    setLifted(false);
    lock(false);
    Animated.parallel([
      Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: native, bounciness: 4 }),
      Animated.spring(lift, { toValue: 0, useNativeDriver: native, bounciness: 4 }),
    ]).start();
  };
  // Nie mit gesperrter Seite zurückbleiben, auch wenn die Karte verschwindet
  useEffect(
    () => () => {
      if (state.current.timer) clearTimeout(state.current.timer);
      if (state.current.lifted) lock(false);
    },
    [lock],
  );
  const pressIn = () => {
    state.current.skipPress = false;
    if (!on) return;
    if (state.current.timer) clearTimeout(state.current.timer);
    state.current.timer = setTimeout(() => {
      state.current.lifted = true;
      setLifted(true);
      lock(true);
      Animated.spring(lift, { toValue: 1, useNativeDriver: native, bounciness: 6 }).start();
    }, LIFT_MS);
  };
  const pressOut = () => {
    if (state.current.timer) clearTimeout(state.current.timer);
    state.current.timer = null;
    if (!state.current.lifted) return;
    // Angehoben: Das Tippen zählt nicht. Ohne Ziehen wieder ablegen. Erst nach dem Ereignis prüfen, denn beim
    // Ziehen endet das Tippen, bevor das Ziehen beginnt.
    state.current.skipPress = true;
    setTimeout(() => {
      if (state.current.lifted && !state.current.dragging) drop();
    }, 0);
  };
  /** Finger weg, egal wo: Zeitgeber stoppen und eine angehobene, nicht gezogene Karte ablegen (Sicherung, Daria 2026-11-13) */
  const touchEnd = () => {
    if (state.current.timer) clearTimeout(state.current.timer);
    state.current.timer = null;
    if (state.current.lifted && !state.current.dragging) drop();
  };
  /** Tippen nach dem Ablegen nicht als Tippen werten */
  const press = (onPress?: () => void) => () => {
    if (state.current.skipPress) {
      state.current.skipPress = false;
      return;
    }
    onPress?.();
  };
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: () => state.current.lifted,
      onPanResponderGrant: () => {
        state.current.dragging = true;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => {
        const a = now.current;
        // Eine Richtung zur Zeit, damit die Karte nur eine Bedeutung zeigt. Ohne Ziel in dieser Richtung gibt sie nur
        // wenig nach; nach oben nur ein Stück, sonst schneidet die Reihe ab.
        const across = Math.abs(g.dx) >= Math.abs(g.dy);
        const x = across && (g.dx > 0 ? a.right : a.left) ? g.dx : g.dx / 6;
        const y = !across && g.dy < 0 && a.up ? Math.max(g.dy * UP_FACTOR, -UP_ROOM + 8) : g.dy / 6;
        pos.setValue({ x, y });
      },
      onPanResponderRelease: (_e, g) => {
        state.current.dragging = false;
        const a = now.current;
        drop();
        const across = Math.abs(g.dx) >= Math.abs(g.dy);
        if (across && g.dx >= DRAG_AT) a.right?.();
        else if (across && g.dx <= -DRAG_AT) a.left?.();
        else if (!across && g.dy <= -DRAG_AT) a.up?.();
      },
      onPanResponderTerminate: () => {
        state.current.dragging = false;
        drop();
      },
    }),
  ).current;
  return { on, pos, lift, lifted, pressIn, pressOut, press, touchEnd, handlers: pan.panHandlers };
}

function Card({
  bg,
  mood,
  head,
  children,
  tiltKey,
  urgent = false,
  onPress,
  pressHint,
  onDragRight,
  onDragLeft,
  onDragUp,
  leftLabel = 'Abbrechen',
  leftTone = 'end',
}: {
  bg: string;
  mood: Mood;
  head: ReactNode;
  children?: ReactNode;
  /** Für die feste Schräge, meist die id */
  tiltKey: string;
  /** Dringend (fällig in einer Stunde oder vorbei): wackelt alle paar Sekunden kurz (Daria, 2026-11-13) */
  urgent?: boolean;
  /** Tippen auf die Karte, z. B. erledigte Karte öffnet ihr Menü (Daria, 2026-11-13) */
  onPress?: () => void;
  pressHint?: string;
  /** Angehoben ziehen: rechts erledigt, links abbrechen, oben später (Daria, 2026-11-13) */
  onDragRight?: () => void;
  onDragLeft?: () => void;
  onDragUp?: () => void;
  /** Was nach links ziehen bedeutet: „Abbrechen“, „Absagen“ oder „Löschen“ (Daria, 2026-11-13) */
  leftLabel?: string;
  leftTone?: 'end' | 'delete';
}) {
  const motion = useContext(Motion);
  const drag = useLiftDrag(motion ? { right: onDragRight, left: onDragLeft, up: onDragUp } : {});
  const reduce = useReduceMotion();
  const native = Platform.OS !== 'web';
  const wobble = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Angehoben wackelt nichts, die Karte folgt nur dem Finger
    if (!urgent || reduce || !motion || drag.lifted) return;
    const to = (v: number) => Animated.timing(wobble, { toValue: v, duration: 70, useNativeDriver: native });
    const loop = Animated.loop(Animated.sequence([to(1), to(-1), to(0.7), to(-0.5), to(0), Animated.delay(2800)]));
    loop.start();
    return () => {
      loop.stop();
      wobble.setValue(0);
    };
  }, [urgent, reduce, motion, native, wobble, drag.lifted]);
  const tilt = motion ? tiltOf(tiltKey) : 0;
  // Schräge, beim Anheben etwas mehr, beim Wackeln ±2,5°, beim Ziehen neigt sie sich mit.
  // Einmal anlegen, nicht bei jedem Rendern: Neue Animationsknoten setzen die Karte für ein Bild zurück, das flackert
  // beim Tippen und Halten (Daria, 2026-11-13).
  const { rotate, scale } = useMemo(() => {
    const degrees = Animated.add(
      drag.lift.interpolate({ inputRange: [0, 1], outputRange: [tilt, tilt + (tilt >= 0 ? 1.5 : -1.5)] }),
      Animated.add(Animated.multiply(wobble, 2.5), Animated.multiply(drag.pos.x, 0.04)),
    );
    return {
      rotate: degrees.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }),
      scale: drag.lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }),
    };
  }, [tilt, drag.lift, drag.pos, wobble]);
  const transform = useMemo(() => [{ translateX: drag.pos.x }, { translateY: drag.pos.y }, { rotate }, { scale }], [drag.pos, rotate, scale]);

  const sticker = stickerOf(tiltKey);
  const chip = (
    // Stimmung klebt schräg am Kater wie ein Sticker (Daria, 2026-11-12), nie über seinem Gesicht (2026-11-14)
    <View style={[styles.chip, sticker.above ? styles.chipAbove : styles.chipBelow, { transform: [{ rotate: `${sticker.rotate}deg` }] }]} pointerEvents="none">
      <Text style={styles.chipText} numberOfLines={1}>
        {mood}
      </Text>
    </View>
  );
  const kater = (
    // Ring in der Farbe des Grunds (Daria, 2026-11-12)
    <View style={[styles.katerSide, { alignItems: sticker.avatar }]}>
      {sticker.above ? chip : null}
      <View style={styles.katerRing}>
        <KaterCircle size={40} bg={bg} />
      </View>
      {sticker.above ? null : chip}
    </View>
  );
  const card = (
    <Pressable
      onPress={drag.press(onPress)}
      onPressIn={drag.pressIn}
      onPressOut={drag.pressOut}
      accessibilityHint={[
        onPress ? t(pressHint ?? 'Tippen öffnet das Menü') : '',
        drag.on
          ? t('Halten und ziehen: {moves}', {
              moves: [drag.on && onDragRight && t('rechts erledigt'), drag.on && onDragLeft && t('links {what}', { what: t(leftLabel).toLowerCase() }), drag.on && onDragUp && t('oben später')]
                .filter(Boolean)
                .join(', '),
            })
          : '',
      ]
        .filter(Boolean)
        .join('. ')}
      style={[styles.card, drag.lifted && styles.cardLifted, { backgroundColor: bg }]}
    >
      {/* Kater immer neben Titel und Zeit (Daria, 2026-11-13), oben rechts in der Ecke (Daria, 2026-11-16) */}
      <View style={styles.cardBody}>
        <View style={styles.headRow}>
          <View style={styles.head}>{head}</View>
          {kater}
        </View>
        <View style={styles.cardRest}>{children}</View>
      </View>
      {/* Beim Ziehen zeigt die Karte selbst, was das Loslassen auslöst (Daria, 2026-11-13: keine Rückfrage, die Karte
          ändert sich). Bis zur Schwelle schimmert die Farbe nur, ab der Schwelle deckt sie und das Wort wird größer. */}
      {drag.on ? (
        <View style={styles.dragFace} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {drag.on && onDragRight ? <DragFace value={drag.pos.x} sign={1} at={DRAG_AT} bg={color.accent.confirmation} ink={INK} icon="check" label="Erledigt" align="flex-start" /> : null}
          {drag.on && onDragLeft ? (
            <DragFace
              value={drag.pos.x}
              sign={-1}
              at={DRAG_AT}
              bg={leftTone === 'delete' ? color.accent.error : INK}
              ink={leftTone === 'delete' ? INK : color.text.primary}
              icon="close"
              label={leftLabel}
              align="flex-end"
            />
          ) : null}
          {drag.on && onDragUp ? <DragFace value={drag.pos.y} sign={-1} at={DRAG_AT * UP_FACTOR} bg={INK_SOFT} ink={color.text.primary} icon="clock-filled" label="Später" align="center" /> : null}
        </View>
      ) : null}
    </Pressable>
  );
  return (
    <View style={[styles.swipe, drag.lifted && styles.swipeLifted]} onTouchEnd={drag.touchEnd} onTouchCancel={drag.touchEnd}>
      <Animated.View
        style={[styles.swipe, { transform }]}
        {...drag.handlers}
      >
        {card}
      </Animated.View>
    </View>
  );
}

/**
 * Fläche auf der Karte für eine Richtung: Farbe, Icon und Wort. `sign` 1 heißt positive Werte (rechts), −1 negative
 * (links, oben). Die Fläche springt an der Schwelle von halb auf ganz, damit klar ist: Loslassen löst jetzt aus.
 */
function DragFace({
  value,
  sign,
  at,
  bg,
  ink,
  icon,
  label,
  align,
}: {
  value: Animated.Value;
  sign: 1 | -1;
  at: number;
  bg: string;
  ink: string;
  icon: 'check' | 'close' | 'clock-filled';
  label: string;
  align: 'flex-start' | 'flex-end' | 'center';
}) {
  // Stufen: 0 – halbe Schwelle – kurz vor der Schwelle – Schwelle. Einmal anlegen, siehe Card.
  const anim = useMemo(() => {
    const range = (a: number, b: number, c: number, d: number) => ({
      inputRange: sign > 0 ? [0, at / 2, at - 1, at] : [-at, -at + 1, -at / 2, 0],
      outputRange: sign > 0 ? [a, b, c, d] : [d, c, b, a],
      extrapolate: 'clamp' as const,
    });
    return {
      face: value.interpolate(range(0, 0.25, 0.5, 0.96)),
      label: value.interpolate(range(0, 0, 0.6, 1)),
      scale: [{ scale: value.interpolate(range(0.85, 0.85, 0.92, 1.08)) }],
    };
  }, [value, sign, at]);
  return (
    <Animated.View style={[styles.dragFaceLayer, { backgroundColor: bg, alignItems: align, opacity: anim.face }]}>
      <Animated.View style={[styles.dragFaceLabel, { opacity: anim.label, transform: anim.scale }]}>
        <Icon name={icon} size={28} color={ink} />
        <Text style={[styles.dragFaceText, { color: ink }]}>{label}</Text>
      </Animated.View>
    </Animated.View>
  );
}

/** Auch in der Tour (TourDemo), dort mit Beispieldaten */
export function DemoTaskCard(props: { reminder: Reminder; onDone: () => void; onGiveUp: () => void; onCancel: () => void; onEdit?: () => void }) {
  return <TaskCard {...props} />;
}

export function TaskCard({
  reminder: r,
  onDone,
  onGiveUp,
  onCancel,
  onEdit,
  onCopy,
  onDelete,
  onLater,
  urgent,
  onDragCancel,
  onDragDelete,
}: {
  reminder: Reminder;
  onDone: () => void;
  onGiveUp: () => void;
  onCancel: () => void;
  onEdit?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onLater?: () => void;
  urgent?: boolean;
  /** Beim Ziehen: ohne Rückfrage */
  onDragCancel?: () => void;
  onDragDelete?: () => void;
}) {
  const goal = goalOf(r);
  const done = Math.min(r.doneThisWeek, goal);
  const resting = r.doneToday || r.doneThisWeek >= goal;
  // Einmalig und erledigt: kommt nicht wieder, also löschen statt abbrechen oder aufgeben (Daria, 2026-11-13)
  const finished = resting && !!r.onDate;
  const menu = useRef<(() => void) | null>(null);
  const items = menuItems({
    edit: onEdit,
    copy: onCopy,
    later: resting ? undefined : onLater,
    giveUp: resting && !finished ? onGiveUp : undefined,
    end: finished ? undefined : { label: 'Das hier abbrechen', run: onCancel },
    remove: resting ? onDelete : undefined,
  });
  return (
    <Card
      bg={MUSTARD}
      mood={moodOf(r)}
      onPress={() => menu.current?.()}
      tiltKey={r.id}
      urgent={urgent}
      onDragRight={resting ? undefined : onDone}
      onDragLeft={finished ? (onDragDelete ?? onDelete) : (onDragCancel ?? onCancel)}
      leftLabel={finished ? 'Löschen' : 'Abbrechen'}
      leftTone={finished ? 'delete' : 'end'}
      onDragUp={resting ? undefined : onLater}
      head={<CardHead meta={r.onDate ? whenText(r) : goalText(r)} title={capitalize(r.want)} />}
    >
      <ReminderExtrasRow place={r.place} phone={r.phone} link={r.link} ink={INK} />
      {goal > 1 ? <Text style={styles.sub}>{t('{done} von {goal} diese Woche', { done, goal })}</Text> : null}
      {goal > 1 ? (
        <View
          style={styles.bar}
          accessible
          accessibilityLabel={t('{done} von {goal} diese Woche', {
            done,
            goal,
          })}
        >
          {Array.from({ length: goal }, (_, i) => (
            <View key={i} style={[styles.segment, i < done && styles.segmentDone]} />
          ))}
        </View>
      ) : null}
      {/* Erledigt, Aufgeben und im Menü „Das hier abbrechen“ (Daria, 2026-11-13); alle drei zählen im Kalender.
          Buttons mit festem Abstand beieinander, nur „•••“ rechts (Daria, 2026-11-13) */}
      {resting ? (
        <View style={styles.actions}>
          <Text style={styles.state}>{r.doneToday ? 'Heute erledigt' : 'Ziel erreicht'}</Text>
          <ManageButton dots={INK} style={styles.more} label="Mehr zu dieser Aufgabe" openRef={menu} items={items} />
        </View>
      ) : (
        <View style={styles.actions}>
          <HandButton label="Aufgeben" onPress={onGiveUp} />
          <HandButton label="Erledigt" onPress={onDone} filled bg={MUSTARD} />
          <ManageButton dots={INK} style={styles.more} label="Mehr zu dieser Aufgabe" openRef={menu} items={items} />
        </View>
      )}
    </Card>
  );
}

export function EventCard({
  reminder: r,
  bg,
  onDone,
  onEnd,
  onEdit,
  onCopy,
  onDelete,
  onLater,
  urgent,
  onDragCancel,
  onDragDelete,
}: {
  reminder: Reminder;
  bg: string;
  onDone: () => void;
  onEnd: () => void;
  onEdit: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onLater?: () => void;
  urgent?: boolean;
  /** Beim Ziehen: ohne Rückfrage */
  onDragCancel?: () => void;
  onDragDelete?: () => void;
}) {
  // Jede Karte mit „•••“ (Daria, 2026-11-13); dasselbe Menü öffnet ein Tippen auf die Karte
  const menu = useRef<(() => void) | null>(null);
  const items = menuItems({
    edit: onEdit,
    copy: onCopy,
    later: r.doneToday ? undefined : onLater,
    end: r.doneToday ? undefined : { label: 'Absagen', run: onEnd },
    remove: r.doneToday ? onDelete : undefined,
  });
  const more = <ManageButton dots={INK} style={styles.more} label="Mehr zu diesem Termin" openRef={menu} items={items} />;
  return (
    <Card
      bg={bg}
      mood={moodOf(r)}
      onPress={() => menu.current?.()}
      tiltKey={r.id}
      urgent={urgent}
      onDragRight={r.doneToday ? undefined : onDone}
      // Links: absagen; erledigt: löschen (Daria, 2026-11-13). Beim Ziehen ohne Rückfrage, die Karte zeigt es an.
      onDragLeft={r.doneToday ? (onDragDelete ?? onDelete) : (onDragCancel ?? onEnd)}
      leftLabel={r.doneToday ? 'Löschen' : 'Absagen'}
      leftTone={r.doneToday ? 'delete' : 'end'}
      onDragUp={r.doneToday ? undefined : onLater}
      head={<CardHead meta={whenText(r)} title={capitalize(r.want)} />}>
      <ReminderExtrasRow place={r.place} phone={r.phone} link={r.link} ink={INK} />
      {r.doneToday ? (
        <View style={styles.actions}>
          <Text style={styles.state}>Erledigt</Text>
          {more}
        </View>
      ) : (
        <View style={styles.actions}>
          {/* „Absagen“ statt „Beenden“: Ein Termin findet nicht statt, er läuft nicht aus (Daria, 2026-11-13) */}
          <HandButton label="Absagen" onPress={onEnd} />
          <HandButton label="Erledigt" onPress={onDone} filled bg={bg} />
          {more}
        </View>
      )}
    </Card>
  );
}

/**
 * Menü jeder eigenen Karte in fester Reihenfolge (Daria, 2026-11-13, „Check consistency“): Bearbeiten, Kopie
 * erstellen, Später, Aufgeben, Abbrechen bzw. Absagen, Löschen. Es steht nur, was zum Zustand passt: Später nur
 * offen, Löschen nur erledigt, Aufgeben nur bei wiederkehrenden.
 */
function menuItems(a: {
  edit?: () => void;
  copy?: () => void;
  later?: () => void;
  giveUp?: () => void;
  end?: { label: string; run: () => void };
  remove?: () => void;
}) {
  return [
    a.edit && { label: 'Bearbeiten', onPress: a.edit },
    a.copy && { label: 'Kopie erstellen', onPress: a.copy },
    a.later && { label: 'Später', onPress: a.later },
    a.giveUp && { label: 'Aufgeben', onPress: a.giveUp },
    a.end && { label: a.end.label, onPress: a.end.run },
    a.remove && { label: 'Löschen', onPress: a.remove },
  ].filter((x): x is { label: string; onPress: () => void } => !!x);
}

/**
 * Zeit und Titel einer Karte. Kein eigenes Tippziel mehr (Daria, 2026-11-13): Halten hebt die Karte an, auch auf dem
 * Titel; Tippen öffnet das Menü, dort steht „Bearbeiten“.
 */
function CardHead({ meta, title }: { meta: string; title: string }) {
  return (
    <>
      <Text style={styles.meta}>{meta}</Text>
      <Text noTranslate style={styles.title} numberOfLines={2}>
        {title}
      </Text>
    </>
  );
}

/**
 * Termin aus einem verbundenen Kalender. Ausblenden (Daria, 2026-11-14): Tippen öffnet das Menü mit „Ausblenden“,
 * nach links ziehen blendet ohne Rückfrage aus. Im eigenen Kalender bleibt der Termin.
 */
export function CalendarCard({ event: e }: { event: CalendarEvent }) {
  const when = `${dayName(eventDate(e))} ${e.allDay ? t('ganztägig') : t('um {time}', { time: eventTime(e.start) })}`;
  const menu = useRef<(() => void) | null>(null);
  const hide = () => hideEvent(e);
  return (
    <Card
      bg={OLIVE}
      tiltKey={e.id}
      mood="chillig"
      onPress={() => menu.current?.()}
      onDragLeft={hide}
      leftLabel="Ausblenden"
      head={
        <>
          <Text style={styles.meta}>{when}</Text>
          <Text noTranslate style={styles.title} numberOfLines={2}>
            {e.title}
          </Text>
        </>
      }
    >
      <View style={styles.actions}>
        <Text noTranslate style={styles.state}>
          {e.calendar || t('Aus Deinem Kalender')}
        </Text>
        <ManageButton dots={INK} style={styles.more} label="Mehr zu diesem Termin" openRef={menu} items={[{ label: 'Ausblenden', onPress: hide }]} />
      </View>
    </Card>
  );
}

/** Gespeicherter Termin aus einem Schaufenster: Entfernen oder in den eigenen Kalender */
export function SavedCard({ event: e, onChanged }: { event: Saved; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    setBusy(true);
    const ok = await saveEvent(e.id, false);
    setBusy(false);
    if (ok) onChanged();
  };
  const toCalendar = async () => {
    const ok = await addToMyCalendar(asSingleEvent(e, e.showcase));
    if (!ok) Alert.alert(t('Hat nicht geklappt'), t('Der Kalender ließ sich gerade nicht öffnen.'));
  };
  return (
    <Card
      bg={POWDER}
      tiltKey={`s${e.id}`}
      mood={e.cancelled ? 'enttäuscht' : 'neugierig'}
      head={
        <>
          <Text style={styles.meta}>{e.cancelled ? t('Abgesagt') : eventWhen(e)}</Text>
          <Text noTranslate style={[styles.title, e.cancelled && styles.struck]} numberOfLines={2}>
            {e.title}
          </Text>
        </>
      }
    >
      <Text noTranslate style={styles.sub} numberOfLines={1}>
        {e.location ? `${e.showcase} · ${e.location}` : e.showcase}
      </Text>
      <View style={styles.actions}>
        <HandButton label="Entfernen" onPress={remove} disabled={busy} />
        {/* Genau sagen, was passiert (Daria, 2026-11-13): im Browser eine Kalenderdatei, in der
            Android-App der Kalender des Handys */}
        {e.cancelled ? null : <HandButton label={Platform.OS === 'web' ? 'ICS exportieren' : 'In Handykalender'} onPress={toCalendar} filled bg={POWDER} />}
      </View>
    </Card>
  );
}

/** Button in der Handform: gefüllt in Tinte oder nur mit Kontur */
/** Knopf mit handgezeichnetem Rand (Routine-Karten, seit 2026-11-17 auch Schaufenster-Karten) */
export function HandButton({
  label: original,
  onPress,
  filled,
  bg,
  fill,
  disabled,
}: {
  label: string;
  onPress: () => void;
  filled?: boolean;
  bg?: string;
  /** Fläche in dieser Farbe, Schrift in Tinte, z. B. Türkis für „Merken“ im Schaufenster (Daria, 2026-11-17) */
  fill?: string;
  disabled?: boolean;
}) {
  const label = useTexts()(original);
  const solid = filled || !!fill;
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setBox((b) => (b && b.w === w && b.h === h ? b : { w, h }));
  };
  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.hand, solid && styles.handFilled, (pressed || disabled) && styles.pressed]}
    >
      {box ? (
        <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path
            d={handShapePath(box.w, box.h, solid ? 0 : 1)}
            fill={fill ?? (filled ? INK : 'none')}
            stroke={solid ? undefined : INK}
            strokeWidth={solid ? 0 : 1.4}
          />
        </Svg>
      ) : null}
      <Text noTranslate style={[styles.handLabel, { color: filled && !fill ? bg : INK }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Kalender (Daria, 2026-11-12, nach Vorlage): runde Tage, erledigte in Senf, ausgefallene schraffiert, heute mit Ring.
 * Standardmäßig eingeklappt auf die laufende Woche; ein Tipp auf den Monat klappt ihn auf.
 */
/** Kalender im Feed-Kopf, mit den Daten, die die Routine gerade zeigt (Daria, 2026-11-14) */
