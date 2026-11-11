// Handgezeichnete Button-Form (Daria, 2026-11-11), Vorlage 197 × 46.
// Die runden Enden bleiben unverzerrt, nur der gerade Mittelteil wird breiter:
// Alle Punkte rechts der Mitte rücken um die Mehrbreite nach rechts, die Form wird
// dabei gleichmäßig auf die Höhe des Buttons skaliert.

const W = 197;
const H = 46;
/** Kleinste Breite (bei Höhe 46), bei der die Enden sich gerade berühren */
const MIN_W = W - (167.887 - 29.5);

const SOURCE =
  'M25.781 1.04927C28.1162 0.315975 28.1492 0.578472 29.5 0.526138L167.887 0.00481166C169.381 0.0569534 169.418 -0.204578 172 0.526022C172.944 0.793505 180.004 1.10211 184.903 4.35789C185.302 4.6227 185.288 4.62517 185.684 4.90209C185.886 5.06693 185.909 5.02567 186.113 5.19298C186.171 5.23999 186.165 5.23875 186.805 5.81416C188.308 7.30102 188.348 7.24189 189.965 8.60025C190.947 9.63713 190.899 9.65868 191.677 10.831C192.985 12.6548 193.267 12.5197 193.922 14.638C194.638 16.955 195.081 16.7972 195.752 19.1368C196.087 20.31 196.714 20.4766 196.51 26.8227C196.303 33.2538 191.765 37.2002 191.172 37.8577C190.272 38.9455 190.328 38.9806 189.241 39.9111C189.123 40.0117 189.103 39.9856 187.64 41.0274C184.504 43.0148 180 44.969 173.627 44.969C172 45.1324 171.249 45.1274 170.946 45.1324C168.908 45.165 167.771 45.3999 167.5 45.4559H20.4975C20.2524 45.3997 17.5 45.5261 17.5 45.5261C17.5 45.5261 16.2798 45.2993 14.9575 44.9672C10.7193 43.9021 10.8917 43.4371 8.05629 41.4424C6.7332 40.3968 6.7154 40.4229 6.60882 40.322C5.62597 39.388 5.67627 39.3528 4.86306 38.261C4.32686 37.601 0.222947 33.6401 0.0360885 27.1852C-0.148255 20.8157 0.418509 20.6484 0.721816 19.4709C1.32785 17.1226 1.72923 17.2811 2.37627 14.9555C2.96837 12.8293 3.2239 12.9649 4.40656 11.1345C5.10989 9.95776 5.06579 9.93613 5.95443 8.89542C7.41583 7.53204 7.452 7.59139 8.81107 6.09904C9.39022 5.5215 9.3848 5.52274 9.43683 5.47556C9.62118 5.30763 9.64265 5.34905 9.82467 5.1836C10.1831 4.90565 10.1703 4.90317 10.5307 4.63738C14.9604 1.36957 24.928 1.31775 25.781 1.04927Z';

type Seg = { cmd: string; pts: [number, number][] };

/** Pfad einmal zerlegen. Die Vorlage nutzt nur absolute M, C, L, H und Z. */
function parse(d: string): Seg[] {
  const tokens = d.match(/[MCLHZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const segs: Seg[] = [];
  let i = 0;
  let y = 0;
  while (i < tokens.length) {
    const cmd = tokens[i++];
    const nums: number[] = [];
    while (i < tokens.length && !/[A-Z]/i.test(tokens[i])) nums.push(Number(tokens[i++]));
    if (cmd === 'Z') segs.push({ cmd, pts: [] });
    else if (cmd === 'H') segs.push({ cmd: 'L', pts: [[nums[0], y]] });
    else {
      const pts: [number, number][] = [];
      for (let k = 0; k < nums.length; k += 2) pts.push([nums[k], nums[k + 1]]);
      segs.push({ cmd, pts });
      y = pts[pts.length - 1][1];
    }
  }
  return segs;
}

const SEGS = parse(SOURCE);
const r = (n: number) => Math.round(n * 100) / 100;

/**
 * SVG-Pfad der Form für ein Feld von `width` × `height`.
 * `inset` rückt die Form nach innen, damit eine Kontur der Breite 2 × inset ganz sichtbar bleibt.
 */
export function handShapePath(width: number, height: number, inset = 0): string {
  const h = Math.max(1, height - 2 * inset);
  const s = h / H;
  // Zu schmal: ganz einfach mitskalieren statt die Enden übereinanderzuschieben
  const w = Math.max(width - 2 * inset, MIN_W * s);
  const extra = w - W * s;
  const sx = width - 2 * inset < MIN_W * s ? (width - 2 * inset) / w : 1;
  const map = ([x, y]: [number, number]) => {
    const px = (x * s + (x > W / 2 ? extra : 0)) * sx + inset;
    return `${r(px)} ${r(y * s + inset)}`;
  };
  return SEGS.map((seg) => seg.cmd + seg.pts.map(map).join(' ')).join('');
}
