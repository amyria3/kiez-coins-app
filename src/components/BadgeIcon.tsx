import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { badgeMeta, badgeTitle, type BadgeKind } from '../data/badges';
import { color } from '../theme/tokens';
import { KIEZ_BADGE_SVGS } from './icons/badgeSvgs';

/**
 * Abzeichen als runde Kachel in seiner Farbe, Symbol dunkel darauf (Daria, 2026-10-31).
 * Unter 20 pt zeigt die App nur einen Farbpunkt. Im Kiez-Look zeigen alle fünf Abzeichen Darias
 * Icons (Daria, 2026-11-02), der Fashionable Look noch die Platzhalter.
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
  // Angespannter Arm (Macher:in, Daria 2026-11-01): Faust oben, Bizeps, hochgekrempelter Ärmel rechts
  macher: svg(
    `<path d="M6.5 4.5c1.6-.9 3.6-.6 4.4.9.6 1.1.2 2.4-.6 3.1l-.6 4.2c1-.9 2.5-1.6 4.2-1.4 1.8.2 3 1.1 3.6 2.2"/><path d="M6.5 4.5c-1 .8-1.4 2.2-.9 3.4l.7 1.6-.9 7.5c-.1 1.3.8 2.2 2 2.2h7.8"/><path d="M17.5 13.5v6.2h3v-6.4h-3"/><path d="M8 6.8h2.4"/>`,
  ),
};

/** Farbe als Grau gleicher Helligkeit */
function grau(hex: string) {
  const h = hex.length === 4 ? hex.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3') : hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const v = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
    .toString(16)
    .padStart(2, '0');
  return `#${v}${v}${v}`;
}

/** Glanzlichter, die im hellen Kreis ausgespart sind und hell bleiben: Linse und Rohr des Fernrohrs (Daria, 2026-11-02) */
const GLANZ: Partial<Record<BadgeKind, string>> = {
  pionier: 'M110.80 61.15 109.90 61.15 108.30 60.25 106.80 59.05 105.35 57.50 102.45 53.30 101.25 51.30 99.75 48.60 97.15 43.20 95.45 39.00 93.85 34.30 93.45 32.00 93.65 30.70 94.35 28.90 94.85 28.10 95.80 27.35 96.40 27.35 97.60 27.85 99.75 29.50 100.55 30.60 103.05 33.30 103.55 34.30 105.75 37.30 107.15 39.50 108.35 43.30 109.55 45.80 110.15 48.40 110.55 51.70 110.85 52.90 110.85 54.20 111.25 57.00 111.25 60.30 111.05 60.90Z M72.60 47.15 72.35 47.10 72.35 46.80 72.85 45.40 73.15 43.80 73.75 42.20 75.85 38.10 77.75 35.60 78.20 35.25 78.45 35.90 78.35 37.50 77.75 41.50 77.35 42.30 76.45 43.50 73.60 46.35Z',
};

/** Fassung Default mit den Linien, der helle Kreis in der Farbe des Abzeichens (Daria, 2026-11-02) */
const farbig = new Map<string, string>();
function mitFarbe(kind: BadgeKind, xml: string, fill: string) {
  let out = farbig.get(kind);
  if (!out) {
    out = xml.replaceAll('#F0F0F0', fill);
    const glanz = GLANZ[kind];
    if (glanz) out = out.replace('</svg>', `<path d="${glanz}" fill="#F0F0F0"/></svg>`);
    farbig.set(kind, out);
  }
  return out;
}

/** Runde Farbfläche im Small-Icon: Rahmen (w × h) sowie Mitte und Radius des Kreises, aus badgeSvgs gemessen */
const FLAECHE_SMALL: Record<BadgeKind, { w: number; h: number; cx: number; cy: number; r: number }> = {
  pionier: { w: 128, h: 120, cx: 68, cy: 60, r: 60 },
  lotse: { w: 120, h: 120, cx: 55, cy: 55, r: 55 },
  anfuehrer: { w: 120, h: 120, cx: 60, cy: 60, r: 60 },
  seebaer: { w: 120, h: 120, cx: 60, cy: 60, r: 60 },
  macher: { w: 120, h: 121, cx: 69, cy: 51, r: 51 },
};

/** Breite des Rings am Avatar */
const RING = (size: number) => Math.max(2, Math.round(size * 0.07));

/** Kleinste Größe mit Symbol; darunter nur ein Farbpunkt */
export const BADGE_MIN = 20;

export function BadgeIcon({
  kind,
  size,
  number,
  muted = false,
  ring = false,
  lines = false,
  ringColor,
}: {
  kind: BadgeKind;
  size: number;
  number?: number | null;
  /** Noch nicht erhalten oder ausgeblendet: Darias Fassung Default mit den Linien */
  muted?: boolean;
  /** Schmaler Ring in der Farbe des Grunds um die Farbfläche, z. B. am Avatar (Daria, 2026-11-02) */
  ring?: boolean;
  /** Erhalten, in Listen: Fassung Default mit den Linien auf der Farbe des Abzeichens */
  lines?: boolean;
  /** Farbe des Rings, wenn der Avatar nicht auf dem Grund liegt, z. B. auf einer Karte */
  ringColor?: string;
}) {
  const meta = badgeMeta(kind);
  const own = KIEZ_BADGE_SVGS[kind];
  if (own) {
    // Darias Icon bringt Farbfläche und Symbol selbst mit; Small ragt unten rechts über die Fläche hinaus
    if (size < BADGE_MIN) {
      return (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={badgeTitle(kind, number)}
          style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: muted ? grau(own.color) : own.color }}
        />
      );
    }
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={badgeTitle(kind, number)}
        style={{ width: size, height: size }}
      >
        {ring && size < 80
          ? (() => {
              // Farbfläche in Small, je Abzeichen aus Darias Icon gemessen (Daria, 2026-11-05: Ring saß bei Pionier:in daneben)
              const f = FLAECHE_SMALL[kind];
              const scale = size / Math.max(f.w, f.h);
              const offX = (size - f.w * scale) / 2;
              const offY = (size - f.h * scale) / 2;
              const r = RING(size);
              return (
                <View
                  style={{
                    position: 'absolute',
                    left: offX + (f.cx - f.r) * scale - r,
                    top: offY + (f.cy - f.r) * scale - r,
                    width: f.r * 2 * scale + r * 2,
                    height: f.r * 2 * scale + r * 2,
                    borderRadius: size,
                    backgroundColor: ringColor ?? color.bg.screen,
                  }}
                />
              );
            })()
          : null}
        {/* Eigene Ebene über dem Ring: Im Web malt der Browser absolut gesetzte Elemente über die übrigen */}
        <View style={{ position: 'absolute', left: 0, top: 0 }}>
          {/* Offen oder ausgeblendet: Default mit Linien, hell. Erhalten in Listen: Default auf der Farbe des Abzeichens (Daria, 2026-11-02) */}
          <SvgXml xml={muted ? own.default : lines ? mitFarbe(kind, own.default, own.color) : size >= 80 ? own.default : own.small} width={size} height={size} />
        </View>
      </View>
    );
  }
  const tileRing = size >= 40 ? Math.max(2, Math.round(size / 40)) : 2;
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
        borderWidth: tileRing,
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
