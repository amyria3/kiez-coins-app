import { Platform } from 'react-native';

import { INK, INK_LINK, PAPER, RICH, SHEET_RATIO, sheetMetrics } from '../components/TextSheets';
import { iconSvgs } from '../components/icons/svgs';
import { font } from '../theme/tokens';

/**
 * Blätter eines Text-Posts als Bilder (Daria, 07.11.2026: „Slides verschicken, nicht raw Text“). Nur im Browser:
 * Jedes Blatt wird auf ein Canvas gezeichnet, 1080 × 1350 Pixel wie eine Instagram-Slide, mit denselben Maßen wie
 * in der App (sheetMetrics). Alles läuft ohne Warten, damit Safari das Teilen-Menü danach noch öffnen darf.
 */
export const SLIDE_WIDTH = 1080;

type Ctx = CanvasRenderingContext2D;

/** Grau für die Seitenzahl */
const MARK = '#A1A1A6';
/** Logo unten rechts: etwas weicher als Schwarz, aber nicht blass (Daria, 07.11.2026) */
const LOGO_INK = '#4A4A4F';

/** SVG als Bild vorbereiten, damit das Zeichnen beim Teilen nicht warten muss */
function svgImage(xml: string): HTMLImageElement | null {
  if (Platform.OS !== 'web' || typeof Image === 'undefined') return null;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  return img;
}

/** Kater wie in den Kater-Nachrichten (Icon „cat“, Daria, 07.11.2026) */
const CAT = iconSvgs.cat;
const catImage = svgImage(
  CAT.svg(LOGO_INK).replace(/width="[^"]*" height="[^"]*"/, `width="${CAT.width * 4}" height="${CAT.height * 4}"`),
);

/** Wer den Post geschrieben hat: oben über dem Titel, Profilbild und Name (Daria, 07.11.2026) */
export type SheetAuthor = { name: string; avatarUri?: string };

/** Profilbild laden, höchstens 3 Sekunden; ohne Bild oder bei Fehlern Initialen */
function loadAvatar(uri?: string): Promise<HTMLImageElement | null> {
  if (!uri || typeof Image === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    // Ohne CORS dürfte das Canvas danach nicht mehr als Bild gespeichert werden
    if (!uri.startsWith('data:') && !uri.startsWith('blob:')) img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 3000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = uri;
  });
}

function drawAvatar(ctx: Ctx, img: HTMLImageElement | null, name: string, x: number, y: number, d: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
  ctx.clip();
  if (img) {
    // Quadratisch aus der Mitte zuschneiden
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, x, y, d, d);
  } else {
    const g = ctx.createLinearGradient(x, y, x + d, y + d);
    g.addColorStop(0, '#7E94FF');
    g.addColorStop(1, '#FFB2E5');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, d, d);
    const initials = name
      .split(/[\s*]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 ${Math.round(d * 0.4)}px "${font.regular}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, x + d / 2, y + d / 2);
  }
  ctx.restore();
}

/** Zeilen umbrechen wie im Blatt: an Leerzeichen, harte Umbrüche bleiben, zu lange Wörter werden geteilt */
function wrap(ctx: Ctx, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      line = word;
      // Wort länger als die Zeile, z. B. ein langer Link
      while (ctx.measureText(line).width > maxWidth && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidth) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Eine Zeile zeichnen, Links und @Namen farbig wie im Blatt */
function drawLine(ctx: Ctx, line: string, x: number, y: number, align: 'left' | 'center', width: number, size: number) {
  const parts = line.split(RICH);
  const total = ctx.measureText(line).width;
  let cx = align === 'center' ? x + (width - total) / 2 : x;
  parts.forEach((part, i) => {
    if (!part) return;
    const rich = i % 2 === 1;
    ctx.fillStyle = rich ? INK_LINK : INK;
    ctx.fillText(part, cx, y);
    const w = ctx.measureText(part).width;
    if (rich && !part.startsWith('@')) ctx.fillRect(cx, y + size * 0.42, w, Math.max(2, size * 0.06));
    cx += w;
  });
}

/** Profilbild und Name in einer Zeile ab `top`; gibt die Unterkante zurück */
function drawAuthorRow(
  ctx: Ctx,
  name: string,
  avatar: HTMLImageElement | null,
  top: number,
  pad: number,
  innerWidth: number,
  align: 'left' | 'center',
): number {
  const W = ctx.canvas.width;
  const d = Math.round(SLIDE_WIDTH * 0.085);
  const nameSize = Math.round(SLIDE_WIDTH * 0.034);
  ctx.font = `600 ${nameSize}px "${font.regular}"`;
  const nameWidth = Math.min(ctx.measureText(name).width, innerWidth - d - nameSize * 0.6);
  const rowWidth = d + Math.round(nameSize * 0.6) + nameWidth;
  const x = align === 'center' ? Math.round((W - rowWidth) / 2) : pad;
  drawAvatar(ctx, avatar, name, x, top, d);
  ctx.font = `600 ${nameSize}px "${font.regular}"`;
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, x + d + Math.round(nameSize * 0.6), top + d / 2, nameWidth);
  return top + d;
}

/** Unten: Seitenzahl links in Grau, rechts Kater und „KiezCoins“ (Daria, 07.11.2026). `bottom` ist die Unterkante. */
function drawFooter(ctx: Ctx, bottom: number, pad: number, index: number, count: number) {
  const W = ctx.canvas.width;
  const markSize = SLIDE_WIDTH * 0.03;
  // Kater, daneben „KiezCoins“ in der normalen Schrift und Farbe wie der Name (Daria, 07.11.2026)
  const wordSize = Math.round(SLIDE_WIDTH * 0.034);
  ctx.font = `600 ${wordSize}px "${font.regular}"`;
  ctx.fillStyle = INK;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('KiezCoins', W - pad, bottom - Math.round(wordSize * 0.15));
  if (catImage?.complete && catImage.naturalWidth) {
    const ww = ctx.measureText('KiezCoins').width;
    const ch = Math.round(wordSize * 1.6);
    const cw = Math.round((ch * CAT.width) / CAT.height);
    ctx.drawImage(catImage, W - pad - ww - Math.round(wordSize * 0.4) - cw, bottom - ch, cw, ch);
  }
  if (count > 1) {
    ctx.font = `${markSize}px "${font.regular}"`;
    ctx.fillStyle = MARK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${index + 1}/${count}`, pad, bottom);
  }
}

function drawSheet(
  text: string,
  title: string | undefined,
  index: number,
  count: number,
  fontKey: string | undefined,
  author: SheetAuthor | undefined,
  avatar: HTMLImageElement | null,
): HTMLCanvasElement {
  const W = SLIDE_WIDTH;
  const H = Math.round(W * SHEET_RATIO);
  const m = sheetMetrics(W, fontKey);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'left';
  const align = m.body.textAlign === 'center' ? 'center' : 'left';
  let y = m.padY;

  // Oben: Profilbild und Name, der Text rückt dafür etwas nach unten (Daria, 07.11.2026)
  if (author?.name.trim()) {
    const top = Math.round(m.padY * 0.42);
    const bottomOfRow = drawAuthorRow(ctx, author.name.trim(), avatar, top, m.pad, m.innerWidth, align);
    y = Math.max(y, bottomOfRow + Math.round(W * 0.06));
  }

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  if (index === 0 && title?.trim()) {
    ctx.font = `${m.title.fontSize}px "${m.title.fontFamily}"`;
    for (const line of wrap(ctx, title.trim(), m.innerWidth)) {
      drawLine(ctx, line, m.pad, y + m.title.lineHeight / 2, align, m.innerWidth, m.title.fontSize);
      y += m.title.lineHeight;
    }
    y += m.titleGap;
  }

  ctx.font = `${m.body.fontSize}px "${m.body.fontFamily}"`;
  for (const line of wrap(ctx, text, m.innerWidth)) {
    drawLine(ctx, line, m.pad, y + m.body.lineHeight / 2, align, m.innerWidth, m.body.fontSize);
    y += m.body.lineHeight;
  }

  // Unten: Seitenzahl links in Grau, Logo rechts (Daria, 07.11.2026)
  drawFooter(ctx, H - Math.round(m.padY * 0.38), m.pad, index, count);
  return canvas;
}

function canvasToFile(canvas: HTMLCanvasElement, name: string, type = 'image/png'): File {
  const data = canvas.toDataURL(type, 0.92);
  const bytes = atob(data.split(',')[1]);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return new File([buffer], name, { type });
}

/** Alle Blätter als PNG-Dateien, oben Profilbild und Name, unten das Logo. `null` außerhalb des Browsers. */
export async function sheetImageFiles(
  pages: string[],
  title?: string,
  fontKey?: string,
  author?: SheetAuthor,
): Promise<File[] | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  const avatar = await loadAvatar(author?.avatarUri);
  const draw = (img: HTMLImageElement | null) =>
    pages.map((p, i) =>
      canvasToFile(
        drawSheet(p, title, i, pages.length, fontKey, author, img),
        `kiezcoins-${String(i + 1).padStart(2, '0')}.png`,
      ),
    );
  try {
    return draw(avatar);
  } catch {
    // Profilbild ohne Freigabe für Canvas: dann mit Initialen
    return draw(null);
  }
}

/** Bild aus einer Datei laden; `null` bei Fehlern */
function loadBlobImage(blob: Blob): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Fotos eines Posts zum Teilen in einem weißen Rahmen (Daria, 07.11.2026): oben links Profilbild und Name, unten
 * rechts Kater und „KiezCoins“, links und rechts etwas Rand. Lässt sich ein Foto nicht zeichnen, bleibt es, wie es ist.
 */
export async function framePhotoFiles(files: File[], author?: SheetAuthor): Promise<File[]> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return files;
  const avatar = await loadAvatar(author?.avatarUri);
  const name = author?.name.trim();
  return Promise.all(
    files.map(async (file, i) => {
      const photo = await loadBlobImage(file);
      if (!photo?.naturalWidth) return file;
      const W = SLIDE_WIDTH;
      const side = Math.round(W * 0.06);
      const inner = W - 2 * side;
      // Seitenverhältnis bleibt zwischen 4:3 quer und 4:5 hoch; was darüber hinausgeht, wird mittig beschnitten
      const ratio = Math.min(1.25, Math.max(0.75, photo.naturalHeight / photo.naturalWidth));
      const ph = Math.round(inner * ratio);
      const srcW = Math.min(photo.naturalWidth, photo.naturalHeight / ratio);
      const srcH = srcW * ratio;
      const headH = name ? Math.round(W * 0.17) : side;
      const footH = Math.round(W * 0.15);
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = headH + ph + footH;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, canvas.height);
      if (name) {
        const d = Math.round(W * 0.085);
        drawAuthorRow(ctx, name, avatar, Math.round((headH - d) / 2), side, inner, 'left');
      }
      ctx.save();
      ctx.beginPath();
      const r = Math.round(W * 0.02);
      ctx.roundRect(side, headH, inner, ph, r);
      ctx.clip();
      ctx.drawImage(photo, (photo.naturalWidth - srcW) / 2, (photo.naturalHeight - srcH) / 2, srcW, srcH, side, headH, inner, ph);
      ctx.restore();
      drawFooter(ctx, canvas.height - Math.round(footH * 0.36), side, i, files.length);
      URL.revokeObjectURL(photo.src);
      try {
        return canvasToFile(canvas, `kiezcoins-${String(i + 1).padStart(2, '0')}.jpg`, 'image/jpeg');
      } catch {
        // Profilbild ohne Freigabe fürs Canvas: Foto ohne Rahmen
        return file;
      }
    }),
  );
}

/**
 * Bilder teilen, wahlweise mit Text: über das Teilen-Menü, wenn der Browser Dateien teilen kann, sonst als Download.
 * `false`, wenn beides nicht geht.
 */
export async function shareImageFiles(
  files: File[],
  text?: string,
): Promise<'shared' | 'cancelled' | 'downloaded' | false> {
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share === 'function' && nav.canShare?.({ files })) {
    try {
      await nav.share(text ? { files, text } : { files });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  try {
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return 'downloaded';
  } catch {
    return false;
  }
}
