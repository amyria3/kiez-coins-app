import { useId, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { ClipPath, Defs, G, Image as SvgImage, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { color, radius } from '../theme/tokens';

// Routine-Karte im Stil der Abzeichen-Animationen (Daria, 2026-11-11, Variante K):
// leicht unregelmäßige, handgeschnittene Kante wie die Scheiben der Abzeichen, harte dunkle Unterkante,
// unten zwei flache Wellen in versetzten Tönen. Erledigte Tage leuchten als grüne Lampen mit Sticker-Rand.
// Entwürfe: Projektordner routine-karte/2026-11-11_abzeichen-stil-*.png

/** Harte Unterkante unter der Karte, ohne Unschärfe */
const LIP = '#1C1C1F';
const LIP_OFFSET = 3;
/**
 * Grund: derselbe Farbverlauf wie unter dem Kater-Avatar (Daria, 2026-11-11), abgedunkelt mit Graphit,
 * damit die helle Schrift lesbar bleibt.
 */
const GRUND = require('../../assets/kater/kater-avatar-grund.png');
export const GRUND_DIM = 0.62;
/** Wellen: dunkle, halbdurchsichtige Schichten über dem Verlauf */
const WAVE_BACK = 'rgba(35, 35, 38, 0.35)';
const WAVE_FRONT = 'rgba(35, 35, 38, 0.6)';

/** Fester Startwert, damit jede Karte bei gleicher Größe dieselbe Kante hat */
function wobblyPath(w: number, h: number, r: number, amp = 2, seed = 11): string {
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280 - 0.5;
  };
  const n = 28;
  const per = 2 * (w + h);
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const d = (i / n) * per;
    let x: number;
    let y: number;
    if (d < w) [x, y] = [d, 0];
    else if (d < w + h) [x, y] = [w, d - w];
    else if (d < 2 * w + h) [x, y] = [w - (d - w - h), h];
    else [x, y] = [0, h - (d - 2 * w - h)];
    // In den Ecken auf die Rundung ziehen
    const cx = Math.min(Math.max(x, r), w - r);
    const cy = Math.min(Math.max(y, r), h - r);
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy);
    if (len > r) [x, y] = [cx + (dx / len) * r, cy + (dy / len) * r];
    // Nur nach außen oder innen verschieben, entlang der Kante bleibt der Punkt
    const nx = x <= r ? -1 : x >= w - r ? 1 : 0;
    const ny = y <= r ? -1 : y >= h - r ? 1 : 0;
    const a = rnd() * amp;
    pts.push([x + nx * a, y + ny * a]);
  }
  const f = (v: number) => v.toFixed(1);
  let p = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [px, py] = pts[(i + 1) % n];
    const [qx, qy] = pts[(i + 2) % n];
    p += `Q${f(px)} ${f(py)} ${f((px + qx) / 2)} ${f((py + qy) / 2)}`;
  }
  return `${p}Z`;
}

/** Flache Welle über die ganze Breite, `count` Bögen, Kamm bei `top`, Tal bei `base` */
function wavePath(w: number, h: number, count: number, top: number, base: number): string {
  let p = `M0 ${base}`;
  for (let i = 0; i < count; i++) p += `Q${((i + 0.5) * w) / count} ${top} ${((i + 1) * w) / count} ${base}`;
  return `${p}V${h}H0Z`;
}

/** Hintergrund der Routine-Karte. Der Inhalt liegt darüber. */
export function RoutineCardSurface({ children, style, dim }: { children: ReactNode; style?: StyleProp<ViewStyle>; dim?: number }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || Math.abs(size.w - width) > 0.5 || Math.abs(size.h - height) > 0.5) setSize({ w: width, h: height });
  };
  // Eigene ID je Karte: Im Browser gelten SVG-IDs für die ganze Seite
  const clipId = `routineCard${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const d = size ? wobblyPath(size.w, size.h, radius.xl) : '';
  return (
    <View onLayout={onLayout} style={[styles.wrap, style]}>
      {size ? (
        <Svg width={size.w} height={size.h + LIP_OFFSET} style={styles.bg} pointerEvents="none">
          <Defs>
            <ClipPath id={clipId}>
              <Path d={d} />
            </ClipPath>
          </Defs>
          <Path d={d} fill={LIP} transform={`translate(0 ${LIP_OFFSET})`} />
          <G clipPath={`url(#${clipId})`}>
            <SvgImage href={GRUND} x={0} y={0} width={size.w} height={size.h} preserveAspectRatio="none" />
            <Rect x={0} y={0} width={size.w} height={size.h} fill={color.bg.surface} opacity={dim ?? GRUND_DIM} />
            <Path d={wavePath(size.w, size.h, 8, size.h - 26, size.h - 20)} fill={WAVE_BACK} />
            <Path d={wavePath(size.w, size.h, 7, size.h - 18, size.h - 12)} fill={WAVE_FRONT} />
          </G>
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

/** Lampe für einen erledigten Tag: weicher Verlauf von Gelbgrün zu Grün, Glanzstrich, heller Sticker-Rand */
export function RoutineLamp() {
  const [w, setW] = useState(0);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View style={styles.lamp} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? (
        <Svg width={w} height={LAMP_H} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id={`lampFill${id}`} x1="0" y1="0" x2="1" y2="0.3">
              <Stop offset="0" stopColor="#B9F56E" />
              <Stop offset="0.5" stopColor={color.accent.confirmation} />
              <Stop offset="1" stopColor="#62DB86" />
            </LinearGradient>
            <RadialGradient id={`lampSpot${id}`} cx="0.3" cy="0.3" r="0.55">
              <Stop offset="0" stopColor="#E2FA8E" stopOpacity="1" />
              <Stop offset="1" stopColor="#E2FA8E" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={w} height={LAMP_H} rx={LAMP_H / 2} fill={`url(#lampFill${id})`} stroke={LAMP_RIM} strokeWidth={1.5} />
          <Rect x={0.75} y={0.75} width={w - 1.5} height={LAMP_H - 1.5} rx={(LAMP_H - 1.5) / 2} fill={`url(#lampSpot${id})`} />
          <Rect x={5} y={2.5} width={Math.max(0, Math.min(w * 0.55 - 5, 24))} height={2} rx={1} fill="rgba(255,255,255,0.6)" />
        </Svg>
      ) : null}
    </View>
  );
}

const LAMP_H = 8;
/** Sticker-Rand: helles Puder wie die Hauptschrift */
const LAMP_RIM = 'rgba(251, 239, 242, 0.85)';

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  bg: { position: 'absolute', left: 0, top: 0 },
  lamp: {
    flex: 1,
    height: LAMP_H,
    borderRadius: LAMP_H / 2,
    // Harte grüne Unterkante und leichter Schein
    boxShadow: '0 2px 0 #4E9E36, 0 0 10px rgba(137, 242, 105, 0.35)',
  },
});
