import { memo } from 'react';
import { SvgXml } from 'react-native-svg';

import { color } from '../../theme/tokens';
import { catSvg, coinsSvg, wordmarkSvg, type CatMood } from './brandSvgs';
import { diamondSvgs, type DiamondVariant } from './diamondSvgs';
import { ICON_SCALE } from './Icon';

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

/** Diamant aus Figma (icon/diamand/1–3), Originalgröße 35 pt hoch. Striche daneben in Textfarbe. */
export const DiamondIcon = memo(function DiamondIcon({
  variant = 1,
  height = 35,
}: {
  variant?: DiamondVariant;
  height?: number;
}) {
  const d = diamondSvgs[variant];
  return <SvgXml xml={d.svg(color.text.primary)} width={(d.width / d.height) * height} height={height} />;
});

/** Welcher Diamant zu wie vielen Edensteinen passt: 1–3 klein, 4–6 mittel, 7–10 groß */
const diamondFor = (amount?: number): DiamondVariant => (!amount || amount <= 3 ? 1 : amount <= 6 ? 2 : 3);

/**
 * Edenstein, ideelle Bounty in Gruppen. Zeigt den Diamanten aus Figma (DiamondIcon), etwas größer als
 * die angegebene Höhe (ICON_SCALE), damit er neben Text so kräftig wirkt wie die übrigen Icons.
 */
export const EdensteinIcon = memo(function EdensteinIcon({ height = 18, amount }: { height?: number; amount?: number }) {
  return <DiamondIcon variant={diamondFor(amount)} height={Math.round(height * ICON_SCALE)} />;
});

export type { CatMood, DiamondVariant };
