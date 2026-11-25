import { memo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { isRtl } from '../../data/texts';

import { isMono } from '../../theme/look';
import { color as themeColor } from '../../theme/tokens';
import { lineSvgs } from './lineSvgs';
import { iconSvgs, type IconName } from './svgs';

type IconProps = {
  name: IconName;
  color?: string;
  /** Höhe in pt; Breite skaliert mit. Ohne Angabe Originalgröße aus Figma. */
  size?: number;
  /** Waagerecht gespiegelt, z. B. die Hand „this-way“ als Zurück (Daria, 27.10.2026). In Arabisch und Hebräisch zeigt sie dann wieder nach rechts. */
  flip?: boolean;
};

/** Alle Icons etwas größer als angegeben (Daria, 21.10.2026), die Kamera nur leicht */
export const ICON_SCALE = 1.5;
const CAMERA_SCALE = 1.2;
/** Linien-Icons im Look Mono: etwas kleiner als Darias Icons (×1,5), da sie die Fläche voll ausnutzen */
const LINE_SCALE = 1.3;
/** Optische Angleichung (Daria): Zahnrad größer (22.10.2026), Schalter 20 % kleiner (25.10.2026).
 *  Freundschaften: neues Icon mit zwei Figuren (Daria, 2026-11-17), schmaler als die Nachbarn, daher 25 % größer */
const OPTICAL: Partial<Record<IconName, number>> = { settings: 1.18, friends: 1.25, switch: 0.8 };
const MIRRORED = new Set<IconName>(['chevron-left', 'chevron-right', 'external', 'send', 'this-way']);
/**
 * Große Icons im Kiez-Look (Daria, 2026-11-05): Darias Symbole ab 18 pt in #EEE0C9 (color.icon.large) statt in Textfarbe.
 * Pfeile, Plus, Minus und Schließen bleiben in Textfarbe, ebenso alle Icons mit eigener Farbe.
 */
const LARGE_MIN = 18;
const GLYPHS = new Set<IconName>(['chevron-left', 'chevron-right', 'external', 'plus', 'minus', 'close']);

export const Icon = memo(function Icon({ name, color = themeColor.text.primary, size, flip }: IconProps) {
  const mirror = (MIRRORED.has(name) && isRtl()) !== !!flip;
  // Mono (2026-11-25): Linien-Icons, quadratisch, so hoch wie Darias Icons in derselben Größe. Das Herz ist gefüllt,
  // sobald es in der Herzfarbe erscheint (gefällt mir).
  const line = isMono ? lineSvgs[name] : undefined;
  if (line) {
    const h = Math.round((size ?? 20) * LINE_SCALE);
    const el = <SvgXml xml={line(color, name === 'heart' && color === themeColor.accent.affection)} width={h} height={h} />;
    if (mirror) return <View style={{ transform: [{ scaleX: -1 }] }}>{el}</View>;
    return el;
  }
  const icon = iconSvgs[name];
  if (color === themeColor.text.primary && !GLYPHS.has(name) && (size ?? icon.height) >= LARGE_MIN) {
    color = themeColor.icon.large;
  }
  const height = Math.round((size ?? icon.height) * (name === 'camera' ? CAMERA_SCALE : ICON_SCALE) * (OPTICAL[name] ?? 1));
  const width = (icon.width / icon.height) * height;
  const svg = <SvgXml xml={icon.svg(color)} width={width} height={height} />;
  // Arabisch und Hebräisch: Pfeile und Senden zeigen in Leserichtung
  if (mirror) return <View style={{ transform: [{ scaleX: -1 }] }}>{svg}</View>;
  return svg;
});

export type { IconName };
