// Styles des Feeds (aus src/app/feed.tsx, 2026-11-15).
import { Platform, StyleSheet } from 'react-native';
import { color, space, text } from '../../theme/tokens';
import { COMPOSE_HEADER } from './feedConstants';

export const styles = StyleSheet.create({
  // Hinweis „Dein Post wurde verschoben.“ an der Stelle des Posts (Daria, 2026-11-16)
  movedNotice: { paddingHorizontal: space[16], paddingVertical: space[8] },
  loading: { alignItems: 'center', paddingVertical: space[48] },
  screen: { flex: 1, backgroundColor: color.bg.screen },
  flex: { flex: 1 },
  // Desktop: Umschalter schmaler als die Lesebreite, links bündig (Daria, 2026-11-28)
  desktopSwitch: { flexGrow: 0, flexBasis: 'auto', width: '100%', maxWidth: 460 },
  clip: { overflow: 'hidden' },
  // Etwas mehr Abstand zwischen den Posts (Daria, 2026-11-09)
  list: { gap: space[32] },
  listTop: { paddingTop: space[8] },
  listGrow: { flexGrow: 1 },
  // Unten etwas Luft über der Leiste, oben trennt schon der Abstand der Liste
  emptyFooter: { flex: 1, justifyContent: 'center', paddingBottom: space[12] },
  emptyState: { paddingTop: 0 },
  searchNote: { ...text.body, color: color.text.secondary, paddingHorizontal: space[16], paddingTop: space[8] },
  composeHeader: { height: COMPOSE_HEADER, flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: space[8] },
  composeLine: { ...text.title, flex: 1, color: color.text.primary },
  composeSheet: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  tabsRowJoined: { paddingTop: 0 },
  noBrowserPan: Platform.OS === 'web' ? ({ touchAction: 'none' } as object) : {},
  // Kopf liegt über der Liste, damit das Blatt mit dem Monat sie überdecken kann
  headerLayer: { zIndex: 10, elevation: 10 },
  monthLayer: { position: 'absolute', left: 0, right: 0, height: 0 },
  // Unten 24 plus 8 Abstand der Liste: 32 bis zur ersten Kartenreihe, wie zwischen den Gruppen (Daria, 2026-11-14)
  calendarSlot: { paddingHorizontal: space[20], paddingTop: space[4], paddingBottom: space[24], backgroundColor: color.bg.screen },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    backgroundColor: color.bg.screen,
    paddingTop: space[8],
    paddingBottom: space[8],
    paddingLeft: space[16],
  },
});
