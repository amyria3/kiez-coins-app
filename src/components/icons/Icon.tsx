import { memo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { isRtl } from '../../data/texts';

import { color as themeColor, isFashionable } from '../../theme/tokens';
import { PH, fashionableSvgs, phXml, useIconPt } from './fashionableSvgs';
import type { PhosphorName } from './phosphorSvgs';
import { iconSvgs, type IconName } from './svgs';

type IconProps = {
  name: IconName;
  color?: string;
  /** Höhe in pt; Breite skaliert mit. Ohne Angabe Originalgröße aus Figma. */
  size?: number;
};

/** Alle Icons etwas größer als angegeben (Daria, 21.10.2026), die Kamera nur leicht */
export const ICON_SCALE = 1.5;
/** Kiez-Look: Icons aus der Figma-Sammlung, die nicht in Darias Stil gezeichnet sind, kommen aus Phosphor (Daria, 24.10.2026) */
const KIEZ_PHOSPHOR: Partial<Record<IconName, PhosphorName>> = { copy: 'copy' };
const CAMERA_SCALE = 1.2;
/** Optische Angleichung (Daria): Zahnrad größer (22.10.2026), Freundschaften 15 % größer und Schalter 20 % kleiner (25.10.2026) */
const OPTICAL: Partial<Record<IconName, number>> = { settings: 1.18, friends: 1.15, switch: 0.8 };
const MIRRORED = new Set<IconName>(['chevron-left', 'chevron-right', 'send', 'this-way']);


export const Icon = memo(function Icon({ name, color = themeColor.text.primary, size }: IconProps) {
  const iconPt = useIconPt();
  const kiezPh = isFashionable ? undefined : KIEZ_PHOSPHOR[name];
  const line = isFashionable ? fashionableSvgs[name] : kiezPh ? { svg: (c: string) => phXml(kiezPh, c) } : undefined;
  if (line) {
    // size.icon (20) ist die Größe der Hauptsymbole; kleinere Angaben im selben Verhältnis
    const h = Math.round(((size ?? 20) / 20) * iconPt);
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

/**
 * Phosphor-Icon ohne IconName (z. B. Karten im Konto), in beiden Looks: im Kiez-Look überall dort,
 * wo es kein handgezeichnetes Icon gibt (Daria, 24.10.2026). Größe wie Icon.
 */
export const PhIcon = memo(function PhIcon({ name, color = themeColor.text.primary, size }: { name: keyof typeof PH; color?: string; size?: number }) {
  const iconPt = useIconPt();
  const h = Math.round(((size ?? 20) / 20) * iconPt);
  return <SvgXml xml={phXml(PH[name], color)} width={h} height={h} />;
});

export type { IconName };
