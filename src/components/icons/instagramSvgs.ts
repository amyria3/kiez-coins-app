// Linien-Icons für den Look „Instagram“ (Daria, 2026-10-23): weiche, runde Konturen auf 24 × 24 wie das heutige Instagram.
// Überarbeitet am 23.10.2026: Linie 1,6 statt 1,8, Ecken als Bögen gezeichnet, keine spitzen Winkel mehr.
// Eigene Zeichnungen. Das Zahnrad folgt Feather Icons (MIT-Lizenz, https://feathericons.com).
// Fehlt ein Name hier, zeigt Icon.tsx Darias Icon aus svgs.ts.
import type { IconName } from './svgs';

type Svg = { width: number; height: number; svg: (c: string, filled?: boolean) => string };

/** Linienstärke aller Instagram-Icons in px auf 24 × 24 */
export const LINE = 1.6;

export const line = (c: string, body: string) =>
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="${c}" stroke-width="${LINE}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const icon = (body: (c: string, filled?: boolean) => string): Svg => ({ width: 24, height: 24, svg: (c, filled) => line(c, body(c, filled)) });

/** Papierflieger mit runder Spitze und runden Ecken, wie Instagrams Teilen- und Nachrichten-Icon */
export const PLANE = `<path d="M20.6 3.3 3.6 9.2c-.8.3-.9 1.4-.1 1.8l6.6 3.1c.2.1.3.2.4.4l3.1 6.6c.4.8 1.5.7 1.8-.1l5.9-17c.2-.5-.3-.9-.7-.7z"/><path d="M10.4 13.6 20.7 3.4"/>`;
/** Kamera mit Plus in der Linse: Beitrag erstellen */
export const CAMERA_PLUS = `<path d="M8.4 5.6 9.5 4.1c.3-.4.8-.6 1.3-.6h2.4c.5 0 1 .2 1.3.6l1.1 1.5h3a2.4 2.4 0 0 1 2.4 2.4v9.6a2.4 2.4 0 0 1-2.4 2.4H5.4A2.4 2.4 0 0 1 3 17.6V8a2.4 2.4 0 0 1 2.4-2.4z"/><circle cx="12" cy="12.6" r="4.1"/><path d="M12 10.9v3.4M10.3 12.6h3.4"/>`;
/** Haus mit runden Ecken */
export const HOME = `<path d="M3.8 10.4c0-.6.3-1.1.7-1.5l6.3-5c.7-.6 1.7-.6 2.4 0l6.3 5c.4.4.7.9.7 1.5v8.4a1.7 1.7 0 0 1-1.7 1.7h-3.2v-5.2a1.3 1.3 0 0 0-1.3-1.3h-2a1.3 1.3 0 0 0-1.3 1.3v5.2H5.5a1.7 1.7 0 0 1-1.7-1.7z"/>`;
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
  settings: icon(
    () =>
      `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
  ),
  'chevron-left': icon(() => `<path d="M15 4.5 7.5 12l7.5 7.5"/>`),
  'chevron-right': icon(() => `<path d="M9 4.5 16.5 12 9 19.5"/>`),
  close: icon(() => `<path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/>`),
  check: icon(() => `<path d="M4.5 12.5l5 5L19.5 7"/>`),
  plus: icon(() => `<path d="M12 4.5v15M4.5 12h15"/>`),
  more: icon((c) => `<circle cx="5.5" cy="12" r="1.3" fill="${c}" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="${c}" stroke="none"/><circle cx="18.5" cy="12" r="1.3" fill="${c}" stroke="none"/>`),
  clock: icon(() => `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>`),
  info: icon((c) => `<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r="1.1" fill="${c}" stroke="none"/>`),
  flag: icon(() => `<path d="M5 21V4"/><path d="M5 4h12l-2.5 4.5L17 13H5"/>`),
  copy: icon(() => `<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>`),
  eye: icon(() => `<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>`),
  // Deine Challenges: Raster wie das Profil-Raster
  ship: icon(() => `<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>`),
  // Gruppen: zwei Personen
  behausung: icon(() => PEOPLE),
  gift: icon(() => `<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5M12 8S10.5 3.5 7.8 4.6C6 5.4 7.2 8 12 8zm0 0s1.5-4.5 4.2-3.4C18 5.4 16.8 8 12 8z"/>`),
  'thumbs-up': icon(() => `<path d="M7.5 10.5v10h-3v-10zM7.5 10.5 11 3.5a2 2 0 0 1 2.8 2.2L13 9.5h5.6a2 2 0 0 1 2 2.4l-1.5 7a2 2 0 0 1-2 1.6H7.5"/>`),
};
