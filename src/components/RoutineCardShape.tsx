import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

import { color, radius } from '../theme/tokens';

// Routine-Karte im Stil der Abzeichen-Animationen (Daria, 2026-11-11, Variante K):
// leicht unregelmäßige, handgeschnittene Kante wie die Scheiben der Abzeichen, harte dunkle Unterkante,
// unten zwei flache Wellen in versetzten Tönen. Erledigte Tage leuchten als grüne Lampen mit Sticker-Rand.
// Entwürfe: Projektordner routine-karte/2026-11-11_abzeichen-stil-*.png
//
// Näher am Kater-Avatar (Daria, 2026-11-11): flach und gezeichnet statt plastisch. Kontur und Schatten in der
// dunklen Linienfarbe des Katers (#000027), der Schatten als harter, versetzter Umriss ohne Unschärfe.
// Der Verlauf unter dem Kater bewegt sich langsam, wenn die Karte etwas von Dir will.

/** Linienfarbe des Kater-Avatars: Kontur, Schatten, Rillen */
export const INK = '#000027';
/** Kontur und Schatten: dunkles Aubergine aus dem Verlauf statt Schwarzblau, weicher zur Karte (Daria, 2026-11-12) */
const LINE = '#3B2F3C';
const SHADOW_X = 2;
const SHADOW_Y = 4;
/** Grund: derselbe Farbverlauf wie unter dem Kater-Avatar (Daria, 2026-11-11) */
const GRUND = require('../../assets/kater/kater-avatar-grund.png');
/** Abdunkeln mit der Linienfarbe, damit die helle Schrift lesbar bleibt */
const GRUND_DIM = 0.5;
/** Wellen: Linienfarbe, halbdurchsichtig */
const WAVE_BACK = 'rgba(0, 0, 39, 0.25)';
const WAVE_FRONT = 'rgba(0, 0, 39, 0.45)';
/** Verlauf größer als die Karte, damit er sich darin bewegen kann */
const OVERSCAN = 1.3;

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

/** „Bewegung reduzieren“ des Systems; null, solange unbekannt */
function useReduceMotion(): boolean | null {
  const [still, setStill] = useState<boolean | null>(null);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(setStill);
  }, []);
  return still;
}

/** Zufallszahl zwischen a und b */
const zwischen = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Hintergrund der Routine-Karte. Der Inhalt liegt darüber.
 * `alive`: Die Karte will etwas von Dir. Dann wandert der Verlauf langsam, und ab und zu schaukelt die Karte
 * wie eine angeschlagene Glocke, in unregelmäßigen Abständen (Daria, 2026-11-11).
 */
export function RoutineCardSurface({ children, style, alive }: { children: ReactNode; style?: StyleProp<ViewStyle>; alive?: boolean }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || Math.abs(size.w - width) > 0.5 || Math.abs(size.h - height) > 0.5) setSize({ w: width, h: height });
  };
  const still = useReduceMotion();
  const move = alive && still === false;
  const drift = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const swing = useRef(new Animated.Value(0)).current;

  // Verlauf wandert: jedes Ziel anders, jede Strecke anders lang
  useEffect(() => {
    if (!move) return;
    let off = false;
    let a: Animated.CompositeAnimation | null = null;
    const next = () => {
      if (off) return;
      a = Animated.timing(drift, {
        toValue: { x: zwischen(-1, 1), y: zwischen(-1, 1) },
        duration: zwischen(5000, 9000),
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      });
      a.start(({ finished }) => finished && next());
    };
    next();
    return () => {
      off = true;
      a?.stop();
    };
  }, [move, drift]);

  // Glocke: kurzes, abklingendes Schaukeln, dazwischen 6 bis 16 Sekunden Ruhe
  useEffect(() => {
    if (!move) return;
    let off = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let a: Animated.CompositeAnimation | null = null;
    const ring = () => {
      if (off) return;
      const peak = zwischen(2.2, 3.2);
      const steps = [-peak, peak * 0.8, -peak * 0.55, peak * 0.3, -peak * 0.12, 0];
      a = Animated.sequence(
        steps.map((v, i) => Animated.timing(swing, { toValue: v, duration: i === 0 ? 110 : 140, easing: Easing.inOut(Easing.sin), useNativeDriver: true })),
      );
      a.start(({ finished }) => finished && wait());
    };
    const wait = () => {
      timer = setTimeout(ring, zwischen(6000, 16000));
    };
    wait();
    return () => {
      off = true;
      if (timer) clearTimeout(timer);
      a?.stop();
      swing.setValue(0);
    };
  }, [move, swing]);

  // Eigene ID je Karte: Im Browser gelten SVG-IDs für die ganze Seite
  const clipId = `routineCard${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const d = size ? wobblyPath(size.w, size.h, radius.xl) : '';
  const range = size ? { x: (size.w * (OVERSCAN - 1)) / 2, y: (size.h * (OVERSCAN - 1)) / 2 } : { x: 0, y: 0 };
  const rotate = swing.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] });
  return (
    <Animated.View onLayout={onLayout} style={[styles.wrap, style, { transform: [{ rotate }] }]}>
      {size ? (
        <>
          {/* Harter Schatten: derselbe Umriss, versetzt, in der Linienfarbe */}
          <Svg width={size.w + SHADOW_X} height={size.h + SHADOW_Y} style={styles.bg} pointerEvents="none">
            <Path d={d} fill={LINE} transform={`translate(${SHADOW_X} ${SHADOW_Y})`} />
          </Svg>
          <View style={[styles.clip, { width: size.w, height: size.h }]} pointerEvents="none">
            <Animated.View
              style={{
                position: 'absolute',
                left: -range.x,
                top: -range.y,
                width: size.w * OVERSCAN,
                height: size.h * OVERSCAN,
                transform: [
                  { translateX: Animated.multiply(drift.x, range.x * 0.85) },
                  { translateY: Animated.multiply(drift.y, range.y * 0.85) },
                ],
              }}
            >
              <Image source={GRUND} style={StyleSheet.absoluteFill} contentFit="fill" />
            </Animated.View>
          </View>
          <Svg width={size.w} height={size.h} style={styles.bg} pointerEvents="none">
            <Defs>
              <ClipPath id={clipId}>
                <Path d={d} />
              </ClipPath>
            </Defs>
            {/* Was außerhalb der gezeichneten Kante liegt, deckt der Grund des Bildschirms ab */}
            <Path d={`M0 0H${size.w}V${size.h}H0Z${d}`} fill={color.bg.screen} fillRule="evenodd" />
            <G clipPath={`url(#${clipId})`}>
              <Rect x={0} y={0} width={size.w} height={size.h} fill={INK} opacity={GRUND_DIM} />
              <Path d={wavePath(size.w, size.h, 8, size.h - 30, size.h - 23)} fill={WAVE_BACK} />
              <Path d={wavePath(size.w, size.h, 7, size.h - 20, size.h - 13)} fill={WAVE_FRONT} />
            </G>
            {/* Kontur wie beim Kater */}
            <Path d={d} fill="none" stroke={LINE} strokeWidth={2.5} />
          </Svg>
        </>
      ) : null}
      {children}
    </Animated.View>
  );
}

/** Lampe für einen erledigten Tag: flaches Gelbgrün mit Kontur, harter Schatten und Glanzstrich wie gezeichnet */
export function RoutineLamp() {
  const [w, setW] = useState(0);
  return (
    <View style={styles.lamp} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? (
        <Svg width={w} height={LAMP_H} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Rect x={0.75} y={0.75} width={w - 1.5} height={LAMP_H - 1.5} rx={(LAMP_H - 1.5) / 2} fill={LAMP_FILL} stroke={LINE} strokeWidth={1.5} />
          <Rect x={5} y={2.5} width={Math.max(0, Math.min(w * 0.55 - 5, 24))} height={2} rx={1} fill="rgba(255,255,255,0.7)" />
        </Svg>
      ) : null}
    </View>
  );
}

const LAMP_H = 9;
/** Gelbgrün des Kater-Avatars (Daria, 2026-11-12), vorher das Grün #89F269 */
const LAMP_FILL = '#E4FF5F';

const styles = StyleSheet.create({
  wrap: { position: 'relative', transformOrigin: 'top center' },
  bg: { position: 'absolute', left: 0, top: 0 },
  clip: { position: 'absolute', left: 0, top: 0, overflow: 'hidden', borderRadius: radius.xl },
  lamp: {
    flex: 1,
    height: LAMP_H,
    borderRadius: LAMP_H / 2,
    // Harter Schatten in der Linienfarbe, ohne Unschärfe
    boxShadow: `0 2px 0 ${LINE}`,
  },
});
