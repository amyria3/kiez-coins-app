// Linien-Icons für den Look Mono (Daria, 2026-11-25: „mit dem anderen Set an Icons“): Phosphor Icons, Gewicht Regular,
// gefüllt nur das Herz bei „gefällt mir“. Lizenz: MIT (phosphoricons.com). Grundlage ist das Set des alten Looks
// „Fashionable“ (Git-Tag `fashionable-archiv`), ergänzt um die Icons, die seitdem dazugekommen sind.
// Fehlt ein Name hier, zeigt Icon.tsx Darias Icon aus svgs.ts (z. B. der Kater als Marke).
import { type PhosphorName } from './phosphorSvgs';
import { phXml } from './phosphor';
import type { IconName } from './svgs';

type LineSvg = (c: string, filled?: boolean) => string;

const ph = (name: PhosphorName): LineSvg => (c, filled) => phXml(name, c, filled);

/**
 * Doppelherz als Linie für den Feed (Daria, 2026-11-27): zwei Herzen in der Strichstärke der Phosphor-Icons (16 von
 * 256). Das hintere ist eine offene Linie mit runden Enden und hält überall denselben Abstand zum vorderen, wie die
 * zwei Sprechblasen bei Chats. Die alte Fassung aus verkleinertem Herz und Maske lief in dünne Spitzen aus.
 */
const HEART_LINE =
  'M128,76 C117,58 98,48 78,48 C48.18,48 24,72.18 24,102 C24,162 112,212 128,222 C144,212 232,162 232,102 ' +
  'C232,72.18 207.82,48 178,48 C158,48 139,58 128,76 Z';
/** Dasselbe Herz von 84 % bis 40 % seines Umfangs: rechter Bogen, Kerbe, linker Bogen, linke Flanke */
const HEART_BACK_LINE =
  'M213.86,61.63 C204.32,53.15 191.76,48 178,48 C158,48 139,58 128,76 C117,58 98,48 78,48 C48.18,48 24,72.18 24,102 ' +
  'C24,134.94 50.52,164.87 77.09,186.81';
// Etwas größer gezeichnet statt in der Leiste vergrößert (Daria, 2026-11-28: „The different stroke indicates the
// setting is not completely working“): So bleibt der Strich wie bei allen Phosphor-Icons bei 16 von 256.
const HEART_SCALE = 0.784;
const doubleHeartLine: LineSvg = (c) => {
  const width = 16 / HEART_SCALE;
  const line = `fill="none" stroke="${c}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"`;
  return (
    `<svg width="24" height="24" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="${HEART_BACK_LINE}" transform="translate(-10.88 4.32) scale(${HEART_SCALE})" ${line}/>` +
    `<path d="${HEART_LINE}" transform="translate(65.28 49.12) scale(${HEART_SCALE})" ${line}/></svg>`
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
