import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Text } from './T';
import { t } from '../data/texts';
import { color, radius, space, text } from '../theme/tokens';

// ---------- Farben umrechnen ----------

export type Hsl = { h: number; s: number; l: number };

/** „#RRGGBB“ → HSL (h 0–360, s und l 0–100) */
export function hexToHsl(hex: string): Hsl {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

const css = ({ h, s, l }: Hsl) => `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;

// ---------- Rad ----------

const noScroll = (Platform.OS === 'web' ? { touchAction: 'none' } : null) as object | null;

const HUES = 48;
const RINGS = 6;

function sector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
  return `M ${p(r0, a0)} L ${p(r1, a0)} A ${r1} ${r1} 0 0 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 0 0 ${p(r0, a0)} Z`;
}

/**
 * HSL-Farbrad (Daria, 2026-11-10): Farbton rundherum, Sättigung von innen (grau) nach außen (kräftig).
 * Darunter ein Regler für die Helligkeit. Ziehen oder Tippen wählt die Farbe.
 */
export function ColorWheel({ value, onChange, size = 240 }: { value: string; onChange: (hex: string) => void; size?: number }) {
  const [hsl, setHsl] = useState<Hsl>(() => (/^#[0-9A-Fa-f]{6}$/.test(value) ? hexToHsl(value) : { h: 230, s: 60, l: 90 }));
  // Von außen gesetzte Farbe übernehmen (Palette, Hex-Feld), ohne eigene Bewegungen zu stören
  const last = useRef(value);
  useEffect(() => {
    if (value === last.current || !/^#[0-9A-Fa-f]{6}$/.test(value)) return;
    last.current = value;
    setHsl(hexToHsl(value));
  }, [value]);

  const set = (next: Hsl) => {
    setHsl(next);
    const hex = hslToHex(next);
    last.current = hex;
    onChange(hex);
  };

  const r = size / 2;
  const segments = useMemo(() => {
    const out: { d: string; fill: string }[] = [];
    for (let i = 0; i < HUES; i++) {
      const a0 = (i / HUES) * 2 * Math.PI - Math.PI / 2;
      const a1 = ((i + 1.05) / HUES) * 2 * Math.PI - Math.PI / 2;
      for (let j = 0; j < RINGS; j++) {
        out.push({
          d: sector(r, r, (j / RINGS) * r, ((j + 1.02) / RINGS) * r, a0, a1),
          fill: css({ h: ((i + 0.5) / HUES) * 360, s: ((j + 0.5) / RINGS) * 100, l: Math.min(Math.max(hsl.l, 15), 85) }),
        });
      }
    }
    return out;
    // Die Helligkeit des Rads folgt der gewählten, in Grenzen, damit der Farbton erkennbar bleibt
  }, [r, Math.round(hsl.l / 5)]);

  const pick = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const dx = locationX - r;
    const dy = locationY - r;
    const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
    const s = Math.min(1, Math.hypot(dx, dy) / r) * 100;
    set({ ...hsl, h, s });
  };

  const markerA = (hsl.h / 360) * 2 * Math.PI - Math.PI / 2;
  const markerR = (hsl.s / 100) * r;

  // Helligkeitsregler
  const [barWidth, setBarWidth] = useState(0);
  const pickL = (e: GestureResponderEvent) => {
    if (!barWidth) return;
    set({ ...hsl, l: Math.min(100, Math.max(0, (e.nativeEvent.locationX / barWidth) * 100)) });
  };

  return (
    <View style={styles.wrap}>
      <View
        // Im Browser scrollt die Seite sonst beim Ziehen mit
        style={[{ width: size, height: size }, noScroll]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={pick}
        onResponderMove={pick}
        accessibilityRole="adjustable"
        accessibilityLabel={t('Farbrad')}
      >
        <Svg width={size} height={size} pointerEvents="none">
          {segments.map((seg, i) => (
            <Path key={i} d={seg.d} fill={seg.fill} />
          ))}
          <Circle
            cx={r + markerR * Math.cos(markerA)}
            cy={r + markerR * Math.sin(markerA)}
            r={11}
            fill={css(hsl)}
            stroke="#FFFFFF"
            strokeWidth={3}
          />
        </Svg>
      </View>
      <Text style={styles.label}>Helligkeit</Text>
      <View
        style={[styles.bar, noScroll]}
        onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={pickL}
        onResponderMove={pickL}
        accessibilityRole="adjustable"
        accessibilityLabel={t('Helligkeit')}
      >
        {barWidth ? (
          <Svg width={barWidth} height={28} pointerEvents="none">
            <Defs>
              <LinearGradient id="hell" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={css({ ...hsl, l: 0 })} />
                <Stop offset="0.5" stopColor={css({ ...hsl, l: 50 })} />
                <Stop offset="1" stopColor={css({ ...hsl, l: 100 })} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={barWidth} height={28} rx={14} fill="url(#hell)" />
            <Circle cx={Math.min(barWidth - 14, Math.max(14, (hsl.l / 100) * barWidth))} cy={14} r={11} fill={css(hsl)} stroke="#FFFFFF" strokeWidth={3} />
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space[12] },
  label: { ...text.caption, color: color.text.secondary, alignSelf: 'flex-start' },
  bar: { alignSelf: 'stretch', height: 28, borderRadius: radius.full },
});
