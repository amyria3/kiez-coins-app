// Icons für den Look „Fashionable“: Phosphor Icons, Gewicht Regular (Daria, 24.10.2026), bis Font Awesome Pro bezahlt ist.
// Gefüllt (z. B. Herz bei „gefällt mir“) in Phosphor Fill. Lizenz: MIT (phosphoricons.com).
// Im Kiez-Look erscheinen sie nur dort, wo es kein handgezeichnetes Icon gibt (PhIcon).
// Fehlt ein Name hier, zeigt Icon.tsx Darias Icon aus svgs.ts.
import type { IconName } from './svgs';
import { useAppDimensions } from '../../theme/layout';
import { phosphorFill, phosphorRegular, type PhosphorName } from './phosphorSvgs';

type Svg = { width: number; height: number; svg: (c: string, filled?: boolean) => string };

/**
 * Maße wie in Darias Mockups „Vorher-Nachher“ (24.10.2026): Alle Hauptsymbole sind gleich groß, 24 pt bei 360 pt
 * Breite. Die Größe wächst mit der Breite der App, damit die Icons im Verhältnis zum Feed gleich bleiben.
 */
/** Größe der Hauptsymbole in pt: 24 bei 360 pt Breite, mit der Breite wachsend, höchstens 30 */
export const iconPtFor = (width: number) => Math.max(24, Math.min(30, Math.round((width * 24) / 360)));
export function useIconPt() {
  return iconPtFor(useAppDimensions().width);
}

/** Phosphor-Icon als SVG in Farbe `c`; `filled` nimmt die gefüllte Fassung, wo es sie gibt */
export function phXml(name: PhosphorName, c: string, filled = false) {
  const d = (filled && (phosphorFill as Partial<Record<PhosphorName, readonly string[]>>)[name]) || phosphorRegular[name];
  const paths = d.map((p) => `<path d="${p}"/>`).join('');
  return `<svg width="24" height="24" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" fill="${c}">${paths}</svg>`;
}

/** Icons, die nicht über einen IconName laufen (Leiste, Profil-Reiter, Konto) */
export const PH = {
  home: 'house',
  create: 'camera',
  chats: 'chats',
  menu: 'list',
  created: 'squares-four',
  accepted: 'check-circle',
  groups: 'users-three',
  friends: 'handshake',
  language: 'translate',
  look: 'palette',
  coins: 'coins',
  features: 'toggle-right',
  grammar: 'text-aa',
} satisfies Record<string, PhosphorName>;

const ph = (name: PhosphorName): Svg => ({ width: 24, height: 24, svg: (c, filled) => phXml(name, c, filled) });

/**
 * Regelwerk: jedes Icon eine Bedeutung. Kommentar = Sprechblase, Chats = zwei Sprechblasen,
 * Senden = Papierflieger, Ort = Stecknadel, Feed = Haus, Gruppen = Personen.
 */
export const fashionableSvgs: Partial<Record<IconName, Svg>> = {
  heart: ph('heart'),
  comment: ph('chat-circle'),
  send: ph('paper-plane-tilt'),
  camera: ph('camera'),
  'map-pin': ph('map-pin'),
  burger: ph('list'),
  message: ph('chats'),
  link: ph('link'),
  settings: ph('gear'),
  'chevron-left': ph('caret-left'),
  'chevron-right': ph('caret-right'),
  close: ph('x'),
  check: ph('check'),
  plus: ph('plus'),
  minus: ph('minus'),
  more: ph('dots-three'),
  clock: ph('clock'),
  info: ph('info'),
  flag: ph('flag'),
  copy: ph('copy'),
  eye: ph('eye'),
  // Deine Challenges: Raster
  ship: ph('squares-four'),
  // Gruppen: Personen
  behausung: ph('users-three'),
  gift: ph('gift'),
  'thumbs-up': ph('thumbs-up'),
  // Darias Icons vom 25.10.2026, im Fashionable Look als Phosphor
  hallo: ph('hand-waving'),
  'this-way': ph('arrow-right'),
  friends: ph('handshake'),
  look: ph('palette'),
  switch: ph('toggle-right'),
};
