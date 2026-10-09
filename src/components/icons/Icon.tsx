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

export const Icon = memo(function Icon({ name, color = themeColor.text.primary, size }: IconProps) {
  const icon = iconSvgs[name];
  const height = size ?? icon.height;
  const width = (icon.width / icon.height) * height;
  return <SvgXml xml={icon.svg(color)} width={width} height={height} />;
});

export type { IconName };
