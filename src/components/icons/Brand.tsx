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

/** Edenstein (noch nicht in Figma): geschliffener Stein in Grün, ideelle Bounty in Gruppen */
export const EdensteinIcon = memo(function EdensteinIcon({ height = 18 }: { height?: number }) {
  const c = color.accent.confirmation;
  const xml = `<svg width="24" height="22" viewBox="0 0 24 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.2 1.6H17.6L22.4 7.4L12 20.6L1.6 7.4L6.2 1.6Z" fill="${c}" fill-opacity="0.22" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/><path d="M1.9 7.4H22.1M8.3 7.4L12 20.1L15.7 7.4M6.4 1.9L8.3 7.4L12 1.9L15.7 7.4L17.5 1.9" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
  return <SvgXml xml={xml} width={(24 / 22) * height} height={height} />;
});

export type { CatMood };
