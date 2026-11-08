import { iconSvgs } from './icons/svgs';

/**
 * Formen aus Darias Icon „Switch“ für Schalter und den Modus-Umschalter (Daria, 08.11.2026).
 * Das Icon besteht aus zwei Teilpfaden: der Spur (0…64 × 0…35) und dem Knopf (5,03…32,87 × 5,01…31,33).
 */
const d = /\sd="([^"]+)"/.exec(iconSvgs.switch.svg('#000'))?.[1] ?? '';
const [TRACK = '', KNOB = ''] = d.split(/(?=M)/).map((s) => s.trim()).filter(Boolean);

export const SWITCH_TRACK = { path: TRACK, x0: 0, x1: 64, y0: 0, y1: 35 };
export const SWITCH_KNOB = { path: KNOB, x0: 5.03, x1: 32.87, y0: 5.01, y1: 31.33 };

/**
 * Passt eine gezeichnete Form auf Breite × Höhe an, ohne Knicke: Die Höhe skaliert gleichmäßig, die zusätzliche
 * Breite kommt mit weich ein- und auslaufender Dehnung in die Mitte (Hann-Fenster). Die runden Enden bleiben
 * fast wie gezeichnet. Der Pfad besteht nur aus absoluten M/L/C/Z mit Zahlenpaaren.
 */
export function fitShape(shape: { path: string; x0: number; x1: number; y0: number; y1: number }, width: number, height: number): string {
  const { path, x0, x1, y0, y1 } = shape;
  const s = height / (y1 - y0);
  const L = x1 - x0;
  const p = x0 + 0.12 * L;
  const q = x1 - 0.12 * L;
  const n = q - p;
  const k = (width / s - L) / (n / 2);
  const fx = (x: number) => {
    if (x <= p) return x - x0;
    const t = Math.min(x, q) - p;
    return x - x0 + k * (t / 2 - (n / (4 * Math.PI)) * Math.sin((2 * Math.PI * t) / n));
  };
  let i = 0;
  return path.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (m) => {
    const v = parseFloat(m);
    return ((i++ % 2 === 0 ? fx(v) : v - y0) * s).toFixed(2);
  });
}
