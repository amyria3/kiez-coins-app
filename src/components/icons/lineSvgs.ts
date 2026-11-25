// Linien-Icons für den Look Mono (Daria, 2026-11-25: „mit dem anderen Set an Icons“): Phosphor Icons, Gewicht Regular,
// gefüllt nur das Herz bei „gefällt mir“. Lizenz: MIT (phosphoricons.com). Grundlage ist das Set des alten Looks
// „Fashionable“ (Git-Tag `fashionable-archiv`), ergänzt um die Icons, die seitdem dazugekommen sind.
// Fehlt ein Name hier, zeigt Icon.tsx Darias Icon aus svgs.ts (z. B. der Kater als Marke).
import { phosphorFill, phosphorRegular, type PhosphorName } from './phosphorSvgs';
import { phXml } from './phosphor';
import type { IconName } from './svgs';

type LineSvg = (c: string, filled?: boolean) => string;

const ph = (name: PhosphorName): LineSvg => (c, filled) => phXml(name, c, filled);

/**
 * Doppelherz als Linie für den Feed (Daria, 27.10.2026, aus dem Fashionable-Look): vorn das Phosphor-Herz, dahinter
 * ein zweites, das eine Maske um das vordere Herz und rechts von dessen Mitte ausspart.
 */
const doubleHeartLine: LineSvg = (c) => {
  const [line] = phosphorRegular.heart;
  const [fill] = phosphorFill.heart;
  const back = 'translate(0 16) scale(0.88)';
  const front = 'translate(31 16) scale(0.88)';
  return (
    `<svg width="24" height="24" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><mask id="kc-doppelherz-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256">` +
    `<rect width="256" height="256" fill="white"/><rect x="112" width="144" height="256" fill="black"/>` +
    `<path d="${fill}" transform="${front}" fill="black" stroke="black" stroke-width="22" stroke-linejoin="round"/></mask></defs>` +
    `<g mask="url(#kc-doppelherz-mask)"><path d="${line}" transform="${back}" fill="${c}"/></g>` +
    `<path d="${line}" transform="${front}" fill="${c}"/></svg>`
  );
};

/** Jedes Icon eine Bedeutung, wie im Icon-Regelwerk. Kommentar = Sprechblase, Chats = zwei Sprechblasen. */
export const lineSvgs: Partial<Record<IconName, LineSvg>> = {
  heart: ph('heart'),
  feed: doubleHeartLine,
  comment: ph('chat-circle'),
  'comment-filled': ph('chat-circle'),
  'eye-filled': ph('eye'),
  send: ph('paper-plane-tilt'),
  camera: ph('camera'),
  'map-pin': ph('map-pin'),
  burger: ph('list'),
  message: ph('chats'),
  link: ph('link'),
  external: ph('arrow-square-out'),
  settings: ph('gear'),
  'chevron-left': ph('caret-left'),
  'chevron-right': ph('caret-right'),
  close: ph('x'),
  check: ph('check'),
  plus: ph('plus'),
  minus: ph('minus'),
  more: ph('dots-three'),
  'more-vertical': ph('dots-three-vertical'),
  'clock-filled': ph('clock'),
  'info-filled': ph('info'),
  copy: ph('copy'),
  language: ph('translate'),
  calendar: ph('calendar-blank'),
  // Deine Challenges: Raster
  ship: ph('squares-four'),
  // Gruppen: Personen
  behausung: ph('users-three'),
  // Challenge im Kiez: Baum wie in Darias Dorf
  village: ph('tree'),
  // We-Challenge: gemeinsam geschafft
  'wir-schaffen-das': ph('hands-clapping'),
  gift: ph('gift'),
  'thumbs-up': ph('thumbs-up'),
  hallo: ph('hand-waving'),
  'this-way': ph('arrow-right'),
  friends: ph('handshake'),
  look: ph('palette'),
  switch: ph('toggle-right'),
  questionmark: ph('question'),
};
