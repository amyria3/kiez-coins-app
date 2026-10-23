// Linien-Icons für den Look „Instagram“ (Daria, 2026-10-23): weiche, runde Konturen auf 24 × 24 wie das heutige Instagram.
// Überarbeitet am 23.10.2026: Linie 2 wie bei Instagram (dort gemessen: 1,98 mit runden Enden und Ecken), alle Ecken mit
// großen Radien und keine Zusatzdetails (Daria: „nicht rund genug, nicht minimalistisch genug“).
// Eigene Zeichnungen.
// Fehlt ein Name hier, zeigt Icon.tsx Darias Icon aus svgs.ts.
import type { IconName } from './svgs';
import { useAppDimensions } from '../../theme/layout';

type Svg = { width: number; height: number; svg: (c: string, filled?: boolean, stroke?: number) => string };

/**
 * Maße wie in Darias Mockups „Vorher-Nachher“ (24.10.2026): Alle Hauptsymbole sind gleich groß, 24 pt bei 360 pt
 * Breite, und haben dieselbe Linie, 2 auf 24 (ein Zwölftel der Größe, wie Instagram mit 1,98).
 * Die Größe wächst mit der Breite der App, damit die Icons im Verhältnis zum Feed gleich bleiben.
 */
export const LINE = 2;
/** Aktive Icons in der Leiste: kräftiger */
export const LINE_STRONG = 2.6;
/** Kleinste sichtbare Linie in pt, damit kleine Icons (Pfeile, Plus im Chip) nicht dünner wirken */
const MIN_PT = 1.5;

/** Größe der Hauptsymbole in pt: 24 bei 360 pt Breite, mit der Breite wachsend, höchstens 30 */
export const iconPtFor = (width: number) => Math.max(24, Math.min(30, Math.round((width * 24) / 360)));
export function useIconPt() {
  return iconPtFor(useAppDimensions().width);
}

/** Linienstärke im viewBox (Breite `box`): ein Zwölftel der Größe, bei `px` Darstellungsgröße mindestens MIN_PT */
export const strokeFor = (px: number, pt = LINE, box = 24) => +Math.max((pt * box) / 24, (MIN_PT * box) / px).toFixed(3);

export const line = (c: string, body: string, stroke = LINE) =>
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="${c}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const icon = (body: (c: string, filled?: boolean) => string): Svg => ({
  width: 24,
  height: 24,
  svg: (c, filled, stroke) => line(c, body(c, filled), stroke),
});

/** Papierflieger mit runder Spitze und runden Ecken, wie Instagrams Teilen- und Nachrichten-Icon */
export const PLANE = `<path d="M5 9.2 18.6 4.2c1.6-.6 2.1-.1 1.5 1.5l-4.7 13.1c-.5 1.5-1.3 1.6-2 .1l-2.3-5c-.2-.4-.5-.7-.9-.9l-5.2-2.1c-1.4-.6-1.4-1.1 0-1.7z"/><path d="M11.1 13 15.4 8.7"/>`;
/** Kamera: Beitrag erstellen. Ohne Plus, damit das Icon so schlicht ist wie die übrigen. */
export const CAMERA_PLUS = `<rect x="3" y="6.5" width="18" height="13.5" rx="4.5"/><path d="M9 6.5l.6-1.2c.4-.8 1.1-1.3 2-1.3h.8c.9 0 1.6.5 2 1.3l.6 1.2"/><circle cx="12" cy="13.2" r="3.4"/>`;
/** Haus mit runden Ecken */
export const HOME = `<path d="M4.5 10.6c0-.9.4-1.7 1.1-2.2l5-3.9a2.3 2.3 0 0 1 2.8 0l5 3.9c.7.5 1.1 1.3 1.1 2.2v7.6a2.3 2.3 0 0 1-2.3 2.3h-2.4v-4.7a2.8 2.8 0 0 0-5.6 0v4.7H6.8a2.3 2.3 0 0 1-2.3-2.3z"/>`;
/** Zwei Personen: Gruppen und Freund:innen */
export const PEOPLE = `<circle cx="9" cy="8.3" r="3.4"/><path d="M3 19.6c.5-3.2 3-5.2 6-5.2s5.5 2 6 5.2"/><path d="M15.4 5.2a3.3 3.3 0 0 1 0 6.3M17.6 14.6c1.8.8 3 2.5 3.4 5"/>`;

export const instagramSvgs: Partial<Record<IconName, Svg>> = {
  heart: icon(
    (c, filled) =>
      `<path d="M16.8 3.9c-2 0-3.6 1.1-4.8 2.8-1.2-1.7-2.8-2.8-4.8-2.8C4.3 3.9 2.3 6.2 2.3 9c0 5.6 7.6 10.2 9.1 11 .4.2.8.2 1.2 0 1.5-.8 9.1-5.4 9.1-11 0-2.8-2-5.1-4.9-5.1z"${filled ? ` fill="${c}"` : ''}/>`,
  ),
  comment: icon(() => `<path d="M20.7 16.3A9.1 9.1 0 1 0 17 20l3.4.9c.4.1.7-.2.6-.6z"/>`),
  send: icon(() => PLANE),
  camera: icon(() => CAMERA_PLUS),
  // Feed: Haus
  'map-pin': icon(() => HOME),
  burger: icon(() => `<path d="M4 6.6h16M4 12h16M4 17.4h16"/>`),
  // Chats: Papierflieger wie Instagrams Nachrichten
  message: icon(() => PLANE),
  // Zahnrad mit acht runden Zähnen, als glatte Kurve gezeichnet
  settings: icon(() => `<circle cx="12" cy="12" r="3"/><path d="M18.86 10.61C19.41 11.07 20.75 10.48 21.13 10.9C21.51 11.31 21.51 12.69 21.13 13.1C20.75 13.52 19.41 12.93 18.86 13.39C18.31 13.85 17.77 15.15 17.83 15.87C17.9 16.58 19.26 17.12 19.24 17.68C19.21 18.24 18.24 19.21 17.68 19.24C17.12 19.26 16.58 17.9 15.87 17.83C15.15 17.77 13.85 18.31 13.39 18.86C12.93 19.41 13.52 20.75 13.1 21.13C12.69 21.51 11.31 21.51 10.9 21.13C10.48 20.75 11.07 19.41 10.61 18.86C10.15 18.31 8.85 17.77 8.13 17.83C7.42 17.9 6.88 19.26 6.32 19.24C5.76 19.21 4.79 18.24 4.76 17.68C4.74 17.12 6.1 16.58 6.17 15.87C6.23 15.15 5.69 13.85 5.14 13.39C4.59 12.93 3.25 13.52 2.87 13.1C2.49 12.69 2.49 11.31 2.87 10.9C3.25 10.48 4.59 11.07 5.14 10.61C5.69 10.15 6.23 8.85 6.17 8.13C6.1 7.42 4.74 6.88 4.76 6.32C4.79 5.76 5.76 4.79 6.32 4.76C6.88 4.74 7.42 6.1 8.13 6.17C8.85 6.23 10.15 5.69 10.61 5.14C11.07 4.59 10.48 3.25 10.9 2.87C11.31 2.49 12.69 2.49 13.1 2.87C13.52 3.25 12.93 4.59 13.39 5.14C13.85 5.69 15.15 6.23 15.87 6.17C16.58 6.1 17.12 4.74 17.68 4.76C18.24 4.79 19.21 5.76 19.24 6.32C19.26 6.88 17.9 7.42 17.83 8.13C17.77 8.85 18.31 10.15 18.86 10.61z"/>`),
  'chevron-left': icon(() => `<path d="M15 4.5 7.5 12l7.5 7.5"/>`),
  'chevron-right': icon(() => `<path d="M9 4.5 16.5 12 9 19.5"/>`),
  close: icon(() => `<path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/>`),
  check: icon(() => `<path d="M4.5 12.5l5 5L19.5 7"/>`),
  plus: icon(() => `<path d="M12 4.5v15M4.5 12h15"/>`),
  more: icon((c) => `<circle cx="5.5" cy="12" r="1.3" fill="${c}" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="${c}" stroke="none"/><circle cx="18.5" cy="12" r="1.3" fill="${c}" stroke="none"/>`),
  clock: icon(() => `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>`),
  info: icon((c) => `<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r="1.1" fill="${c}" stroke="none"/>`),
  flag: icon(() => `<path d="M5 21V4.8"/><path d="M5 4.8c3.5-2 6.5 1.9 10 0 1.2-.7 2.6-.5 3.5.2v8.2c-.9-.7-2.3-.9-3.5-.2-3.5 1.9-6.5-2-10 0"/>`),
  copy: icon(() => `<rect x="8.5" y="8.5" width="12" height="12" rx="3.5"/><path d="M15.5 8.5V6.5a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h2"/>`),
  eye: icon(() => `<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>`),
  // Deine Challenges: Raster wie das Profil-Raster
  ship: icon(() => `<rect x="3.5" y="3.5" width="7" height="7" rx="3"/><rect x="13.5" y="3.5" width="7" height="7" rx="3"/><rect x="3.5" y="13.5" width="7" height="7" rx="3"/><rect x="13.5" y="13.5" width="7" height="7" rx="3"/>`),
  // Gruppen: zwei Personen
  behausung: icon(() => PEOPLE),
  gift: icon(() => `<rect x="3.5" y="8" width="17" height="4" rx="1.8"/><path d="M5 12v6.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V12M12 8v12.5M12 8S10.5 3.5 7.8 4.6C6 5.4 7.2 8 12 8zm0 0s1.5-4.5 4.2-3.4C18 5.4 16.8 8 12 8z"/>`),
  'thumbs-up': icon(() => `<rect x="3.5" y="10.5" width="4" height="10" rx="1.5"/><path d="M7.5 11.2 10.6 4.6c.5-1 1.7-1.3 2.6-.7.6.4.9 1.2.7 1.9L13 9.5h5.3c1.4 0 2.4 1.3 2.1 2.6l-1.3 6.3c-.3 1.2-1.3 2.1-2.6 2.1H7.5"/>`),
};
