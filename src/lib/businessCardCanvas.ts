import QRCode from 'qrcode';

import { KATER_AVATAR_YELLOW } from '../components/icons/katerAvatarSvg';
import { parseRich } from '../data/richText';
import { printLink } from './printLink';

export { printLink };

/** Wie shortLink in data/showcase.ts; hier ohne Abhängigkeiten, damit die öffentliche Seite (api/s.mjs) sie mitnutzt */
export const shortLink = (url: string) => url.replace(/^https:\/\/(www\.)?/i, '').replace(/\/$/, '');


/** Übersetzung der Überschriften; die App setzt t() aus data/texts.ts ein, die öffentliche Seite bleibt Deutsch */
let t: (s: string) => string = (s) => s;
export function setCardTranslator(fn: (s: string) => string): void {
  t = fn;
}

/**
 * Druckbare Visitenkarte des Schaufensters (Daria, 2026-11-12): als Bilder zum Teilen und als PDF zum Drucken.
 * Vorne Name, Kiez, Logo und Services, hinten QR-Code mit Webadresse, Adresse, Öffnungszeiten, E-Mail und Links
 * (Daria, 2026-11-23). Optik wie der Kater-Avatar (Bildmarke): Gelbgrün #F0FFA6, Linienfarbe #000027, Titel in der Unbounded.
 *
 * Nur im Browser (App im Web und öffentliche Seite kiezcoins.de/s/…, gebaut nach website/visitenkarte.js): Beide Seiten werden auf ein Canvas gezeichnet, im Format 85 × 55 mm (Scheckkarte) mit 15 Pixeln pro
 * Millimeter, also etwa 380 dpi. Das PDF hat zwei Seiten in genau dieser Größe, so nimmt es jede Druckerei.
 */
export const CARD_MM = { w: 85, h: 55 };
const PX_PER_MM = 15;
export const CARD_W = CARD_MM.w * PX_PER_MM;
export const CARD_H = CARD_MM.h * PX_PER_MM;

/** Linienfarbe des Katers */
const INK = '#000027';
const YELLOW = KATER_AVATAR_YELLOW;
const WHITE = '#FFFFFF';
/** Rückseite: weicher als die reine Linienfarbe (Daria, 2026-11-12: „Hintergrund etwas runterregeln“) */
const BACK = '#2B2B57';
/** Grau auf dunklem Grund für leere Angaben */
const MUTED = 'rgba(255, 255, 255, 0.55)';

/** Sicherheitsabstand zum Rand: 4 mm, damit beim Schneiden nichts verloren geht */
const PAD = 4 * PX_PER_MM;

const TITLE_FONT = 'Unbounded_500Medium';
const LABEL_FONT = 'Unbounded_500Medium';
const BODY_FONT = 'Karla_400Regular';
const BODY_MEDIUM = 'Karla_500Medium';

export type CardData = {
  name: string;
  kiez?: string;
  address?: string;
  /** Kontakt-Mail (Daria, 2026-11-17) */
  email?: string;
  openingHours?: string;
  services?: string;
  /** Services als fertige Zeilen, z. B. die Auswahl im Druck-Bildschirm; ohne Angabe aus `services` */
  serviceLines?: string[];
  links: string[];
  /** kiezcoins.de/s/<kurzname>, steht als Text unter dem QR-Code */
  url: string;
  /**
   * Ziel des QR-Codes, wenn es von `url` abweicht: die Visitenkarten-Ansicht mit ?via=karte (Daria, 2026-11-23).
   * Wer die gedruckte Karte scannt, hat die Person getroffen und bekommt dort „Wo habt Ihr Euch getroffen?“.
   */
  qrUrl?: string;
  logoUri?: string;
};

/** Services ohne Auszeichnung: Absätze bleiben Zeilen, Aufzählungen werden zu „· …“ */
export function servicesPlain(value?: string): string[] {
  if (!value) return [];
  const plain = (l: { text: string }[]) => l.map((i) => i.text).join('').trim();
  const out: string[] = [];
  for (const b of parseRich(value)) {
    if (b.kind === 'p') b.lines.forEach((l) => out.push(plain(l)));
    else b.items.forEach((l) => out.push(`· ${plain(l)}`));
  }
  return out.filter(Boolean);
}

type Ctx = CanvasRenderingContext2D;

/** Zeilen umbrechen; zu lange Wörter (z. B. Links) werden hart getrennt */
function wrap(ctx: Ctx, value: string, width: number): string[] {
  const lines: string[] = [];
  for (const para of value.replace(/\r\n?/g, '\n').split('\n')) {
    if (!para.trim()) continue;
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= width) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      line = word;
      while (ctx.measureText(line).width > width && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > width) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** Höchstens `max` Zeilen, die letzte mit „…“ */
function clamp(ctx: Ctx, lines: string[], max: number, width: number): string[] {
  if (lines.length <= max) return lines;
  const out = lines.slice(0, max);
  let last = `${out[max - 1]}…`;
  while (ctx.measureText(last).width > width && last.length > 1) last = `${last.slice(0, -2)}…`;
  out[max - 1] = last;
  return out;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string, cors: boolean): Promise<HTMLImageElement | null> {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    // Ohne CORS dürfte das Canvas danach nicht mehr als Bild gespeichert werden
    if (cors) img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 4000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}



/** Logo des Ladens rund, quadratisch aus der Mitte geschnitten */
function drawLogo(ctx: Ctx, img: HTMLImageElement, x: number, y: number, d: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.clip();
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, x, y, d, d);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/** QR-Code: dunkle Module auf Weiß, damit jeder Scanner ihn liest */
function drawQr(ctx: Ctx, value: string, x: number, y: number, size: number) {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const quiet = 2;
  const cell = size / (n + quiet * 2);
  ctx.fillStyle = WHITE;
  roundRect(ctx, x, y, size, size, 24);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = INK;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.modules.get(r, c)) continue;
      // Leicht überlappend, damit beim Skalieren keine hellen Haarlinien zwischen den Modulen entstehen
      ctx.fillRect(x + (quiet + c) * cell, y + (quiet + r) * cell, cell + 0.6, cell + 0.6);
    }
  }
}

type Assets = { logo: HTMLImageElement | null };

/**
 * Wie viele Links und Services ganz auf der Karte stehen, in ihrer Reihenfolge (`links`, `services`), und wie viele
 * höchstens Platz hätten, wenn jeder Eintrag eine Zeile braucht (`linkRoom`, `serviceRoom`). Der Druck-Bildschirm
 * sperrt damit weitere Häkchen, sobald die Karte voll ist.
 */
export type CardFit = { links: number; services: number; linkRoom: number; serviceRoom: number };

/** Wie viele Einträge ganz stehen: alle ihre Zeilen passen in `limit`, keine ist mit „…“ gekürzt */
function shownEntries(perEntry: string[][], limit: number): number {
  const total = perEntry.reduce((n, e) => n + e.length, 0);
  let used = 0;
  let shown = 0;
  for (const e of perEntry) {
    const end = used + e.length;
    if (end > limit || (end === limit && total > limit)) break;
    used = end;
    shown += 1;
  }
  return shown;
}

/**
 * Vorderseite (Daria, 2026-11-23: „Services vorn, Links, QR-Code, Mail hinten“): wer und was. Gelbgrün, oben links der
 * Name groß mit Kiez, oben rechts das Logo (ohne Logo nichts, kein Kater), unten links die Services als Liste.
 * Ohne Services steht der Name unten links wie bisher.
 */
function drawFront(d: CardData, a: Assets): { canvas: HTMLCanvasElement; services: number; serviceRoom: number } {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  const mark = a.logo ? 150 : 0;
  if (a.logo) drawLogo(ctx, a.logo, CARD_W - PAD - mark, PAD, mark);
  const nameW = CARD_W - PAD * 2 - (mark ? mark + 40 : 0);
  const services = d.serviceLines ?? servicesPlain(d.services);
  const bottom = CARD_H - PAD - 4;

  // Name: so groß wie es passt, mit Services höchstens zwei Zeilen, sonst drei
  const maxLines = services.length ? 2 : 3;
  let size = services.length ? 76 : 84;
  let lines: string[] = [];
  for (; size >= 44; size -= 4) {
    ctx.font = `${size}px "${TITLE_FONT}"`;
    lines = wrap(ctx, d.name, nameW);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= nameW)) break;
  }
  ctx.font = `${size}px "${TITLE_FONT}"`;
  lines = clamp(ctx, lines, maxLines, nameW);
  const lineH = Math.round(size * 1.15);
  const kiezLine = d.kiez ? clamp(ctx, wrap(ctx, d.kiez, nameW), 1, nameW)[0] ?? '' : '';
  ctx.fillStyle = INK;

  if (!services.length) {
    // Ohne Services: Name und Kiez unten links
    let y = bottom - (kiezLine ? 56 : 0) - (lines.length - 1) * lineH;
    for (const l of lines) {
      ctx.fillText(l, PAD, y);
      y += lineH;
    }
    if (kiezLine) {
      ctx.font = `34px "${BODY_MEDIUM}"`;
      ctx.fillText(kiezLine, PAD, bottom);
    }
    return { canvas, services: 0, serviceRoom: 0 };
  }

  let y = PAD + Math.round(size * 0.8);
  for (const l of lines) {
    ctx.fillText(l, PAD, y);
    y += lineH;
  }
  y -= lineH;
  if (kiezLine) {
    ctx.font = `34px "${BODY_MEDIUM}"`;
    y += 52;
    ctx.fillText(kiezLine, PAD, y);
  }

  // Services unten links, so viele Zeilen wie unter Name und Kiez Platz haben
  const bodyLine = 50;
  ctx.font = `38px "${BODY_FONT}"`;
  const width = CARD_W - PAD * 2;
  const first = Math.max(y + 76, PAD + mark + 50);
  const room = Math.max(1, Math.floor((bottom - first) / bodyLine) + 1);
  const perEntry = services.map((e) => wrap(ctx, e, width));
  const shown = clamp(ctx, perEntry.flat(), room, width);
  let sy = Math.max(first, bottom - (shown.length - 1) * bodyLine);
  for (const l of shown) {
    ctx.fillText(l, PAD, sy);
    sy += bodyLine;
  }
  return { canvas, services: shownEntries(perEntry, room), serviceRoom: room };
}

/**
 * Rückseite (Daria, 2026-11-23): wie erreiche ich sie. Dunkel, rechts oben der QR-Code zur Digitalen Visitenkarte mit
 * der Webadresse darunter, links Adresse, Öffnungszeiten, E-Mail und Links. Unter den Links steht, dass es alle über
 * den QR-Code gibt. Kein Kater: er verdeckte die Links.
 */
function drawBack(d: CardData): { canvas: HTMLCanvasElement; links: number; linkRoom: number } {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = BACK;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Rechts: QR-Code, darunter die Webadresse
  const qrSize = 360;
  const qrX = CARD_W - PAD - qrSize;
  drawQr(ctx, d.qrUrl ?? d.url, qrX, PAD, qrSize);
  ctx.fillStyle = WHITE;
  ctx.font = `28px "${BODY_MEDIUM}"`;
  ctx.textAlign = 'center';
  let webLines = wrap(ctx, shortLink(d.url), qrSize + 40);
  if (webLines.length > 2) webLines = clamp(ctx, webLines, 2, qrSize + 40);
  webLines.forEach((l, i) => ctx.fillText(l, qrX + qrSize / 2, PAD + qrSize + 48 + i * 34));
  ctx.textAlign = 'left';

  // Links: eine Spalte neben dem QR-Code
  const x = PAD;
  const colW = qrX - PAD - 70;
  const maxY = CARD_H - PAD;
  const bodySize = 38;
  const bodyLine = 50;
  const labelGap = 24 + bodyLine;
  const sectionGap = 40;
  let y = PAD + 26;
  const label = (value: string) => {
    ctx.font = `26px "${LABEL_FONT}"`;
    ctx.fillStyle = YELLOW;
    ctx.fillText(value.toUpperCase(), x, y);
    y += labelGap;
  };
  /** Schrift so klein, dass die breiteste Zeile passt, höchstens bis 28 (Links und Mail nicht umbrechen) */
  const fitFont = (entries: string[]) => {
    ctx.font = `${bodySize}px "${BODY_FONT}"`;
    const widest = Math.max(...entries.map((e) => ctx.measureText(e).width));
    const size = widest > colW ? Math.max(28, Math.floor((bodySize * colW) / widest)) : bodySize;
    ctx.font = `${size}px "${BODY_FONT}"`;
  };
  const roomAt = (first: number) => Math.max(0, Math.floor((maxY - first) / bodyLine) + 1);

  const texts: { label: string; value?: string; max: number; fit?: boolean }[] = [
    { label: t('Adresse'), value: d.address, max: 3 },
    { label: t('Öffnungszeiten'), value: d.openingHours, max: 4 },
    // Mail über den Links, eine Zeile, notfalls kleiner (Daria, 2026-11-17)
    { label: t('E-Mail'), value: d.email, max: 1, fit: true },
  ];
  for (const it of texts) {
    const value = it.value?.trim();
    if (!value) continue;
    if (roomAt(y + labelGap) < 1) break;
    label(it.label);
    if (it.fit) fitFont([value]);
    else ctx.font = `${bodySize}px "${BODY_FONT}"`;
    ctx.fillStyle = WHITE;
    for (const l of clamp(ctx, wrap(ctx, value, colW), Math.min(it.max, roomAt(y)), colW)) {
      ctx.fillText(l, x, y);
      y += bodyLine;
    }
    y += sectionGap;
  }

  // Links: eine Zeile bleibt für den Hinweis auf den QR-Code frei
  const linkRoom = Math.max(0, roomAt(y + labelGap) - 1);
  const links = d.links.map(printLink).filter((l) => l.trim());
  if (!links.length || linkRoom < 1) return { canvas, links: 0, linkRoom };
  label(links.length > 1 ? t('Links') : t('Link'));
  fitFont(links);
  ctx.fillStyle = WHITE;
  const perEntry = links.map((e) => wrap(ctx, e, colW));
  for (const l of clamp(ctx, perEntry.flat(), linkRoom, colW)) {
    ctx.fillText(l, x, y);
    y += bodyLine;
  }
  ctx.font = `28px "${BODY_FONT}"`;
  ctx.fillStyle = MUTED;
  ctx.fillText(clamp(ctx, wrap(ctx, t('Alle Links: QR-Code scannen'), colW), 1, colW)[0] ?? '', x, y);
  return { canvas, links: shownEntries(perEntry, linkRoom), linkRoom };
}

const isWeb = () => typeof document !== 'undefined';

/** Schriften laden, bevor das Canvas zeichnet; sonst nimmt es eine Ersatzschrift */
async function fontsReady(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return;
  await Promise.all(
    [TITLE_FONT, BODY_FONT, BODY_MEDIUM].map((f) => fonts.load(`40px "${f}"`).catch(() => [])),
  );
}

/** Beide Seiten und was von Links und Services auf die Karte passt */
export type CardSides = { front: HTMLCanvasElement; back: HTMLCanvasElement; fit: CardFit };

/** Beide Seiten zeichnen. `null` außerhalb des Browsers. */
export async function drawBusinessCard(d: CardData): Promise<CardSides | null> {
  if (!isWeb()) return null;
  await fontsReady();
  const logo = d.logoUri ? await loadImage(d.logoUri, !d.logoUri.startsWith('data:') && !d.logoUri.startsWith('blob:')) : null;
  const draw = (l: HTMLImageElement | null): CardSides => {
    const back = drawBack(d);
    const front = drawFront(d, { logo: l });
    return {
      front: front.canvas,
      back: back.canvas,
      fit: { links: back.links, linkRoom: back.linkRoom, services: front.services, serviceRoom: front.serviceRoom },
    };
  };
  const sides = draw(logo);
  // Logo ohne Freigabe für Canvas: dann ohne Logo
  try {
    sides.front.toDataURL();
    return sides;
  } catch {
    return draw(null);
  }
}

const fileBase = (name: string) =>
  `visitenkarte-${name.normalize('NFKD').replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 40) || 'schaufenster'}`;

function canvasFile(canvas: HTMLCanvasElement, name: string): File {
  const data = canvas.toDataURL('image/png');
  const bytes = atob(data.split(',')[1]);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return new File([buffer], name, { type: 'image/png' });
}

export function cardFiles(sides: CardSides, name: string): File[] {
  const base = fileBase(name);
  return [canvasFile(sides.front, `${base}-vorne.png`), canvasFile(sides.back, `${base}-hinten.png`)];
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Text, der mit dem Bild mitgeht: Name, Adresse, Mail und Link zum Schaufenster (Daria, 2026-11-12: „Wenn ich das Bild
 * verschicke, Adresse mitsenden“). So lässt sich die Adresse in Messengern antippen und kopieren.
 */
export function cardMessage(d: CardData): string {
  return [d.name, d.address?.trim(), d.email?.trim(), d.url].filter(Boolean).join('\n');
}

/**
 * Kann dieser Browser Bilder ins Teilen-Fenster geben? Viele Desktop-Browser (Firefox, Chrome unter Linux, ältere
 * Chrome-Versionen) können das nicht. Dort heißt der Knopf „Visitenkarte herunterladen“ (Daria, 2026-11-12:
 * „in diesem Fall sollte der Button entsprechend Download heißen“).
 */
export function canShareImages(): boolean {
  if (typeof navigator === 'undefined' || typeof File === 'undefined') return false;
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  try {
    return typeof nav.share === 'function' && !!nav.canShare?.({ files: [new File([''], 'karte.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}

/**
 * Als Bilder teilen (Teilen-Menü des Geräts), mit Name, Adresse und Link als Text. Wo das nicht geht, beide Seiten
 * herunterladen. `'shared'`, `'downloaded'` oder `'cancelled'`.
 */
export async function shareCard(sides: CardSides, d: CardData): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const name = d.name;
  const files = cardFiles(sides, name);
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (typeof nav.share === 'function' && nav.canShare?.({ files })) {
    try {
      await nav.share({ files, title: name, text: cardMessage(d) });
      return 'shared';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'cancelled';
    }
  }
  files.forEach(download);
  return 'downloaded';
}

export function downloadCard(sides: CardSides, name: string): void {
  cardFiles(sides, name).forEach(download);
}

/**
 * Drucken oder als PDF sichern: zwei Seiten im Format 85 × 55 mm ohne Rand, vorne und hinten.
 * Im Druckdialog „Als PDF sichern“ wählen; das PDF geht so an jede Druckerei.
 */
export function printCard(sides: CardSides, name: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  const page = (c: HTMLCanvasElement) => `<div class="page"><img src="${c.toDataURL('image/png')}" alt=""></div>`;
  const title = fileBase(name);
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
@page { size: ${CARD_MM.w}mm ${CARD_MM.h}mm; margin: 0; }
html, body { margin: 0; padding: 0; }
.page { width: ${CARD_MM.w}mm; height: ${CARD_MM.h}mm; overflow: hidden; break-after: page; page-break-after: always; }
.page:last-child { break-after: auto; page-break-after: auto; }
img { display: block; width: 100%; height: 100%; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body>${page(sides.front)}${page(sides.back)}</body></html>`);
  doc.close();
  const go = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60000);
  };
  const imgs = Array.from(doc.images);
  Promise.all(imgs.map((i) => (i.complete ? Promise.resolve() : new Promise((r) => (i.onload = i.onerror = r))))).then(go);
}
