import { Platform } from 'react-native';

import { INK, INK_LINK, PAPER, RICH, SHEET_RATIO, sheetMetrics } from '../components/TextSheets';
import { font } from '../theme/tokens';

/**
 * Blätter eines Text-Posts als Bilder (Daria, 07.11.2026: „Slides verschicken, nicht raw Text“). Nur im Browser:
 * Jedes Blatt wird auf ein Canvas gezeichnet, 1080 × 1350 Pixel wie eine Instagram-Slide, mit denselben Maßen wie
 * in der App (sheetMetrics). Alles läuft ohne Warten, damit Safari das Teilen-Menü danach noch öffnen darf.
 */
export const SLIDE_WIDTH = 1080;

type Ctx = CanvasRenderingContext2D;

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

function drawSheet(text: string, title: string | undefined, index: number, count: number, fontKey?: string): HTMLCanvasElement {
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

  if (count > 1) {
    ctx.font = `${W * 0.03}px "${font.regular}"`;
    ctx.fillStyle = '#8E8E93';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${index + 1}/${count}`, W - m.pad, H - Math.round(m.padY * 0.4));
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

/** Alle Blätter als PNG-Dateien, `null` außerhalb des Browsers */
export function sheetImageFiles(pages: string[], title?: string, fontKey?: string): File[] | null {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  return pages.map((p, i) =>
    canvasToFile(drawSheet(p, title, i, pages.length, fontKey), `kiezcoins-${String(i + 1).padStart(2, '0')}.png`),
  );
}

/**
 * Bilder teilen: über das Teilen-Menü, wenn der Browser Dateien teilen kann, sonst als Download.
 * Gibt `false` zurück, wenn beides nicht geht.
 */
export async function shareImageFiles(files: File[], text?: string): Promise<boolean> {
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share === 'function' && nav.canShare?.({ files })) {
    try {
      await nav.share(text ? { files, text } : { files });
    } catch {
      // Abgebrochen: nichts weiter tun
    }
    return true;
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
    return true;
  } catch {
    return false;
  }
}
