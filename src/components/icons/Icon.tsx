import { memo } from 'react';
import { SvgXml } from 'react-native-svg';

import { color as themeColor } from '../../theme/tokens';
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

export const Icon = memo(function Icon({ name, color = themeColor.text.primary, size }: IconProps) {
  const icon = iconSvgs[name];
  const height = Math.round((size ?? icon.height) * (name === 'camera' ? CAMERA_SCALE : ICON_SCALE));
  const width = (icon.width / icon.height) * height;
  return <SvgXml xml={icon.svg(color)} width={width} height={height} />;
});

export type { IconName };
