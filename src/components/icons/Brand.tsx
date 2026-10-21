import { memo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { color } from '../../theme/tokens';
import { catSvg, coinsSvg, wordmarkSvg, type CatMood } from './brandSvgs';
import { crownSvg } from './crownSvg';
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

/** Krone aus Figma (icon/crown) mit Verlauf. Export 43 × 40, Striche daneben in Textfarbe. */
export const CrownIcon = memo(function CrownIcon({ height = 40 }: { height?: number }) {
  return (
    <SvgXml
      xml={crownSvg.svg(color.text.primary)}
      width={(crownSvg.width / crownSvg.height) * height}
      height={height}
    />
  );
});

/**
 * Einzelner Kristall ohne die Striche daneben: Diamant 1 aus Figma, auf den Stein zugeschnitten.
 * Grundlage für den Edenstein-Haufen.
 */
const crystalSvg = (() => {
  const full = diamondSvgs[1].svg('STRICH');
  const stone = full.replace(/<path[^>]*fill="STRICH"[^>]*\/>/g, '');
  return stone.replace(/viewBox="[^"]*"/, 'viewBox="7.2 0.6 19.8 33"').replace(/width="[^"]*" height="[^"]*"/, '');
})();
const CRYSTAL_RATIO = 19.8 / 33;

/**
 * Lage der Kristalle im Haufen, in Kristallbreiten (x) und -höhen (y), Reihenfolge wie sie dazukommen:
 * 1 steht, 2 daneben, 3 liegt davor, 4 liegt obendrauf, 5 und 6 hinten außen, 7 und 8 vorn außen,
 * 9 und 10 oben daneben. `z`: hinten 0, oben 1, vorn 2.
 */
const PILE: { x: number; y: number; z: number }[] = [
  { x: 0, y: 0, z: 0 },
  { x: 0.85, y: 0, z: 0 },
  { x: 0.42, y: 0.32, z: 2 },
  { x: 0.42, y: -0.5, z: 1 },
  { x: -0.85, y: 0, z: 0 },
  { x: 1.7, y: 0, z: 0 },
  { x: -0.42, y: 0.32, z: 2 },
  { x: 1.27, y: 0.32, z: 2 },
  { x: -0.42, y: -0.5, z: 1 },
  { x: 1.27, y: -0.5, z: 1 },
];

/**
 * Edensteine als Haufen: Jeder Stein ist ein Kristall, bis 10 übereinander und nebeneinander gestapelt.
 * Mehr als 10 zeigt den vollen Haufen. `height` ist die Höhe eines Kristalls.
 */
export const EdensteinPile = memo(function EdensteinPile({ amount, height = 24 }: { amount: number; height?: number }) {
  const n = Math.max(1, Math.min(10, Math.round(amount)));
  const w = height * CRYSTAL_RATIO;
  const used = PILE.slice(0, n);
  const minX = Math.min(...used.map((p) => p.x));
  const maxX = Math.max(...used.map((p) => p.x));
  const minY = Math.min(...used.map((p) => p.y));
  const maxY = Math.max(...used.map((p) => p.y));
  const order = used.map((p, i) => ({ ...p, i })).sort((a, b) => a.z - b.z || a.i - b.i);
  return (
    <View
      style={{ width: (maxX - minX + 1) * w, height: (maxY - minY + 1) * height }}
      accessible
      accessibilityLabel={`${amount} Edensteine`}
    >
      {order.map((p) => (
        <View key={p.i} style={{ position: 'absolute', left: (p.x - minX) * w, top: (p.y - minY) * height }}>
          <SvgXml xml={crystalSvg} width={w} height={height} />
        </View>
      ))}
    </View>
  );
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
