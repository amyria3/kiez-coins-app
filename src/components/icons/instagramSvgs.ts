// Linien-Icons für den Look „Instagram“ (Daria, 2026-10-23): dünne, runde Konturen auf 24 × 24, wie bei Instagram.
// Eigene Zeichnungen. Das Zahnrad folgt Feather Icons (MIT-Lizenz, https://feathericons.com).
// Fehlt ein Name hier, zeigt Icon.tsx Darias Icon aus svgs.ts.
import type { IconName } from './svgs';

type Svg = { width: number; height: number; svg: (c: string, filled?: boolean) => string };

const line = (c: string, body: string) =>
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const icon = (body: (c: string, filled?: boolean) => string): Svg => ({ width: 24, height: 24, svg: (c, filled) => line(c, body(c, filled)) });

export const instagramSvgs: Partial<Record<IconName, Svg>> = {
  heart: icon(
    (c, filled) =>
      `<path d="M12 20.3s-7.6-4.5-9.3-9.3C1.5 7.6 3.6 4.3 7 4.3c2.2 0 3.7 1.3 5 3 1.3-1.7 2.8-3 5-3 3.4 0 5.5 3.3 4.3 6.7-1.7 4.8-9.3 9.3-9.3 9.3z"${filled ? ` fill="${c}"` : ''}/>`,
  ),
  comment: icon(() => `<path d="M20.6 12a8.6 8.6 0 0 1-12.7 7.6l-4.4 1.1 1.1-4.3A8.6 8.6 0 1 1 20.6 12z"/>`),
  send: icon(() => `<path d="M21.5 2.5 10.6 13.4"/><path d="M21.5 2.5 14.6 21l-4-7.6-7.6-4z"/>`),
  // Erstellen: Quadrat mit Plus wie „Neuer Beitrag“
  camera: icon(() => `<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/>`),
  // Feed: Haus
  'map-pin': icon(() => `<path d="M3.5 10.2 12 3.3l8.5 6.9V20a.9.9 0 0 1-.9.9h-4.9v-6.1H9.3v6.1H4.4a.9.9 0 0 1-.9-.9z"/>`),
  burger: icon(() => `<path d="M4 6.5h16M4 12h16M4 17.5h16"/>`),
  message: icon(() => `<path d="M4 4.5h16a1 1 0 0 1 1 1v10.2a1 1 0 0 1-1 1H9.2L4.8 20.4v-3.7H4a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1z"/><path d="M7.5 9.5h9M7.5 12.8h6"/>`),
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
  behausung: icon(() => `<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.8 6.5-5.8s5.9 2.2 6.5 5.8"/><path d="M15.5 5.3a3.5 3.5 0 0 1 0 6.4M18 14.6c2 .9 3.2 2.8 3.5 5.4"/>`),
  gift: icon(() => `<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5M12 8S10.5 3.5 7.8 4.6C6 5.4 7.2 8 12 8zm0 0s1.5-4.5 4.2-3.4C18 5.4 16.8 8 12 8z"/>`),
  'thumbs-up': icon(() => `<path d="M7.5 10.5v10h-3v-10zM7.5 10.5 11 3.5a2 2 0 0 1 2.8 2.2L13 9.5h5.6a2 2 0 0 1 2 2.4l-1.5 7a2 2 0 0 1-2 1.6H7.5"/>`),
};
