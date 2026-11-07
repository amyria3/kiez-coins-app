import { Platform } from 'react-native';

import { INK, INK_LINK, PAPER, RICH, SHEET_RATIO, sheetMetrics } from '../components/TextSheets';
import { brandArt } from '../components/icons/brandArt';
import { font } from '../theme/tokens';

/**
 * Blätter eines Text-Posts als Bilder (Daria, 07.11.2026: „Slides verschicken, nicht raw Text“). Nur im Browser:
 * Jedes Blatt wird auf ein Canvas gezeichnet, 1080 × 1350 Pixel wie eine Instagram-Slide, mit denselben Maßen wie
 * in der App (sheetMetrics). Alles läuft ohne Warten, damit Safari das Teilen-Menü danach noch öffnen darf.
 */
export const SLIDE_WIDTH = 1080;

type Ctx = CanvasRenderingContext2D;

/** Grau für Wasserzeichen und Seitenzahl */
const MARK = '#A1A1A6';

/**
 * Kater aus dem einfarbigen Logo als Wasserzeichen (Daria, 07.11.2026). Wird beim Laden der App vorbereitet, damit
 * das Zeichnen beim Teilen nicht warten muss.
 */
const catImage: HTMLImageElement | null = (() => {
  if (Platform.OS !== 'web' || typeof Image === 'undefined') return null;
  const xml = brandArt['logo-mono'].svg
    .replace(/#111111/gi, MARK)
    .replace(/viewBox="[^"]*"/, 'viewBox="0 1 34 34"')
    .replace(/width="[^"]*" height="[^"]*"/, 'width="136" height="136"');
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  return img;
})();

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

function drawSheet(
  text: string,
  title: string | undefined,
  index: number,
  count: number,
  fontKey?: string,
  author?: string,
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
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const align = m.body.textAlign === 'center' ? 'center' : 'left';
  let y = m.padY;

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

  // Unten: Kater und Name als Wasserzeichen links, Seitenzahl rechts (Daria, 07.11.2026)
  const markSize = W * 0.03;
  const baseline = H - Math.round(m.padY * 0.4);
  ctx.font = `${markSize}px "${font.regular}"`;
  ctx.fillStyle = MARK;
  ctx.textBaseline = 'bottom';
  let x = m.pad;
  const cat = Math.round(markSize * 1.9);
  if (catImage?.complete && catImage.naturalWidth) {
    ctx.drawImage(catImage, x, baseline - cat + Math.round(markSize * 0.25), cat, cat);
    x += cat + Math.round(markSize * 0.5);
  }
  ctx.textAlign = 'left';
  // Platz bis zur Seitenzahl; ein langer Name wird schmaler gezeichnet, statt sie zu überdecken
  const room = W - m.pad - x - (count > 1 ? markSize * 4 : 0);
  ctx.fillText(author?.trim() ? `${author.trim()} · KiezCoins` : 'KiezCoins', x, baseline, room);
  if (count > 1) {
    ctx.textAlign = 'right';
    ctx.fillText(`${index + 1}/${count}`, W - m.pad, baseline);
  }
  return canvas;
}

function canvasToFile(canvas: HTMLCanvasElement, name: string): File {
  const data = canvas.toDataURL('image/png');
  const bytes = atob(data.split(',')[1]);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return new File([buffer], name, { type: 'image/png' });
}

/** Alle Blätter als PNG-Dateien, unten Name und Kater. `null` außerhalb des Browsers. */
export function sheetImageFiles(pages: string[], title?: string, fontKey?: string, author?: string): File[] | null {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  return pages.map((p, i) =>
    canvasToFile(drawSheet(p, title, i, pages.length, fontKey, author), `kiezcoins-${String(i + 1).padStart(2, '0')}.png`),
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
