// Icons für den Look „Instagram“: Font Awesome Free (Daria, 24.10.2026), nur in diesem Look.
// Wo es Font Awesome Regular gibt, steht die Kontur, sonst Solid. Gefüllt (z. B. Herz bei „gefällt mir“) immer Solid.
// Lizenz der Icons: CC BY 4.0, Font Awesome Free (fontawesome.com/license/free).
// Fehlt ein Name hier, zeigt Icon.tsx Darias Icon aus svgs.ts.
import type { IconName } from './svgs';
import { useAppDimensions } from '../../theme/layout';
// Einzeln importiert, damit nur diese Icons im Bundle landen
import { faHeart as faHeartR } from '@fortawesome/free-regular-svg-icons/faHeart';
import { faHeart as faHeartS } from '@fortawesome/free-solid-svg-icons/faHeart';
import { faComment } from '@fortawesome/free-regular-svg-icons/faComment';
import { faComments } from '@fortawesome/free-regular-svg-icons/faComments';
import { faPaperPlane } from '@fortawesome/free-regular-svg-icons/faPaperPlane';
import { faCamera } from '@fortawesome/free-regular-svg-icons/faCamera';
import { faHouse } from '@fortawesome/free-regular-svg-icons/faHouse';
import { faClock } from '@fortawesome/free-regular-svg-icons/faClock';
import { faFlag } from '@fortawesome/free-regular-svg-icons/faFlag';
import { faCopy } from '@fortawesome/free-regular-svg-icons/faCopy';
import { faEye } from '@fortawesome/free-regular-svg-icons/faEye';
import { faThumbsUp } from '@fortawesome/free-regular-svg-icons/faThumbsUp';
import { faHandshake } from '@fortawesome/free-regular-svg-icons/faHandshake';
import { faCircleCheck } from '@fortawesome/free-regular-svg-icons/faCircleCheck';
import { faGem } from '@fortawesome/free-regular-svg-icons/faGem';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons/faLocationDot';
import { faBars } from '@fortawesome/free-solid-svg-icons/faBars';
import { faLink } from '@fortawesome/free-solid-svg-icons/faLink';
import { faGear } from '@fortawesome/free-solid-svg-icons/faGear';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons/faChevronLeft';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import { faXmark } from '@fortawesome/free-solid-svg-icons/faXmark';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { faMinus } from '@fortawesome/free-solid-svg-icons/faMinus';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons/faEllipsis';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons/faCircleInfo';
import { faTableCells } from '@fortawesome/free-solid-svg-icons/faTableCells';
import { faTableCellsLarge } from '@fortawesome/free-solid-svg-icons/faTableCellsLarge';
import { faUsers } from '@fortawesome/free-solid-svg-icons/faUsers';
import { faGift } from '@fortawesome/free-solid-svg-icons/faGift';
import { faLanguage } from '@fortawesome/free-solid-svg-icons/faLanguage';
import { faPalette } from '@fortawesome/free-solid-svg-icons/faPalette';

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

type FaDef = { icon: [number, number, string[], string, string | string[]] };

/** Anteil der Fläche, den das Zeichen einnimmt: 80 %, so groß wirkten die bisherigen Linien-Icons (18 von 24) */
const FILL = 0.8;

/** Font-Awesome-Icon als quadratisches SVG, mittig, in Farbe `c` */
export function faXml(def: FaDef, c: string) {
  const [w, h, , , d] = def.icon;
  const box = Math.max(w, h) / FILL;
  const paths = (Array.isArray(d) ? d : [d]).map((p) => `<path d="${p}"/>`).join('');
  return `<svg width="24" height="24" viewBox="${-(box - w) / 2} ${-(box - h) / 2} ${box} ${box}" xmlns="http://www.w3.org/2000/svg" fill="${c}">${paths}</svg>`;
}

/** Icons, die nicht über einen IconName laufen (Leiste, Profil-Reiter, Konto) */
export const FA = {
  home: faHouse,
  create: faCamera,
  chats: faComments,
  menu: faBars,
  created: faTableCells,
  accepted: faCircleCheck,
  groups: faUsers,
  friends: faHandshake,
  language: faLanguage,
  look: faPalette,
  gem: faGem,
} satisfies Record<string, FaDef>;

const fa = (regular: FaDef, solid?: FaDef): Svg => ({
  width: 24,
  height: 24,
  svg: (c, filled) => faXml(filled && solid ? solid : regular, c),
});

/**
 * Regelwerk: jedes Icon eine Bedeutung. Kommentar = Sprechblase, Chats = zwei Sprechblasen,
 * Senden = Papierflieger, Ort = Stecknadel, Feed = Haus, Gruppen = Personen.
 */
export const instagramSvgs: Partial<Record<IconName, Svg>> = {
  heart: fa(faHeartR, faHeartS),
  comment: fa(faComment),
  send: fa(faPaperPlane),
  camera: fa(faCamera),
  'map-pin': fa(faLocationDot),
  burger: fa(faBars),
  message: fa(faComments),
  link: fa(faLink),
  settings: fa(faGear),
  'chevron-left': fa(faChevronLeft),
  'chevron-right': fa(faChevronRight),
  close: fa(faXmark),
  check: fa(faCheck),
  plus: fa(faPlus),
  minus: fa(faMinus),
  more: fa(faEllipsis),
  clock: fa(faClock),
  info: fa(faCircleInfo),
  flag: fa(faFlag),
  copy: fa(faCopy),
  eye: fa(faEye),
  // Deine Challenges: großes Raster
  ship: fa(faTableCellsLarge),
  // Gruppen: Personen
  behausung: fa(faUsers),
  gift: fa(faGift),
  'thumbs-up': fa(faThumbsUp),
};
