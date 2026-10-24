import { memo, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { color, isInstagram } from '../../theme/tokens';
import { catSvg, coinsSvg, wordmarkSvg, type CatMood } from './brandSvgs';
import { brandArt } from './brandArt';
import { crownSvg } from './crownSvg';
import { diamondSvgs, type DiamondVariant } from './diamondSvgs';
import { ICON_SCALE } from './Icon';
import { strokeFor } from './instagramSvgs';
import { t } from '../../data/texts';

type CatProps = {
  mood?: CatMood;
  /** Höhe in pt (Original 39 pt) */
  height?: number;
};

/** Kater mit Sonnenbrille (Daria, 22.10.2026): normal, high (aufgeregt) und money (Dollar in den Gläsern). */
const CAT_ART: Record<CatMood, string> = { default: 'kater-normal', high: 'kater-high', money: 'kater-money' };
export const Cat = memo(function Cat({ mood = 'default', height = 39 }: CatProps) {
  const art = brandArt[CAT_ART[mood]];
  if (!art) {
    return <SvgXml xml={catSvg(mood === 'money' ? 'high' : mood, color.brand.signature, color.text.primary)} width={(35 / 41) * height} height={height} />;
  }
  return <SvgXml xml={signature(art.svg)} width={(art.width / art.height) * height} height={height} />;
});

/** Lila aus Figma (#7E94FF) gegen die Signaturfarbe des Looks tauschen. Im Kiez-Look bleibt alles, wie es ist. */
const signature = (svg: string) => (isInstagram ? svg.replace(/#7E94FF/gi, color.brand.signature) : svg);

/** Logo: Kater und Schriftzug „KiezCoins“ (assets/brand/logo.svg) */
/**
 * Logo (Daria, 24.10.2026): Kiez-Look `assets/brand/logo.svg`, Lila mit Kater; Instagram-Look
 * `assets/brand/logo-mono.svg`, Kater mit Brille und Wortmarke einfarbig in Textfarbe.
 */
export const Logo = memo(function Logo({ height = 26 }: { height?: number }) {
  if (isInstagram) {
    const mono = brandArt['logo-mono'];
    const xml = mono.svg.replace(/#111111/gi, color.text.primary);
    return <SvgXml xml={xml} width={(mono.width / mono.height) * height} height={height} />;
  }
  const art = brandArt.logo;
  return <SvgXml xml={art.svg} width={(art.width / art.height) * height} height={height} />;
});

/** Schriftzug „KIEZ COINS“ (alt, für Stellen ohne Kater) */
export const Wordmark = memo(function Wordmark() {
  return <SvgXml xml={wordmarkSvg(color.brand.signature)} width={131.7} height={24.8} />;
});

/** Zwei Münzen hintereinander: vorn ein ganzer Kreis, hinten nur der Bogen, der hervorschaut */
const COINS_LINE = (c: string, px: number) =>
  `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="${c}" stroke-width="${strokeFor(px)}" stroke-linecap="round" stroke-linejoin="round"><circle cx="14.5" cy="14.5" r="6.5"/><path d="M8.2 15.8A6.5 6.5 0 1 1 15.8 8.2"/></svg>`;

/** icon/coins mit Verlauf, Standardgröße wie im BountyBadge (19×22) */
export const CoinsIcon = memo(function CoinsIcon({ height = 22 }: { height?: number }) {
  // Instagram-Look: zwei Münzen als Kontur, Linie 2 mit runden Enden, in Textfarbe (Daria, 23.10.2026)
  if (isInstagram) return <SvgXml xml={COINS_LINE(color.text.primary, height)} width={height} height={height} />;
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
  // Instagram-Look: glatter Stein ohne Striche, etwas kleiner, da die Striche als Rahmen fehlen
  if (isInstagram) return <SvgXml xml={GEM_SVG(height * 0.8)} width={gem.ratio * height * 0.8} height={height * 0.8} />;
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
 * Edenstein im Look „Instagram“ (Daria, 24.10.2026): Brillant als Kontur in Textfarbe wie alle Icons, mit Gürtel
 * und zwei Facetten, runde Enden und Ecken. Ab und zu blitzt der Verlauf Amethyst auf (InstaGem).
 * Er steht als Angabe neben seiner Zahl: kleiner als die Aktions-Icons, ohne Bewegung und ohne Druckfläche,
 * damit er nicht wie ein Knopf wirkt.
 */
const GEM_BOX = { x: 2.4, y: 3.5, w: 19.2, h: 17.2 };
const GEM_PATHS =
  '<path d="M8.3 4.5h7.4c.6 0 1.2.3 1.6.7l2.9 3.4c.5.6.5 1.4 0 2l-7.2 8.6c-.5.6-1.5.6-2 0L3.8 10.6c-.5-.6-.5-1.4 0-2l2.9-3.4c.4-.4 1-.7 1.6-.7z"/><path d="M3.6 9.6h16.8M9.6 4.6 8.2 9.6 12 19.2M14.4 4.6l1.4 5L12 19.2"/>';
/** Verlauf, der aufblitzt */
const GEM_FLASH = ['#F783AC', '#7048E8'] as const;
/** Stein mit gleich kräftiger Linie: `px` ist die dargestellte Höhe, `stroke` Farbe oder Verlauf */
const GEM_SVG = (px: number, stroke: string = color.text.primary, defs = '') =>
  `<svg viewBox="${GEM_BOX.x} ${GEM_BOX.y} ${GEM_BOX.w} ${GEM_BOX.h}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="${stroke}" stroke-width="${strokeFor(px, 2, GEM_BOX.h)}" stroke-linecap="round" stroke-linejoin="round">${defs}${GEM_PATHS}</svg>`;
const GEM_GRADIENT_SVG = (px: number, id: string) =>
  GEM_SVG(
    px,
    `url(#${id})`,
    `<defs><linearGradient id="${id}" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${GEM_FLASH[0]}"/><stop offset="1" stop-color="${GEM_FLASH[1]}"/></linearGradient></defs>`,
  );
const gem = { ratio: GEM_BOX.w / GEM_BOX.h, svg: GEM_SVG(GEM_BOX.h) };
/** Kristall je Typ: im Instagram-Look immer der glatte Stein */
const stoneOf = (type: number) => (isInstagram ? gem : crystalSvgs[type]);

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
        const crystal = stoneOf(p.type);
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
              // Glatter Stein liegt gerade, damit der Haufen ruhig und symmetrisch wirkt
              transform: [{ rotate: `${isInstagram ? 0 : p.rot}deg` }],
            }}
          >
            <SvgXml xml={isInstagram ? GEM_SVG(h) : crystal.svg} width={cw} height={h} />
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

const SPARKLE = '<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M5 0C5.4 3.3 6.7 4.6 10 5C6.7 5.4 5.4 6.7 5 10C4.6 6.7 3.3 5.4 0 5C3.3 4.6 4.6 3.3 5 0Z" fill="#FFFFFF"/></svg>';

/**
 * Unruhiges Wandern zwischen -1 und 1: jedes Stück mit neuem Ziel und neuer Dauer, ab und zu ein kurzer Ruck.
 * So wiederholt sich nichts, die Bewegung wirkt lebendig und ein wenig sprunghaft.
 */
function useWander(run: boolean, slow: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run) return;
    let alive = true;
    const step = () => {
      if (!alive) return;
      const jolt = Math.random() < 0.18;
      Animated.timing(v, {
        toValue: (Math.random() * 2 - 1) * (jolt ? 1 : 0.6),
        duration: jolt ? 160 + Math.random() * 180 : slow * (0.5 + Math.random()),
        easing: jolt ? Easing.out(Easing.back(2.2)) : Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }).start(({ finished }) => finished && step());
    };
    step();
    return () => {
      alive = false;
      v.stopAnimation();
    };
  }, [v, run, slow]);
  return v;
}

/** Schubs fürs Scrollen: Der Feed meldet, wie weit er sich bewegt; jeder Edenstein reagiert auf seine eigene Art. */
const kickListeners = new Set<(delta: number) => void>();
export function nudgeCrystals(delta: number) {
  if (!delta) return;
  kickListeners.forEach((l) => l(delta));
}

/** Eigene Antwort auf den Schubs: Stärke, Richtung, Verzögerung und Federung je Stein verschieden */
function useScrollKick(run: boolean) {
  const v = useRef(new Animated.Value(0)).current;
  const feel = useRef({
    gain: 0.6 + Math.random() * 0.8,
    delay: Math.random() * 140,
    friction: 2.4 + Math.random() * 2.2,
    tension: 40 + Math.random() * 45,
  }).current;
  useEffect(() => {
    if (!run) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const listener = (delta: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        v.stopAnimation();
        v.setValue(Math.max(-1, Math.min(1, (delta / 40) * feel.gain)));
        Animated.spring(v, { toValue: 0, friction: feel.friction, tension: feel.tension, useNativeDriver: true }).start();
      }, feel.delay);
    };
    kickListeners.add(listener);
    return () => {
      kickListeners.delete(listener);
      clearTimeout(timer);
    };
  }, [v, run, feel]);
  return v;
}

/** Aus einer Kennung (z. B. Challenge-ID) eine feste Zahl, damit jeder Stein sein eigenes Aussehen behält */
function hashSeed(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Ein einzelner, großer Edenstein, der lebt (Daria, 22.10.2026):
 * 1. Schweben: Er hebt, senkt und neigt sich unruhig, mit wechselndem Tempo und gelegentlichem Ruck.
 *    Beim Scrollen im Feed hängt er nach und federt zurück (nudgeCrystals).
 * 2. Funkeln: In unregelmäßigen Abständen blitzt oben am Stein ein Lichtstern auf, der Stein wird dabei kurz größer.
 * Mit „Bewegung reduzieren“ steht er still. `height` ist die Höhe des Kristalls; er darf über seinen Rahmen ragen.
 */
/** `calm`: ruht, ohne Bewegung und Funkeln (z. B. wenn es nichts zu holen gibt) */
export const LivingCrystal = memo(function LivingCrystal(props: { height?: number; amount?: number; seed?: string; calm?: boolean }) {
  return isInstagram ? <InstaGem {...props} /> : <KiezCrystal {...props} />;
});

/**
 * Edenstein im Instagram-Look: steht still, 46 % von `height` hoch (Daria, 24.10.2026: 55 % war zu groß),
 * und blitzt alle 6 bis 14 Sekunden im Verlauf auf: 350 ms einblenden, 500 ms halten, 650 ms ausblenden.
 * `calm` und „Bewegung reduzieren“: kein Aufblitzen.
 */
function InstaGem({ height = 48, seed, calm }: { height?: number; seed?: string; calm?: boolean }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
  }, []);
  const flash = useRef(new Animated.Value(0)).current;
  const id = useRef(`gem-${seed ? hashSeed(seed) : Math.floor(Math.random() * 1e9)}-${Math.floor(Math.random() * 1e6)}`).current;
  useEffect(() => {
    if (reduced || calm) return;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(flash, { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.delay(500),
          Animated.timing(flash, { toValue: 0, duration: 650, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]).start(({ finished }) => finished && next());
      }, 6000 + Math.random() * 8000);
    };
    next();
    return () => {
      clearTimeout(timer);
      flash.stopAnimation();
    };
  }, [flash, reduced, calm]);
  const gemH = Math.round(height * 0.46);
  const w = gemH * gem.ratio;
  return (
    <View style={{ width: w, height, justifyContent: 'center' }}>
      <SvgXml xml={GEM_SVG(gemH)} width={w} height={gemH} />
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: (height - gemH) / 2, opacity: flash }}>
        <SvgXml xml={GEM_GRADIENT_SVG(gemH, id)} width={w} height={gemH} />
      </Animated.View>
    </View>
  );
}

const KiezCrystal = memo(function KiezCrystal({
  height = 48,
  seed,
  calm,
}: {
  height?: number;
  amount?: number;
  seed?: string;
  calm?: boolean;
}) {
  const [reduced, setStill] = useState(false);
  const still = reduced || !!calm;
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => {});
  }, []);
  const bob = useWander(!still, 1500);
  const tilt = useWander(!still, 2100);
  const drift = useWander(!still, 2700);
  const scrollKick = useScrollKick(!still);
  // Je Kennung ein anderer Kristall, mal gespiegelt, mit eigener Grundneigung
  const look = useRef(seed ? hashSeed(seed) : Math.floor(Math.random() * 2 ** 31)).current;
  const flash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        flash.setValue(0);
        Animated.timing(flash, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(next);
      }, 2500 + Math.random() * 4500);
    };
    next();
    return () => clearTimeout(timer);
  }, [flash, still]);
  const crystal = stoneOf(look % 3);
  // Glatter Stein: nie gespiegelt oder schief, er schwebt nur und funkelt
  const mirror = !isInstagram && (look >> 3) % 2 === 1;
  const lean = isInstagram ? 0 : (((look >> 5) % 13) - 6) * 1.5;
  const tiltRange = isInstagram ? ['0deg', '0deg'] : ['-22deg', '22deg'];
  // Glatter Stein ist breiter als hoch: auf 55 % der Höhe gezeichnet, damit er so breit ist wie der Kristall
  const gemH = isInstagram ? height * 0.55 : height;
  const w = gemH * crystal.ratio;
  const star = height * 0.42;
  return (
    <Animated.View
      style={{
        width: w,
        height,
        justifyContent: 'center',
        transform: [
          { translateX: drift.interpolate({ inputRange: [-1, 1], outputRange: [-height * 0.03, height * 0.03] }) },
          {
            translateY: Animated.add(
              bob.interpolate({ inputRange: [-1, 1], outputRange: [height * 0.05, -height * 0.05] }),
              // Beim Scrollen hängt der Stein etwas nach und federt zurück
              scrollKick.interpolate({ inputRange: [-1, 1], outputRange: [-height * 0.18, height * 0.18] }),
            ),
          },
          {
            rotate: Animated.add(tilt, scrollKick.interpolate({ inputRange: [-1, 1], outputRange: [1.4, -1.4] })).interpolate({
              inputRange: [-2.4, 2.4],
              outputRange: tiltRange,
            }),
          },
          { rotate: `${lean}deg` },
          { scale: flash.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 1.08, 1] }) },
          { scaleX: mirror ? -1 : 1 },
        ],
      }}
    >
      <SvgXml xml={isInstagram ? GEM_SVG(gemH) : crystal.svg} width={w} height={gemH} />
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: height * 0.02,
          right: -star * 0.3,
          width: star,
          height: star,
          opacity: flash.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 0] }),
          transform: [
            { scale: flash.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, 1, 0.4] }) },
            { rotate: flash.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) },
          ],
        }}
      >
        <SvgXml xml={SPARKLE} width={star} height={star} />
      </Animated.View>
    </Animated.View>
  );
});

export type { CatMood, DiamondVariant };
