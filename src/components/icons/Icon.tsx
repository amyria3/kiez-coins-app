import { memo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { isRtl } from '../../data/texts';

import { color as themeColor, isInstagram } from '../../theme/tokens';
import { instagramSvgs } from './instagramSvgs';
import { iconSvgs, type IconName } from './svgs';

type IconProps = {
  name: IconName;
  color?: string;
  /** Höhe in pt; Breite skaliert mit. Ohne Angabe Originalgröße aus Figma. */
  size?: number;
};

/** Alle Icons etwas größer als angegeben (Daria, 21.10.2026), die Kamera nur leicht */
export const ICON_SCALE = 1.5;
const CAMERA_SCALE = 1.2;
/** Icons, die neben den anderen optisch kleiner wirken, etwas größer (Daria, 22.10.2026: das Zahnrad) */
const OPTICAL: Partial<Record<IconName, number>> = { settings: 1.18 };
const MIRRORED = new Set<IconName>(['chevron-left', 'chevron-right', 'send']);

/** Linien-Icons im Instagram-Look: size.icon 20 ergibt 24 pt wie bei Instagram */
const INSTAGRAM_SCALE = 1.2;

export const Icon = memo(function Icon({ name, color = themeColor.text.primary, size }: IconProps) {
  const line = isInstagram ? instagramSvgs[name] : undefined;
  if (line) {
    const h = Math.round((size ?? 20) * INSTAGRAM_SCALE);
    // Herz gefüllt, sobald es in der Herzfarbe erscheint (gefällt mir)
    const xml = line.svg(color, name === 'heart' && color === themeColor.accent.affection);
    const el = <SvgXml xml={xml} width={h} height={h} />;
    if (MIRRORED.has(name) && isRtl()) return <View style={{ transform: [{ scaleX: -1 }] }}>{el}</View>;
    return el;
  }
  const icon = iconSvgs[name];
  const height = Math.round((size ?? icon.height) * (name === 'camera' ? CAMERA_SCALE : ICON_SCALE) * (OPTICAL[name] ?? 1));
  const width = (icon.width / icon.height) * height;
  const svg = <SvgXml xml={icon.svg(color)} width={width} height={height} />;
  // Arabisch und Hebräisch: Pfeile und Senden zeigen in Leserichtung
  if (MIRRORED.has(name) && isRtl()) return <View style={{ transform: [{ scaleX: -1 }] }}>{svg}</View>;
  return svg;
});

export type { IconName };
