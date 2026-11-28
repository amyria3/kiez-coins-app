import { StyleSheet } from 'react-native';

import { handDrawn } from '../../theme/look';
import { color, font, radius, space, text } from '../../theme/tokens';
import { DAY, INK, INK_SOFT, INK_TRACK, MUSTARD } from './constants';

export const styles = StyleSheet.create({
  calEnded: { ...text.bodySm, color: color.text.secondary, textAlign: 'right' },
  // Plus bündig mit „Fr. 27.11.“ darüber (das Icon hat innen etwas Rand), Abstand wie zwischen Kalender und Tageszeile
  dayCreate: { flexDirection: 'row', alignItems: 'center', gap: space[6], alignSelf: 'flex-start', marginLeft: -3, marginTop: -space[2] },
  dayCreateText: { ...text.label },
  dayBar: { ...text.bodySm, marginTop: space[4], color: color.text.secondary },
  group: { gap: space[12] },
  groupHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space[12],
  },
  groupTitle: {
    ...text.settingsHeading,
    color: color.text.primary,
  },
  groupCount: {
    ...text.bodyLarge,
    color: color.text.secondary,
  },
  card: {
    // Weniger rund (Daria, 2026-11-12): vorher 30, dann 16, jetzt Maß aller Karten (2026-11-13)
    borderRadius: radius.md,
    padding: 14,
    gap: space[6],
    ...(color.routine.cardLine ? { borderWidth: 1, borderColor: color.routine.cardLine } : null),
    ...(color.routine.cardRaised
      ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }
      : null),
  },
  cardBody: { gap: space[6] },
  cardRest: { gap: space[6] },
  head: { gap: space[2] },
  meta: {
    ...text.labelSm,
    color: INK_SOFT,
  },
  title: {
    ...text.listTitle,
    color: INK,
  },
  struck: { textDecorationLine: 'line-through' },
  sub: {
    ...text.bodySm,
    color: INK_SOFT,
  },
  state: {
    ...text.label,
    color: INK_SOFT,
    paddingVertical: 11,
  },
  stateQuiet: { paddingVertical: 0 },
  bar: { flexDirection: 'row', gap: space[4], marginTop: space[4] },
  // Offen als Umriss, erledigt gefüllt, ausgesetzt oder nicht mehr zu schaffen grau (Daria, 2026-11-27)
  segment: { flex: 1, flexBasis: 0, height: 4, borderRadius: 2, borderWidth: 1, borderColor: INK, overflow: 'hidden' },
  segmentFill: { height: '100%', backgroundColor: INK },
  segmentGreyed: { borderWidth: 0, backgroundColor: INK_TRACK },
  // Buttons mit festem Abstand beieinander; nur „•••“ rückt nach rechts (Daria, 2026-11-13)
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    marginTop: space[4],
  },
  more: { marginLeft: 'auto' },
  // Im Browser markiert Ziehen mit der Maus sonst den Text, und die Karte bleibt stehen
  swipe: { flex: 1, userSelect: 'none' },
  // Angehoben liegt die Karte über den anderen
  swipeLifted: { zIndex: 2, elevation: 8 },
  aside: { overflow: 'hidden' },
  dragFace: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: radius.md, overflow: 'hidden' },
  dragFaceLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', paddingHorizontal: space[24] },
  dragFaceLabel: { alignItems: 'center', gap: space[4] },
  dragFaceText: { ...text.listTitle },
  cardLifted: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  hand: {
    height: 34,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[16],
  },
  // Schmaler als vorher (124), damit die drei Punkte daneben passen
  handFilled: { minWidth: 108 },
  handLabel: { ...text.label },
  handRow: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  pressed: { opacity: 0.7 },
  // Derselbe Abstand wie zwischen den Gruppen (32, Daria, 2026-11-14)
  cal: { gap: space[8] },
  calHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space[12],
  },
  // Die Tage sind 88 % ihrer Spalte breit; um 3 pt breiter, damit die Kreise links und rechts bündig mit Monat und
  // Tageszeile stehen (Daria, 2026-11-14: „Padding angleichen“)
  calGrid: { marginHorizontal: -3 },
  // Blatt über der Liste: deckt die Woche darunter ab, unten rund mit Schatten (Daria, 2026-11-14)
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space[20],
    paddingTop: space[4],
    paddingBottom: space[16],
    backgroundColor: color.bg.screen,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  // Fläche unter dem Blatt bis zum unteren Rand: Antippen klappt den Monat zu
  panelBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, height: 4000 },
  // Abstand unter jeder Zeile statt Zeilenabstand, damit er beim Einklappen mitgeht
  calRow: { flexDirection: 'row', paddingBottom: space[6] },
  calRowClip: { overflow: 'hidden' },
  calWeekday: {
    ...text.small,
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: color.text.secondary,
  },
  calCell: { width: `${100 / 7}%`, alignItems: 'center' },
  calDay: {
    width: '88%',
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: DAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayDone: { backgroundColor: MUSTARD },
  calDayPicked: { borderWidth: 2, borderColor: color.accent.primary },
  calDayToday: { borderWidth: 1.5, borderColor: color.text.primary },
  calNum: {
    ...text.bodyLarge,
    color: color.text.primary,
  },
  calNumDone: { color: INK, fontFamily: font.medium },
  calNumMissed: { color: color.text.secondary, opacity: 0.6 },
});

/** Tagesstapel (Daria, 2026-11-28) */
export const stackStyles = StyleSheet.create({
  wrap: { gap: space[8] },
  // Platz für Neigung und Bogen, ohne dass etwas abgeschnitten wird
  stack: { position: 'relative', overflow: 'visible' },
  // Kräftiger Schatten unter jeder Karte, auch aufgefächert (Daria, 2026-11-28: „Mehr Schatten“). Auf hellem Grund
  // (Mono) nur ein Hauch, sonst wirkt er schmutzig (Daria, 2026-11-28: „Schatten zu aggressiv“).
  slot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderRadius: radius.md,
    userSelect: 'none',
    shadowColor: '#000',
    ...(handDrawn
      ? { shadowOpacity: 0.42, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }
      : { shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }),
  },
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.md },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[8] },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space[6], paddingVertical: space[6] },
  toggleText: { ...text.bodySm, color: color.text.secondary },
  count: { ...text.bodySm, color: color.text.secondary, fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.7 },
  head: { gap: space[8] },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  day: { ...text.settingsHeading, color: color.text.primary, flex: 1 },
  arrow: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg.surface },
  arrowOff: { opacity: 0.3 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space[6] },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.bg.surface },
  dotOn: { width: 20, backgroundColor: color.text.primary },
});
