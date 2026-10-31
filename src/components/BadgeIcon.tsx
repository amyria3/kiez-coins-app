import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { badgeMeta, badgeTitle, type BadgeKind } from '../data/badges';
import { color } from '../theme/tokens';

/**
 * Abzeichen als runde Kachel in seiner Farbe, Symbol dunkel darauf (Daria, 2026-10-31).
 * Unter 20 pt zeigt die App nur einen Farbpunkt. Die Symbole sind Platzhalter, bis Darias Zeichnungen da sind.
 * Jedes Symbol hat in der App nur diese eine Bedeutung.
 */
const INK = '#1F2123';
const svg = (inner: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

const ICONS: Record<BadgeKind, string> = {
  // Fernrohr: drei Segmente, zum Okular hin dünner, Glanzpunkt auf der Linse
  pionier: svg(
    `<g transform="rotate(-32 12 11)"><path d="M2.5 9.6h8.2v3.8H2.5z" fill="${INK}"/><path d="M10.7 10.1h4.6v2.8h-4.6z"/><path d="M15.3 10.6h3.6v1.8h-3.6z"/><circle cx="3.6" cy="11.5" r="0.9" fill="#FFFFFF" stroke="none"/></g><path d="M11.5 14.5l-3.2 6.5M11.5 14.5l3.2 6.5M11.5 14.5v6.5"/>`,
  ),
  // Flaschenpost
  lotse: svg(
    `<g transform="rotate(-40 12 12)"><path d="M9 8.5h6a2.2 2.2 0 0 1 2.2 2.2v8.1a2.2 2.2 0 0 1-2.2 2.2H9a2.2 2.2 0 0 1-2.2-2.2v-8.1A2.2 2.2 0 0 1 9 8.5z"/><path d="M10.4 8.5V5.8h3.2v2.7"/><path d="M10.2 2.8h3.6v2.6h-3.6z" fill="${INK}"/><path d="M9.6 12.6h4.8M9.6 15.4h3.6"/></g>`,
  ),
  // Steuerrad
  anfuehrer: svg(
    `<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.8" fill="${INK}"/><path d="M12 10.2V2.5M13.27 10.73l5.43-5.43M13.8 12h7.7M13.27 13.27l5.43 5.43M12 13.8v7.7M10.73 13.27l-5.43 5.43M10.2 12H2.5M10.73 10.73L5.3 5.3"/>`,
  ),
  // Anker
  seebaer: svg(
    `<circle cx="12" cy="4.6" r="1.9"/><path d="M12 6.5V20.5"/><path d="M8 9.6h8"/><path d="M4.4 13.6c0.4 4.2 3.7 6.9 7.6 6.9s7.2-2.7 7.6-6.9"/><path d="M2.8 15.2l1.6-1.6l1.6 1.6M18 15.2l1.6-1.6l1.6 1.6"/>`,
  ),
  // Seemannsknoten
  macher: svg(
    `<path d="M12 12c-2.6-3.4-7.4-3.4-7.4 0s4.8 3.4 7.4 0s7.4-3.4 7.4 0s-4.8 3.4-7.4 0z"/><path d="M4.6 12c0 0-1.8 3.6-2.1 6.5M19.4 12c0 0 1.8-3.6 2.1-6.5"/>`,
  ),
};

/** Kleinste Größe mit Symbol; darunter nur ein Farbpunkt */
export const BADGE_MIN = 20;

export function BadgeIcon({
  kind,
  size,
  number,
  muted = false,
}: {
  kind: BadgeKind;
  size: number;
  number?: number | null;
  /** Noch nicht erhalten: grau */
  muted?: boolean;
}) {
  const meta = badgeMeta(kind);
  const ring = size >= 40 ? Math.max(2, Math.round(size / 40)) : 2;
  const icon = Math.round(size * 0.62);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={badgeTitle(kind, number)}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: muted ? color.bg.surface : meta.color,
        borderWidth: ring,
        borderColor: color.bg.screen,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: muted ? 0.5 : 1,
      }}
    >
      {size >= BADGE_MIN ? <SvgXml xml={muted ? ICONS[kind].replaceAll(INK, color.text.secondary) : ICONS[kind]} width={icon} height={icon} /> : null}
    </View>
  );
}
