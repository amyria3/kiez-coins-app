import { StyleSheet } from 'react-native';

import { color, font, radius, space, text } from '../../theme/tokens';
import { DAY, GUTTER, INK, INK_SOFT, INK_TRACK, MUSTARD, UP_ROOM } from './constants';

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
  // Platz für Schräge, Anheben und Hochziehen: Die Reihe reicht oben unter die Überschrift und unten etwas weiter,
  // ohne dass sich die Abstände ändern. Eine scrollbare Reihe schneidet sonst ab (Daria, 2026-11-13: „overflow sichtbar“).
  rowScroll: { marginHorizontal: -GUTTER, marginTop: -UP_ROOM, marginBottom: -space[12], overflow: 'visible' },
  row: { paddingHorizontal: GUTTER, paddingTop: UP_ROOM, paddingBottom: space[12], gap: space[12] },
  card: {
    flex: 1,
    // Weniger rund (Daria, 2026-11-12): vorher 30, dann 16, jetzt Maß aller Karten (2026-11-13)
    borderRadius: radius.md,
    padding: 14,
    gap: space[6],
  },
  cardBody: { flex: 1, gap: space[6] },
  cardRest: { flex: 1, justifyContent: 'flex-end', gap: space[6] },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[12] },
  head: { flex: 1, gap: space[2] },
  // Platz für den Sticker, der links unter dem Kater herausragt
  // Kater und Sticker als Spalte: Der Sticker hat eigenen Platz und liegt höchstens auf dem Ring
  katerSide: { alignSelf: 'flex-start' },
  chip: {
    backgroundColor: color.bg.screen,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: space[4],
    zIndex: 1,
  },
  chipBelow: { marginTop: -5 },
  chipAbove: { marginBottom: -5 },
  chipText: {
    ...text.captionStrong,
    color: color.text.primary,
  },
  katerRing: {
    borderRadius: 23,
    borderWidth: 3,
    borderColor: color.bg.screen,
    overflow: 'hidden',
  },
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
  bar: { flexDirection: 'row', gap: space[4], marginVertical: space[2] },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: INK_TRACK },
  segmentDone: { backgroundColor: INK },
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
  pressed: { opacity: 0.7 },
  // Derselbe Abstand wie zwischen den Gruppen (32, Daria, 2026-11-14)
  create: {},
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
