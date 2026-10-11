import { memo } from 'react';
import { SvgXml } from 'react-native-svg';

import { color } from '../../theme/tokens';
import { catSvg, coinsSvg, wordmarkSvg, type CatMood } from './brandSvgs';

type CatProps = {
  mood?: CatMood;
  /** Höhe in pt (Original 39 pt) */
  height?: number;
};

/** Kater (Figma „Cat“, Varianten Mood=Default|High). */
export const Cat = memo(function Cat({ mood = 'default', height = 39 }: CatProps) {
  return (
    <SvgXml
      xml={catSvg(mood, color.accent.primary, color.text.primary)}
      width={(35 / 41) * height}
      height={height}
    />
  );
});

/** Schriftzug „KIEZ COINS“ */
export const Wordmark = memo(function Wordmark() {
  return <SvgXml xml={wordmarkSvg(color.accent.primary)} width={131.7} height={24.8} />;
});

/** icon/coins mit Verlauf, Standardgröße wie im BountyBadge (19×22) */
export const CoinsIcon = memo(function CoinsIcon({ height = 22 }: { height?: number }) {
  return <SvgXml xml={coinsSvg} width={(30 / 35) * height} height={height} />;
});

export type { CatMood };
