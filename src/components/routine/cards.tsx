import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Animated, Easing, Linking, PanResponder, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { calCancelUrl, canCancel, minutesUntil, shortNoticeKind } from '../../data/calBooking';
import { addToMyCalendar, eventDate, eventTime, type CalendarEvent } from '../../data/calendar';
import { hideEvent } from '../../data/hiddenEvents';
import { dayName, goalText, katerLine, weekdayShort, whenText } from '../../data/katerRoutine';
import { canSkip, capitalize, goalOf, loadReminderWeek, outOfReachOf, plannedGoalOf, type Reminder } from '../../data/reminders';
import { weekBreakdown, type WeekDayState } from '../../data/reminderDates';
import { getExpandedCard, setExpandedCard, useExpandedCard } from '../../data/routineView';
import { asSingleEvent, eventWhen, saveEvent } from '../../data/showcase';
import { t, useTexts } from '../../data/texts';
import { color } from '../../theme/tokens';
import { handShapePath } from '../handShape';
import { Icon, type IconName } from '../icons/Icon';
import { ClampText, FullCard } from '../ClampText';
import { ReminderExtrasRow } from '../ReminderExtras';
import { KaterCircle } from '../Content';
import { ManageButton } from '../ShowcaseManage';
import { Text } from '../T';
import { DRAG_AT, INK, INK_SOFT, LIFT_MS, MUSTARD, OLIVE, SHOWCASE, UP_FACTOR, UP_ROOM } from './constants';
import { DragLock, Motion, Saved, StackHead, tiltOf, useReduceMotion } from './shared';
import { styles } from './styles';

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
  open,
}: {
  bg: string;
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
  /** Ausklappbare Karte (Daria, 2026-11-28): Tippen klappt auf und zu, aufgeklappt steht der Text ganz da */
  open?: boolean;
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

  // Gekürzte Texte: Tippen zeigt die Karte ganz, nochmal Tippen kürzt wieder. Ohne Kürzung öffnet Tippen wie bisher
  // das Menü (Daria, 2026-11-27).
  const [full, setFull] = useState(false);
  const [cuts, setCuts] = useState(() => new Set<object>());
  const report = useCallback((key: object, cut: boolean) => {
    setCuts((prev) => {
      if (prev.has(key) === cut) return prev;
      const next = new Set(prev);
      if (cut) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  const expandable = open !== undefined;
  const fullCard = useMemo(() => ({ full: full || !!open, report }), [full, open, report]);
  const canGrow = cuts.size > 0 && !expandable;
  const tap = expandable ? onPress : full ? () => setFull(false) : canGrow ? () => setFull(true) : onPress;
  const card = (
    <Pressable
      onPress={drag.press(tap)}
      onPressIn={drag.pressIn}
      onPressOut={drag.pressOut}
      accessibilityHint={[
        expandable ? t(open ? 'Tippen klappt die Karte zu' : 'Tippen klappt die Karte auf') : full ? t('Tippen kürzt die Karte wieder') : canGrow ? t('Tippen zeigt die ganze Karte') : onPress ? t(pressHint ?? 'Tippen öffnet das Menü') : '',
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
      accessibilityState={expandable ? { expanded: !!open } : undefined}
      style={[styles.card, open && styles.cardOpen, drag.lifted && styles.cardLifted, { backgroundColor: bg }]}
    >
      {/* Kater nicht mehr auf der Karte, er spricht über dem Stapel (Daria, 2026-11-28: „Wir nehmen den Kater erstmal
          raus aus der Karte“) */}
      <FullCard.Provider value={fullCard}>
      <View style={styles.cardBody}>
        <View style={styles.head}>{head}</View>
        {children ? <View style={styles.cardRest}>{children}</View> : null}
      </View>
      </FullCard.Provider>
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
  onUndo,
  onSkip,
  onUndoSkip,
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
  /** Haken von heute zurücknehmen (Daria, 2026-11-18) */
  onUndo?: () => void;
  /** Einmal aussetzen und zurücknehmen (Daria, 2026-11-27, „Skip one“) */
  onSkip?: () => void;
  onUndoSkip?: () => void;
}) {
  const goal = goalOf(r);
  const planned = plannedGoalOf(r);
  const done = Math.min(r.doneThisWeek, goal);
  // Ausgegraut: ausgesetzt oder diese Woche nicht mehr zu schaffen (Daria, 2026-11-27). Sie stehen links, die Tage,
  // die noch vor einem liegen, rechts (Daria, 2026-11-28): grau, erledigt, offen.
  const greyed = Math.min(planned - done, planned - goal + outOfReachOf(r));
  const resting = r.doneToday || !!r.skippedToday || r.doneThisWeek >= goal;
  // „Aussetzen“ steht als Knopf statt „Aufgeben“ (Daria, 2026-11-27); Aufgeben wandert dann ins Menü
  const skip = onSkip && canSkip(r) ? onSkip : undefined;
  // Fortschritt neben dem Kater statt darunter: Die Karte wird kompakter, wo der Platz reicht (Daria, 2026-11-27)
  const label = t('{done} von {goal} diese Woche', { done, goal });
  const progress =
    planned > 1 ? (
      <>
        <Text style={styles.sub}>{label}</Text>
        <View style={styles.bar} accessible accessibilityLabel={label}>
          {Array.from({ length: planned }, (_, i) => (
            <Segment key={i} state={i < greyed ? 'greyed' : i < greyed + done ? 'done' : 'open'} />
          ))}
        </View>
      </>
    ) : null;
  // Einmalig und erledigt: kommt nicht wieder, also löschen statt abbrechen oder aufgeben (Daria, 2026-11-13)
  const finished = resting && !!r.onDate;
  const menu = useRef<(() => void) | null>(null);
  const items = menuItems({
    edit: onEdit,
    copy: onCopy,
    undo: r.doneToday ? onUndo : undefined,
    undoSkip: r.skippedToday ? onUndoSkip : undefined,
    later: resting ? undefined : onLater,
    giveUp: (resting || skip) && !finished ? onGiveUp : undefined,
    end: finished ? undefined : { label: 'Das hier abbrechen', run: onCancel },
    remove: resting ? onDelete : undefined,
  });
  const open = useExpanded(r.id);
  return (
    <Card
      bg={MUSTARD}
      onPress={() => setExpandedCard(open ? null : r.id)}
      open={open}
      tiltKey={r.id}
      urgent={urgent}
      onDragRight={resting ? undefined : onDone}
      onDragLeft={finished ? (onDragDelete ?? onDelete) : (onDragCancel ?? onCancel)}
      leftLabel={finished ? 'Löschen' : 'Abbrechen'}
      leftTone={finished ? 'delete' : 'end'}
      onDragUp={resting ? undefined : onLater}
      head={
        <>
          <CardHead meta={r.onDate ? whenText(r) : goalText(r)} title={capitalize(r.want)} />
          {progress}
        </>
      }
    >
      {open ? <TaskDetail r={r} /> : null}
      <ReminderExtrasRow place={r.place} phone={r.phone} link={r.link} ink={INK} />
      {/* Erledigt, Aussetzen bzw. Aufgeben und im Menü „Das hier abbrechen“ (Daria, 2026-11-13, Aussetzen 2026-11-27).
          Buttons mit festem Abstand beieinander, nur „•••“ rechts (Daria, 2026-11-13) */}
      {resting ? (
        <View style={styles.actions}>
          {r.doneToday ? (
            <DoneState label="Heute erledigt" onUndo={onUndo} />
          ) : r.skippedToday ? (
            <DoneState label="Heute ausgesetzt" onUndo={onUndoSkip} />
          ) : (
            <Text style={styles.state}>{goal === 0 ? 'Diese Woche ausgesetzt' : 'Ziel erreicht'}</Text>
          )}
          <ManageButton dots={INK} style={styles.more} label="Mehr zu dieser Aufgabe" openRef={menu} items={items} />
        </View>
      ) : (
        <View style={styles.actions}>
          {skip ? <HandButton label="Aussetzen" onPress={skip} /> : <HandButton label="Aufgeben" onPress={onGiveUp} />}
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
  onUndo,
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
  /** Haken von heute zurücknehmen (Daria, 2026-11-18) */
  onUndo?: () => void;
}) {
  // Jede Karte mit „•••“ (Daria, 2026-11-13); dasselbe Menü öffnet ein Tippen auf die Karte
  const menu = useRef<(() => void) | null>(null);
  const items = menuItems({
    edit: onEdit,
    copy: onCopy,
    undo: r.doneToday ? onUndo : undefined,
    later: r.doneToday ? undefined : onLater,
    end: r.doneToday ? undefined : { label: 'Absagen', run: onEnd },
    remove: r.doneToday ? onDelete : undefined,
  });
  const more = <ManageButton dots={INK} style={styles.more} label="Mehr zu diesem Termin" openRef={menu} items={items} />;
  const open = useExpanded(r.id);
  return (
    <Card
      bg={bg}
      onPress={() => setExpandedCard(open ? null : r.id)}
      open={open}
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
      {open ? <EventDetail r={r} onEdit={onEdit} /> : null}
      {r.doneToday ? (
        <View style={styles.actions}>
          <DoneState label="Erledigt" onUndo={onUndo} />
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

/** Ist diese Karte ausgeklappt? Verschwindet sie (erledigt, anderer Tag), klappt sie mit zu. */
function useExpanded(key: string): boolean {
  const open = useExpandedCard() === key;
  useEffect(
    () => () => {
      // Nur zuklappen, wenn nicht inzwischen eine andere Karte offen ist
      if (getExpandedCard() === key) setExpandedCard(null);
    },
    [key],
  );
  return open;
}

/**
 * Ausgeklappte Aufgabe (Daria, 2026-11-28): Der Kater spricht auf der Karte statt über dem Kalender, darunter die Woche
 * Tag für Tag und was sich daraus ergibt.
 */
function TaskDetail({ r }: { r: Reminder }) {
  const [week, setWeek] = useState<{ done: Set<string>; skipped: Set<string> } | null>(null);
  useEffect(() => {
    if (r.onDate) return;
    let live = true;
    loadReminderWeek(r.id).then((w) => live && setWeek(w), () => {});
    return () => {
      live = false;
    };
  }, [r.id, r.onDate, r.doneThisWeek, r.skippedThisWeek]);
  const days = r.onDate ? [] : weekBreakdown(r, week?.done ?? new Set(), week?.skipped ?? new Set());
  const count = (s: WeekDayState) => days.filter((d) => d.state === s).length;
  const goal = goalOf(r);
  const done = Math.min(r.doneThisWeek, goal);
  const out = outOfReachOf(r);
  const open = Math.max(0, goal - done - out);
  const parts = [
    done && t('{n} erledigt', { n: done }),
    count('skipped') && t('{n} ausgesetzt', { n: count('skipped') }),
    r.weekdays?.length && count('missed') ? t('{n} verpasst', { n: count('missed') }) : 0,
    // Bei festen Tagen sind die verpassten Tage genau das, was nicht mehr zu schaffen ist: nur einmal nennen
    !r.weekdays?.length && out ? t('{n} nicht mehr zu schaffen', { n: out }) : 0,
    open && t('{n} noch offen', { n: open }),
  ].filter(Boolean);
  return (
    <View style={styles.detail}>
      <View style={styles.detailKater}>
        <KaterCircle size={40} />
        <Text style={styles.detailKaterText}>{katerLine(r)}</Text>
      </View>
      {days.length ? (
        <View style={styles.detailWeek}>
          <View style={styles.week} accessible accessibilityLabel={parts.join(', ')}>
            {days.map((d) => (
              <View key={d.day} style={styles.weekDay}>
                <Text noTranslate style={styles.weekLabel}>
                  {weekdayShort(d.weekday)}
                </Text>
                <WeekDot state={d.state} />
              </View>
            ))}
          </View>
          {parts.length ? <Text style={styles.sub}>{parts.join(' · ')}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

/** Ein Tag der Woche: erledigt gefüllt mit Haken, ausgesetzt grau mit Strich, verpasst grau mit Kreuz, heute dick umrandet */
function WeekDot({ state }: { state: WeekDayState }) {
  const icon: IconName | null = state === 'done' ? 'check' : state === 'missed' ? 'close' : null;
  return (
    <View
      style={[
        styles.weekDot,
        state === 'done' && styles.weekDotDone,
        (state === 'skipped' || state === 'missed') && styles.weekDotGrey,
        state === 'today' && styles.weekDotToday,
        state === 'free' && styles.weekDotFree,
      ]}
    >
      {icon ? <Icon name={icon} size={12} color={state === 'done' ? MUSTARD : INK_SOFT} /> : null}
      {state === 'skipped' ? <View style={styles.weekSkip} /> : null}
    </View>
  );
}

/**
 * Ausgeklappter Termin (Daria, 2026-11-28: „Klicke ich auf einen Termin, möchte ich Details sehen und eventuell Details
 * hinzufügen“): Beschreibung und ein Knopf, der sie ergänzt. Ort, Telefon und Link stehen schon auf der Karte.
 */
function EventDetail({ r, onEdit }: { r: Reminder; onEdit: () => void }) {
  const has = !!(r.description || r.place || r.phone || r.link);
  return (
    <View style={styles.detail}>
      {r.description ? <Text noTranslate style={styles.detailText}>{r.description}</Text> : null}
      <View style={styles.actions}>
        <HandButton label={has ? 'Details bearbeiten' : 'Details hinzufügen'} icon={has ? undefined : 'plus'} onPress={onEdit} />
      </View>
    </View>
  );
}

/**
 * Ein Strich im Wochenbalken (Daria, 2026-11-27): offen als Umriss, erledigt gefüllt (füllt sich beim Erledigen von
 * links), ausgegraut, wenn ausgesetzt oder diese Woche nicht mehr zu schaffen.
 */
function Segment({ state }: { state: 'open' | 'done' | 'greyed' }) {
  const reduce = useReduceMotion();
  const fill = useRef(new Animated.Value(state === 'done' ? 1 : 0)).current;
  const grow = useRef(new Animated.Value(1)).current;
  const was = useRef(state);
  useEffect(() => {
    const before = was.current;
    was.current = state;
    if (state !== 'done' || before === 'done' || reduce) {
      fill.setValue(state === 'done' ? 1 : 0);
      return;
    }
    // Gerade erledigt (Daria, 2026-11-27): Die leere Pille wächst, die anderen rücken zur Seite. Dann läuft sie allmählich
    // von links voll („das allmähliche ANLAUFEN“), danach gleichen sich alle wieder an.
    Animated.sequence([
      Animated.timing(grow, { toValue: 2.2, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(fill, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(grow, { toValue: 1, duration: 450, delay: 150, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
    ]).start();
  }, [state, reduce, fill, grow]);
  if (state === 'greyed') return <View style={[styles.segment, styles.segmentGreyed]} />;
  return (
    <Animated.View style={[styles.segment, { flexGrow: grow }]}>
      <Animated.View style={[styles.segmentFill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </Animated.View>
  );
}

/**
 * Menü jeder eigenen Karte in fester Reihenfolge (Daria, 2026-11-13, „Check consistency“): Bearbeiten, Kopie
 * erstellen, Haken bzw. Aussetzen zurücknehmen oder Später, Aufgeben, Abbrechen bzw. Absagen, Löschen. Es steht nur, was
 * zum Zustand passt: Später nur offen, Haken zurücknehmen und Löschen nur erledigt (seit 2026-11-18), Aufgeben im Menü,
 * sobald der Knopf „Aussetzen“ heißt oder die Karte ruht (seit 2026-11-27).
 */
function menuItems(a: {
  edit?: () => void;
  copy?: () => void;
  undo?: () => void;
  undoSkip?: () => void;
  later?: () => void;
  giveUp?: () => void;
  end?: { label: string; run: () => void };
  remove?: () => void;
}) {
  return [
    a.edit && { label: 'Bearbeiten', onPress: a.edit },
    a.copy && { label: 'Kopie erstellen', onPress: a.copy },
    a.undo && { label: 'Haken zurücknehmen', onPress: a.undo },
    a.undoSkip && { label: 'Aussetzen zurücknehmen', onPress: a.undoSkip },
    a.later && { label: 'Später', onPress: a.later },
    a.giveUp && { label: 'Aufgeben', onPress: a.giveUp },
    a.end && { label: a.end.label, onPress: a.end.run },
    a.remove && { label: 'Löschen', onPress: a.remove },
  ].filter((x): x is { label: string; onPress: () => void } => !!x);
}

/**
 * „Heute erledigt“ bzw. „Erledigt“ (Daria, 2026-11-18, „Untick“): Sieht aus wie bisher, ein Tippen nimmt den Haken von
 * heute zurück. Für Vertipper; dasselbe steht im Menü als „Haken zurücknehmen“.
 */
function DoneState({ label, onUndo }: { label: string; onUndo?: () => void }) {
  const hint = useTexts()('Tippen nimmt den Haken zurück');
  if (!onUndo) return <Text style={styles.state}>{label}</Text>;
  return (
    <Pressable onPress={onUndo} accessibilityRole="button" accessibilityHint={hint} hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
      <Text style={styles.state}>{label}</Text>
    </Pressable>
  );
}

/**
 * Zeit und Titel einer Karte. Kein eigenes Tippziel mehr (Daria, 2026-11-13): Halten hebt die Karte an, auch auf dem
 * Titel; Tippen öffnet das Menü, dort steht „Bearbeiten“.
 */
/** Zeit und Titel. Meldet seine Höhe an den Stapel: So weit schaut die Karte aufgefächert heraus (Daria, 2026-11-28) */
function CardHead({ meta, title, struck = false }: { meta: string; title: string; struck?: boolean }) {
  const report = useContext(StackHead);
  return (
    <View style={styles.head} onLayout={(e) => report?.(e.nativeEvent.layout.height)}>
      <Text style={styles.meta}>{meta}</Text>
      <ClampText noTranslate style={[styles.title, struck && styles.struck]} lines={2} balance>
        {title}
      </ClampText>
    </View>
  );
}

/**
 * Termin aus einem verbundenen Kalender. Ausblenden (Daria, 2026-11-14): Tippen öffnet das Menü mit „Ausblenden“,
 * nach links ziehen blendet ohne Rückfrage aus. Im eigenen Kalender bleibt der Termin.
 * Absagen (Daria, 2026-11-25): Nur bei Buchungen aus Cal.com und nur, solange der Termin nicht vorbei ist. Die Absage
 * läuft auf der Absageseite von Cal.com, denn nur dort wird die Buchung storniert und die andere Seite bekommt eine
 * Mail. KiezCoins liest den Kalender nur und blendet den Termin nicht selbst aus: Bricht man bei Cal.com ab, bleibt er.
 */
export function CalendarCard({ event: e }: { event: CalendarEvent }) {
  const when = `${dayName(eventDate(e))} ${e.allDay ? t('ganztägig') : t('um {time}', { time: eventTime(e.start) })}`;
  const menu = useRef<(() => void) | null>(null);
  const hide = () => hideEvent(e);
  const booking = e.calBooking && canCancel(e) ? e.calBooking : undefined;
  const cancel = () => booking && confirmCalCancel(e, booking);
  const items = [...(booking ? [{ label: 'Absagen', onPress: cancel }] : []), { label: 'Ausblenden', onPress: hide }];
  return (
    <Card
      bg={OLIVE}
      tiltKey={e.id}
      onPress={() => menu.current?.()}
      onDragLeft={hide}
      leftLabel="Ausblenden"
      head={<CardHead meta={when} title={e.title} />}
    >
      <View style={styles.actions}>
        {/* Ohne Knöpfe daneben braucht der Kalendername keine Knopfhöhe (Daria, 2026-11-27: „Wieder viel Platz“) */}
        <Text noTranslate style={[styles.state, styles.stateQuiet]}>
          {e.calendar || t('Aus Deinem Kalender')}
        </Text>
        <ManageButton dots={INK} style={styles.more} label="Mehr zu diesem Termin" openRef={menu} items={items} />
      </View>
    </Card>
  );
}

/**
 * Rückfrage vor dem Wechsel zu Cal.com (Daria, 2026-11-25): sagt, wo abgesagt wird und wer davon erfährt. Unter 24
 * Stunden kommt ein Satz dazu, dass die Mail zu spät ankommen kann.
 */
function confirmCalCancel(e: CalendarEvent, booking: string) {
  const soon = shortNoticeKind(e);
  const minutes = minutesUntil(e) ?? 0;
  const lead = t('Abgesagt wird bei Cal.com, dort wurde der Termin gebucht. Cal.com schreibt allen Gästen eine Mail und nimmt den Termin aus Deinem Kalender. Hier verschwindet er, sobald Dein Kalender das meldet.');
  const late =
    soon === 'running'
      ? t('Der Termin läuft schon. Die Mail kommt vielleicht zu spät an, sag am besten auch direkt Bescheid.')
      : soon === 'soon'
        ? minutes < 60
          ? t('Der Termin beginnt in {n} Minuten. Die Mail kommt vielleicht zu spät an, sag am besten auch direkt Bescheid.', { n: String(minutes) })
          : t('Der Termin beginnt {when}. Die Mail kommt vielleicht zu spät an, sag am besten auch direkt Bescheid.', {
              when: `${dayName(eventDate(e)).toLowerCase()} ${t('um {time}', { time: eventTime(e.start) })}`,
            })
        : '';
  Alert.alert(t('Termin absagen?'), late ? `${lead}\n\n${late}` : lead, [
    { text: t('Zurück'), style: 'cancel' },
    {
      text: t('Weiter zu Cal.com'),
      onPress: () =>
        Linking.openURL(calCancelUrl(booking)).catch(() =>
          Alert.alert(t('Hat nicht geklappt'), t('Cal.com ließ sich gerade nicht öffnen.')),
        ),
    },
  ]);
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
      bg={SHOWCASE}
      tiltKey={`s${e.id}`}
      head={<CardHead meta={e.cancelled ? t('Abgesagt') : eventWhen(e)} title={e.title} struck={e.cancelled} />}
    >
      <ClampText noTranslate style={styles.sub} lines={1}>
        {e.location ? `${e.showcase} · ${e.location}` : e.showcase}
      </ClampText>
      <View style={styles.actions}>
        <HandButton label="Entfernen" onPress={remove} disabled={busy} />
        {/* Genau sagen, was passiert (Daria, 2026-11-13): im Browser eine Kalenderdatei, in der
            Android-App der Kalender des Handys */}
        {e.cancelled ? null : <HandButton label={Platform.OS === 'web' ? 'ICS exportieren' : 'In Handykalender'} onPress={toCalendar} filled bg={SHOWCASE} />}
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
  tone,
  icon,
  disabled,
}: {
  label: string;
  onPress: () => void;
  filled?: boolean;
  bg?: string;
  /** Rand und Schrift ohne Füllung in dieser Farbe statt Tinte (zweitrangige Knöpfe im Schaufenster) */
  tone?: string;
  /** Icon vor dem Text, z. B. Haken bei „Gemerkt“ (Daria, 2026-11-17) */
  icon?: IconName;
  disabled?: boolean;
}) {
  const label = useTexts()(original);
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
      style={({ pressed }) => [styles.hand, filled && styles.handFilled, (pressed || disabled) && styles.pressed]}
    >
      {box ? (
        <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path
            d={handShapePath(box.w, box.h, filled ? 0 : 1)}
            fill={filled ? INK : 'none'}
            stroke={filled ? undefined : (tone ?? INK)}
            strokeWidth={filled ? 0 : 1.4}
          />
        </Svg>
      ) : null}
      <View style={styles.handRow}>
        {icon ? <Icon name={icon} size={14} color={filled ? bg : (tone ?? INK)} /> : null}
        <Text noTranslate style={[styles.handLabel, { color: filled ? bg : (tone ?? INK) }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Kalender (Daria, 2026-11-12, nach Vorlage): runde Tage, erledigte in Senf, ausgefallene schraffiert, heute mit Ring.
 * Standardmäßig eingeklappt auf die laufende Woche; ein Tipp auf den Monat klappt ihn auf.
 */
/** Kalender im Feed-Kopf, mit den Daten, die die Routine gerade zeigt (Daria, 2026-11-14) */
