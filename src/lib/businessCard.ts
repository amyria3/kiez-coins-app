import { Platform } from 'react-native';
import QRCode from 'qrcode';

import { katerAvatarSvg, KATER_AVATAR_GELB } from '../components/icons/katerAvatarSvg';
import { parseRich } from '../data/richText';
import { shortLink, showcasePublicLink, type Showcase } from '../data/showcase';
import { t } from '../data/texts';

/**
 * Visitenkarte des Schaufensters (Daria, 2026-11-12): Der Laden exportiert sie aus „Verwalten“, als Bild zum Teilen
 * und als PDF zum Drucken. Vorne Name, Kiez, Instant-Code und Webadresse, hinten Adresse, Öffnungszeiten, Services
 * und Links. Optik wie der Kater-Avatar: Gelbgrün #E4FF5F, Linienfarbe #000027, Titel in der Unbounded.
 *
 * Nur im Browser: Beide Seiten werden auf ein Canvas gezeichnet, im Format 85 × 55 mm (Scheckkarte) mit 15 Pixeln pro
 * Millimeter, also etwa 380 dpi. Das PDF hat zwei Seiten in genau dieser Größe, so nimmt es jede Druckerei.
 */
export const CARD_MM = { w: 85, h: 55 };
const PX_PER_MM = 15;
export const CARD_W = CARD_MM.w * PX_PER_MM;
export const CARD_H = CARD_MM.h * PX_PER_MM;

/** Linienfarbe des Katers */
const INK = '#000027';
const GELB = KATER_AVATAR_GELB;
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
  openingHours?: string;
  services?: string;
  links: string[];
  /** kiezcoins.de/s/<kurzname>, Ziel des Instant-Codes */
  url: string;
  logoUri?: string;
};

export function cardData(s: Showcase): CardData {
  return {
    name: s.name,
    kiez: s.kiez,
    address: s.address,
    openingHours: s.openingHours,
    services: s.services,
    links: s.links,
    url: showcasePublicLink(s.slug),
    logoUri: typeof s.logo === 'object' && s.logo && 'uri' in s.logo ? (s.logo as { uri?: string }).uri : undefined,
  };
}

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

const svgUri = (xml: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;

/** Kater im gelbgrünen Kreis, wie der Kater-Avatar */
function drawKater(ctx: Ctx, kater: HTMLImageElement | null, x: number, y: number, d: number, ring: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
  ctx.fillStyle = GELB;
  ctx.fill();
  ctx.clip();
  if (kater) ctx.drawImage(kater, x, y, d, d);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = ring;
  ctx.stroke();
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

/** Instant-Code: dunkle Module auf Weiß, damit jeder Scanner ihn liest */
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

type Assets = { kater: HTMLImageElement | null; logo: HTMLImageElement | null };

/** Vorderseite: Gelbgrün, Logo oder Kater, Name groß, Kiez, rechts der Instant-Code mit Webadresse */
function drawFront(d: CardData, a: Assets): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = GELB;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.textBaseline = 'alphabetic';

  // Rechts: Instant-Code, darunter die Webadresse
  const qrSize = 400;
  const qrX = CARD_W - PAD - qrSize;
  const qrY = PAD + 20;
  drawQr(ctx, d.url, qrX, qrY, qrSize);
  ctx.fillStyle = INK;
  ctx.font = `30px "${BODY_MEDIUM}"`;
  ctx.textAlign = 'center';
  const web = shortLink(d.url);
  let webLines = wrap(ctx, web, qrSize + 40);
  if (webLines.length > 2) webLines = clamp(ctx, webLines, 2, qrSize + 40);
  webLines.forEach((l, i) => ctx.fillText(l, qrX + qrSize / 2, qrY + qrSize + 52 + i * 36));
  ctx.textAlign = 'left';

  // Links: Logo oder Kater
  const colW = qrX - PAD - 50;
  const mark = 130;
  if (a.logo) drawLogo(ctx, a.logo, PAD, PAD, mark);
  else drawKater(ctx, a.kater, PAD, PAD, mark, INK);

  // Name: so groß wie es passt, höchstens drei Zeilen
  let size = 84;
  let lines: string[] = [];
  for (; size >= 44; size -= 4) {
    ctx.font = `${size}px "${TITLE_FONT}"`;
    lines = wrap(ctx, d.name, colW);
    if (lines.length <= 3 && lines.every((l) => ctx.measureText(l).width <= colW)) break;
  }
  ctx.font = `${size}px "${TITLE_FONT}"`;
  lines = clamp(ctx, lines, 3, colW);
  const lineH = Math.round(size * 1.18);
  const kiezH = d.kiez ? 56 : 0;
  // Name und Kiez stehen unten links, auf einer Linie mit der Webadresse
  const bottom = CARD_H - PAD - 8;
  let y = bottom - kiezH - (lines.length - 1) * lineH;
  ctx.fillStyle = INK;
  for (const l of lines) {
    ctx.fillText(l, PAD, y);
    y += lineH;
  }
  if (d.kiez) {
    ctx.font = `34px "${BODY_MEDIUM}"`;
    ctx.fillText(clamp(ctx, wrap(ctx, d.kiez, colW), 1, colW)[0] ?? '', PAD, bottom);
  }

  // Unter Logo oder Kater: woher die Karte kommt
  ctx.font = `24px "${LABEL_FONT}"`;
  ctx.fillText(t('Schaufenster').toUpperCase(), PAD + mark + 24, PAD + mark / 2 + 9);
  return canvas;
}

/** Rückseite: dunkel, Überschriften in Gelbgrün, Angaben in Weiß, zwei Spalten */
function drawBack(d: CardData, a: Assets): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = BACK;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Mehr Luft und größere Schrift (Daria, 2026-11-12)
  // Mehr Luft und größere Schrift (Daria, 2026-11-12). Die Webadresse steht schon vorne, hinten bleibt nur ein
  // kleiner Kater unten rechts. Links die kurzen Angaben, rechts die längeren in der breiteren Spalte.
  const gap = 80;
  const inner = CARD_W - PAD * 2 - gap;
  const leftW = Math.round(inner * 0.4);
  const rightW = inner - leftW;
  const kd = 56;
  const bodySize = 41;
  const bodyLine = 53;
  const top = PAD + 34;

  const services = servicesPlain(d.services);
  type Item = { label: string; value?: string; max: number; fit?: boolean };
  const left: Item[] = [
    { label: t('Adresse'), value: d.address, max: 3 },
    { label: t('Öffnungszeiten'), value: d.openingHours, max: 5 },
  ];
  const right: Item[] = [
    { label: t('Services'), value: services.join('\n'), max: d.links.length ? 4 : 8 },
    // Links nicht umbrechen: lieber etwas kleiner, damit sie lesbar bleiben
    { label: d.links.length > 1 ? t('Links') : t('Link'), value: d.links.map(shortLink).join('\n'), max: 3, fit: true },
  ];

  const column = (items: Item[], x: number, colW: number, maxY: number) => {
    let y = top;
    for (const it of items) {
      if (!it.value?.trim()) continue;
      if (y > maxY - bodyLine) break;
      ctx.font = `28px "${LABEL_FONT}"`;
      ctx.fillStyle = GELB;
      ctx.fillText(it.label.toUpperCase(), x, y);
      y += 26 + bodyLine;
      let size = bodySize;
      ctx.font = `${size}px "${BODY_FONT}"`;
      if (it.fit) {
        const widest = Math.max(...it.value.split('\n').map((l) => ctx.measureText(l).width));
        if (widest > colW) size = Math.max(30, Math.floor((bodySize * colW) / widest));
        ctx.font = `${size}px "${BODY_FONT}"`;
      }
      ctx.fillStyle = WHITE;
      const room = Math.max(1, Math.floor((maxY - y + bodyLine) / bodyLine));
      for (const l of clamp(ctx, wrap(ctx, it.value, colW), Math.min(it.max, room), colW)) {
        ctx.fillText(l, x, y);
        y += bodyLine;
      }
      y += 58;
    }
    return y;
  };
  const usedLeft = column(left, PAD, leftW, CARD_H - PAD);
  const usedRight = column(right, PAD + leftW + gap, rightW, CARD_H - PAD - kd - 10);
  if (usedLeft === top && usedRight === top) {
    ctx.font = `${bodySize}px "${BODY_FONT}"`;
    ctx.fillStyle = MUTED;
    ctx.fillText(t('Noch keine Angaben im Schaufenster'), PAD, PAD + 40);
  }

  drawKater(ctx, a.kater, CARD_W - PAD - kd, CARD_H - PAD - kd, kd, GELB);
  return canvas;
}

const isWeb = () => Platform.OS === 'web' && typeof document !== 'undefined';

/** Schriften laden, bevor das Canvas zeichnet; sonst nimmt es eine Ersatzschrift */
async function fontsReady(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return;
  await Promise.all(
    [TITLE_FONT, BODY_FONT, BODY_MEDIUM].map((f) => fonts.load(`40px "${f}"`).catch(() => [])),
  );
}

export type CardSides = { front: HTMLCanvasElement; back: HTMLCanvasElement };

/** Beide Seiten zeichnen. `null` außerhalb des Browsers. */
export async function drawBusinessCard(d: CardData): Promise<CardSides | null> {
  if (!isWeb()) return null;
  await fontsReady();
  const [kater, logo] = await Promise.all([
    loadImage(svgUri(katerAvatarSvg().replace('viewBox', 'width="344" height="344" viewBox')), false),
    d.logoUri ? loadImage(d.logoUri, !d.logoUri.startsWith('data:') && !d.logoUri.startsWith('blob:')) : Promise.resolve(null),
  ]);
  const draw = (l: HTMLImageElement | null): CardSides => ({ front: drawFront(d, { kater, logo: l }), back: drawBack(d, { kater, logo: l }) });
  const sides = draw(logo);
  // Logo ohne Freigabe für Canvas: dann mit Kater
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
 * Text, der mit dem Bild mitgeht: Name, Adresse und Link zum Schaufenster (Daria, 2026-11-12: „Wenn ich das Bild
 * verschicke, Adresse mitsenden“). So lässt sich die Adresse in Messengern antippen und kopieren.
 */
export function cardMessage(d: CardData): string {
  return [d.name, d.address?.trim(), d.url].filter(Boolean).join('\n');
}

/**
 * Als Bilder teilen (Teilen-Menü des Handys), mit Name, Adresse und Link als Text. Wo das nicht geht, beide Seiten
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
