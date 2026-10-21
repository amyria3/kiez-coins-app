import { memo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { color } from '../../theme/tokens';
import { catSvg, coinsSvg, wordmarkSvg, type CatMood } from './brandSvgs';
import { crownSvg } from './crownSvg';
import { diamondSvgs, type DiamondVariant } from './diamondSvgs';
import { ICON_SCALE } from './Icon';
import { t } from '../../data/texts';

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
 * Einzelne Kristalle ohne die Striche daneben: die drei Diamanten aus Figma, auf den Stein zugeschnitten.
 * Grundlage für den Edenstein-Haufen.
 */
const CRYSTAL_CROP: Record<DiamondVariant, { x: number; y: number; w: number; h: number }> = {
  1: { x: 7.2, y: 0.6, w: 19.8, h: 33 },
  2: { x: 8.6, y: 0, w: 16.4, h: 35 },
  3: { x: 7.6, y: 0, w: 18.4, h: 35 },
};
const crystalSvgs = ([1, 2, 3] as DiamondVariant[]).map((v) => {
  const c = CRYSTAL_CROP[v];
  const stone = diamondSvgs[v].svg('STRICH').replace(/<path[^>]*fill="STRICH"[^>]*\/>/g, '');
  return {
    ratio: c.w / c.h,
    svg: stone
      .replace(/viewBox="[^"]*"/, `viewBox="${c.x} ${c.y} ${c.w} ${c.h}"`)
      .replace(/width="[^"]*" height="[^"]*"/, ''),
  };
});

/**
 * Lage der Kristalle im Haufen, in Kristallbreiten (x) und -höhen (y), in der Reihenfolge, wie sie dazukommen:
 * 1 steht, 2 daneben, 3 liegt davor, 4 liegt obendrauf, 5 und 6 hinten außen, 7 und 8 vorn außen,
 * 9 und 10 oben daneben. `z`: hinten 0, oben 1, vorn 2. Vorn größer, hinten etwas dunkler, jeder leicht gedreht,
 * die Typen wechseln sich ab.
 */
const PILE: { x: number; y: number; z: number; rot: number; scale: number; type: 0 | 1 | 2 }[] = [
  { x: 0, y: 0, z: 0, rot: -6, scale: 1, type: 0 },
  { x: 0.8, y: 0.05, z: 0, rot: 10, scale: 0.95, type: 1 },
  { x: 0.4, y: 0.45, z: 2, rot: -4, scale: 1.1, type: 2 },
  { x: 0.42, y: -0.52, z: 1, rot: 16, scale: 0.9, type: 1 },
  { x: -0.8, y: 0.1, z: 0, rot: -14, scale: 0.92, type: 2 },
  { x: 1.6, y: 0.1, z: 0, rot: 14, scale: 0.92, type: 0 },
  { x: -0.4, y: 0.48, z: 2, rot: 8, scale: 1.05, type: 1 },
  { x: 1.2, y: 0.48, z: 2, rot: -10, scale: 1.05, type: 0 },
  { x: -0.25, y: -0.46, z: 1, rot: -16, scale: 0.88, type: 0 },
  { x: 1.05, y: -0.46, z: 1, rot: 12, scale: 0.88, type: 2 },
];

/**
 * Edensteine als Haufen: Jeder Stein ist ein Kristall, bis 10 übereinander und nebeneinander gestapelt.
 * Mehr als 10 zeigt den vollen Haufen. `height` ist die Höhe eines Kristalls.
 */
export const EdensteinPile = memo(function EdensteinPile({ amount, height = 24 }: { amount: number; height?: number }) {
  const n = Math.max(1, Math.min(10, Math.round(amount)));
  const w = height * 0.58;
  const used = PILE.slice(0, n);
  const minX = Math.min(...used.map((p) => p.x));
  const maxX = Math.max(...used.map((p) => p.x));
  const minY = Math.min(...used.map((p) => p.y));
  const maxY = Math.max(...used.map((p) => p.y));
  const order = used.map((p, i) => ({ ...p, i })).sort((a, b) => a.z - b.z || a.i - b.i);
  return (
    <View
      style={{ width: (maxX - minX + 1.1) * w, height: (maxY - minY + 1.1) * height }}
      accessible
      accessibilityLabel={t('{amount} Edensteine', { amount })}
    >
      {order.map((p) => {
        const crystal = crystalSvgs[p.type];
        const h = height * p.scale;
        const cw = h * crystal.ratio;
        return (
          <View
            key={p.i}
            style={{
              position: 'absolute',
              left: (p.x - minX) * w + (w - cw) / 2,
              top: (p.y - minY) * height + (height - h),
              opacity: p.z === 0 && n > 2 ? 0.85 : 1,
              transform: [{ rotate: `${p.rot}deg` }],
            }}
          >
            <SvgXml xml={crystal.svg} width={cw} height={h} />
          </View>
        );
      })}
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
