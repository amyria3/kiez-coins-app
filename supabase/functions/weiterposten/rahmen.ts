// Rahmen für Weiterposts (Daria, 13.11.2026): dasselbe Bild wie beim Teilen im Browser (src/lib/sheetImages.ts,
// framePhotoFiles), hier auf dem Server gezeichnet, damit es auf allen Geräten gleich aussieht.
// Weißer Rand, oben links Profilbild und Name, unten rechts das Logo (abschaltbar), Foto mit runden Ecken.
// Die Deno-Fassung: Die npm-Fassung braucht eine native Datei, die es im Supabase-Edge-Runtime nicht gibt
// (Absturz beim Start, 13.11.2026).
import { Image, TextLayout } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';
import { decodeBase64 } from 'jsr:@std/encoding@1/base64';

import { LOGO_PNG } from './logo.ts';

// imagescript schreibt Text über Deno.core.encode, das es seit Deno 2 nicht mehr gibt. Ersatz mit TextEncoder.
const deno = Deno as unknown as { core?: { encode?: unknown; decode?: unknown } };
if (!deno.core?.encode) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const core = { ...(deno.core ?? {}), encode: (s: string) => encoder.encode(s), decode: (b: Uint8Array) => decoder.decode(b) };
  try {
    Object.defineProperty(Deno, 'core', { value: core, configurable: true });
  } catch {
    // Dann ohne Namen im Rahmen (renderText schlägt fehl, siehe unten)
  }
}

export type Look = { frame: boolean; watermark: boolean };
export const FULL_LOOK: Look = { frame: true, watermark: true };

const W = 1080;
const PAPER = 0xffffffff;
const INK = 0x232326ff;
/** Schrift wie in der App (Karla, halbfett). Lädt beim ersten Rahmen, danach aus dem Speicher. */
const FONT_URL = 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/karla@0.4.2/600SemiBold/Karla_600SemiBold.ttf';

let fontBytes: Promise<Uint8Array | null> | undefined;
function loadFont() {
  fontBytes ??= fetch(FONT_URL)
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`font ${res.status}`))))
    .then((buffer) => new Uint8Array(buffer))
    .catch(() => {
      fontBytes = undefined;
      return null;
    });
  return fontBytes;
}

let logo: Promise<Image> | undefined;
const loadLogo = () => (logo ??= Image.decode(decodeBase64(LOGO_PNG)) as Promise<Image>);

/** Profilbild rund; ohne Bild ein Verlauf in Lila und Rosa mit Initialen wie in der App */
async function avatarImage(d: number, name: string, bytes: Uint8Array | undefined, font: Uint8Array | null): Promise<Image> {
  if (bytes) {
    try {
      const img = (await Image.decode(bytes)) as Image;
      const side = Math.min(img.width, img.height);
      img.crop(Math.round((img.width - side) / 2), Math.round((img.height - side) / 2), side, side);
      img.resize(d, d);
      return img.cropCircle();
    } catch {
      // Initialen
    }
  }
  const from = [0x7e, 0x94, 0xff];
  const to = [0xff, 0xb2, 0xe5];
  const circle = new Image(d, d).fill((x, y) => {
    const t = (x + y) / (2 * d);
    const [r, g, b] = from.map((c, i) => Math.round(c + (to[i] - c) * t));
    return Image.rgbaToColor(r, g, b, 255);
  });
  const initials = name
    .split(/[\s*]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  if (font && initials) {
    const text = (await Image.renderText(font, Math.round(d * 0.4), initials, 0xffffffff)) as Image;
    circle.composite(text, Math.round((d - text.width) / 2), Math.round((d - text.height) / 2));
  }
  return circle.cropCircle();
}

/**
 * Foto im Rahmen als JPEG. `author.avatar`: Bytes des Profilbilds, falls vorhanden.
 * Maße wie in framePhotoFiles: 1080 breit, Rand 6 %, Foto zwischen 4:3 quer und 4:5 hoch, mittig beschnitten.
 */
export async function framePhoto(
  photoBytes: Uint8Array,
  author: { name: string; avatar?: Uint8Array } | undefined,
  look: Look,
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const photo = (await Image.decode(photoBytes)) as Image;
  const name = author?.name.trim();
  const font = name ? await loadFont() : null;

  const side = Math.round(W * 0.06);
  const inner = W - 2 * side;
  const ratio = Math.min(1.25, Math.max(0.75, photo.height / photo.width));
  const ph = Math.round(inner * ratio);
  const srcW = Math.min(photo.width, photo.height / ratio);
  const srcH = srcW * ratio;
  const headH = name ? Math.round(W * 0.17) : side;
  const footH = look.watermark ? Math.round(W * 0.15) : side;
  const H = headH + ph + footH;

  const canvas = new Image(W, H).fill(PAPER);

  if (name) {
    const d = Math.round(W * 0.085);
    const top = Math.round((headH - d) / 2);
    canvas.composite(await avatarImage(d, name, author?.avatar, font), side, top);
    if (font) {
      const nameSize = Math.round(W * 0.034);
      const x = side + d + Math.round(nameSize * 0.6);
      const maxWidth = inner - (x - side);
      const text = (await Image.renderText(font, nameSize, name, INK, new TextLayout({ wrapStyle: 'char', maxWidth: 100_000 }))) as Image;
      if (text.width > maxWidth) text.crop(0, 0, maxWidth, text.height);
      canvas.composite(text, x, Math.round(top + (d - text.height) / 2));
    }
  }

  photo.crop(Math.round((photo.width - srcW) / 2), Math.round((photo.height - srcH) / 2), Math.round(srcW), Math.round(srcH));
  photo.resize(inner, ph);
  photo.roundCorners(Math.round(W * 0.02));
  canvas.composite(photo, side, headH);

  if (look.watermark) {
    const mark = await loadLogo();
    const bottom = H - Math.round(footH * 0.36);
    canvas.composite(mark, W - side - mark.width, bottom - mark.height);
  }

  return { bytes: await canvas.encodeJPEG(90), width: W, height: H };
}
