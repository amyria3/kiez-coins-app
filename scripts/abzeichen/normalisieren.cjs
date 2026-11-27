/* global __dirname */
/**
 * Abzeichen nach einer Regel bauen (Daria, 2026-11-27). Regel: Documentation, kiez-coins/design/Icons_zeichnen.md, „Abzeichen-Raster“.
 *
 * Liest Darias Figma-Exporte aus design/abzeichen/icons/original/<abzeichen>-default.svg und -small.svg,
 * übernimmt Default unverändert, passt Small ins Raster ein und schreibt
 *   design/abzeichen/icons/<abzeichen>-default.svg, design/abzeichen/icons/<abzeichen>-small.svg
 *   src/components/icons/badgeSvgs.ts
 * Die Formen selbst bleiben unverändert, nur Größe und Lage ändern sich.
 *
 * Aufruf (Playwright ist in Cloud-Sitzungen vorinstalliert, svgpath nur für den Lauf):
 *   npm i --no-save svgpath && node scripts/abzeichen/normalisieren.cjs
 * Neues Abzeichen: Exporte nach original/ legen, unten in ABZEICHEN eintragen.
 */
const fs = require('fs');
const path = require('path');
const SP = require('svgpath');
const { chromium } = require('playwright');

const REPO = path.join(__dirname, '..', '..');
const ICONS = path.join(REPO, 'design/abzeichen/icons');

/** Das Raster in Einheiten der Zeichenfläche 120 × 120. Default bleibt Darias Export (Daria, 2026-11-27). */
const RASTER = {
  // Small: Farbkreis r 46 oben links, Gegenstand ragt unten rechts hinaus (Daria, 2026-11-27).
  // Gegenstand 45 % der Kreisfläche, davon 25 % außerhalb des Kreises, Verschiebung auf der Diagonale nach unten rechts
  small: { kreis: 46, flaeche: 0.45, aussen: 0.25 },
};

/** Farbe je Abzeichen */
const ABZEICHEN = {
  pionier: { color: '#FFCC00' },
  lotse: { color: '#34C759' },
  // Steuerrad und Anker: Small bleibt Darias Export, Gegenstand im Kreis (Daria, 2026-11-27)
  anfuehrer: { color: '#6155F5', smallWieExport: true },
  seebaer: { color: '#CB30E0', smallWieExport: true },
  macher: { color: '#FF8D28' },
};

const verschiebe = (d, t) => SP(d).abs().scale(t.s).translate(t.x, t.y).round(2).toString();

let page;
/** Rastert Flächen [d, Füllregel] mit 10 px je Einheit: Fläche, Begrenzung, größter Abstand zu einem Punkt */
async function messe(flaechen, cx, cy, kreis) {
  return page.evaluate(
    ([flaechen, cx, cy, kreis]) => {
      const c = document.getElementById('c');
      const x = c.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, 1200, 1200);
      x.setTransform(10, 0, 0, 10, 0, 0);
      for (const [d, regel] of flaechen) x.fill(new Path2D(d), regel);
      const px = x.getImageData(0, 0, 1200, 1200).data;
      let n = 0, a = 1e9, b = 1e9, e = -1, f = -1, r = 0, aussen = 0;
      for (let y = 0; y < 1200; y++)
        for (let i = 0; i < 1200; i++)
          if (px[(y * 1200 + i) * 4 + 3] > 127) {
            n++;
            a = Math.min(a, i); e = Math.max(e, i); b = Math.min(b, y); f = Math.max(f, y);
            if (cx != null) r = Math.max(r, ((i + 0.5) / 10 - cx) ** 2 + ((y + 0.5) / 10 - cy) ** 2);
            if (kreis && ((i + 0.5) / 10 - kreis) ** 2 + ((y + 0.5) / 10 - kreis) ** 2 > kreis * kreis) aussen++;
          }
      return { flaeche: n / 100, box: [a / 10, b / 10, (e + 1) / 10, (f + 1) / 10], radius: Math.sqrt(r), aussen: aussen / n };
    },
    [flaechen, cx ?? null, cy ?? null, kreis ?? null],
  );
}

/** Small: Größe nach Fläche, dann auf der Diagonale verschieben, bis der Anteil außerhalb stimmt; ragt er aus 120 × 120, kleiner */
async function hinausragen(flaechen, regel) {
  const K = regel.kreis;
  const m = await messe(flaechen);
  const cx = (m.box[0] + m.box[2]) / 2;
  const cy = (m.box[1] + m.box[3]) / 2;
  let s = Math.sqrt((regel.flaeche * Math.PI * K * K) / m.flaeche);
  for (;;) {
    const bei = async (d) => {
      const t = { s, x: K + d - cx * s, y: K + d - cy * s };
      return { t, m: await messe(flaechen.map(([p, r]) => [verschiebe(p, t), r]), null, null, K) };
    };
    let lo = 0, hi = 60, best;
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2;
      best = await bei(mid);
      if (best.m.aussen < regel.aussen) lo = mid; else hi = mid;
    }
    const [a, b, e, f] = best.m.box;
    if (a >= 0 && b >= 0 && e <= 120 && f <= 120) return { ...best.t, aussen: best.m.aussen, flaeche: best.m.flaeche };
    s *= 0.97;
  }
}

(async () => {
  const browser = await chromium.launch();
  page = await browser.newPage();
  await page.setContent('<canvas id="c" width="1200" height="1200"></canvas>');
  const ts = {};
  const bericht = [];
  for (const [kind, a] of Object.entries(ABZEICHEN)) {
    // Default: Darias Export unverändert
    const def = fs.readFileSync(path.join(ICONS, 'original', `${kind}-default.svg`), 'utf8').replace(/\s+/g, ' ').trim() + '\n';

    // Small: Farbkreis, darüber die Flächen des Gegenstands
    const rohS = fs.readFileSync(path.join(ICONS, 'original', `${kind}-small.svg`), 'utf8');
    const pfade = [...rohS.matchAll(/<path([^>]*?)d="([^"]+)"([^>]*)\/>/g)].slice(1);
    const flaechen = pfade.map((p) => [p[2], /evenodd/.test(p[1] + p[3]) ? 'evenodd' : 'nonzero']);
    const K = RASTER.small.kreis;
    let small, kreis, info;
    if (a.smallWieExport) {
      small = rohS.replace(/\s+/g, ' ').trim() + '\n';
      kreis = [60, 60, 60];
      info = 'Small wie Export';
    } else {
      const tS = await hinausragen(flaechen, RASTER.small);
      small =
        `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">\n<circle cx="${K}" cy="${K}" r="${K}" fill="${a.color}"/>\n` +
        pfade.map((p) => `<path${p[1]}d="${verschiebe(p[2], tS)}"${p[3].trimEnd()}/>`).join('\n') +
        '\n</svg>\n';
      kreis = [K, K, K];
      info = `Small ${(tS.flaeche / (Math.PI * K * K) * 100).toFixed(1)} % des Kreises, ${(tS.aussen * 100).toFixed(1)} % außerhalb`;
    }

    fs.writeFileSync(path.join(ICONS, `${kind}-default.svg`), def);
    fs.writeFileSync(path.join(ICONS, `${kind}-small.svg`), small);
    ts[kind] = { color: a.color, small: small.trim().replace(/\n/g, ' '), default: def.trim().replace(/\n/g, ' '), kreis };
    bericht.push(
      `${kind}: ${info}`,
    );
  }
  await browser.close();

  const zeilen = Object.entries(ts).map(
    ([k, v]) =>
      `  ${k}: {\n    color: '${v.color}',\n    small: \`${v.small}\`,\n    default: \`${v.default}\`,\n` +
      `    circle: [${v.kreis.join(', ')}],\n` +
      '  },',
  );
  const out = `/**
 * Darias Abzeichen-Icons im Kiez-Look: Small für Avatar und Listen, Default ab 80 pt.
 * Erzeugt mit scripts/abzeichen/normalisieren.cjs aus design/abzeichen/icons/original (Stand 2026-11-27).
 * Default ist Darias Export. Small folgt einem Raster: Kreis r 46 oben links, Gegenstand ragt gleich weit unten rechts hinaus;
 * Steuerrad und Anker behalten in Small Darias Export mit dem Gegenstand im Kreis.
 * Nicht von Hand ändern, sondern das Skript neu laufen lassen.
 */
import type { BadgeKind } from '../../data/badges';

/** circle: Farbkreis in Small als [cx, cy, r] auf 120 × 120, für den Ring am Avatar */
export const KIEZ_BADGE_SVGS: Partial<Record<BadgeKind, { small: string; default: string; color: string; circle: [number, number, number] }>> = {
${zeilen.join('\n')}
};
`;
  fs.writeFileSync(path.join(REPO, 'src/components/icons/badgeSvgs.ts'), out);
  console.log(bericht.join('\n'));
})();
