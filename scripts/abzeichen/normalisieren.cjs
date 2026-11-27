/* global __dirname */
/**
 * Abzeichen nach einer Regel bauen (Daria, 2026-11-27). Regel: Documentation, kiez-coins/design/Icons_zeichnen.md, „Abzeichen-Raster“.
 *
 * Liest Darias Figma-Exporte aus design/abzeichen/icons/original/<abzeichen>-default.svg und -small.svg,
 * skaliert und verschiebt den Gegenstand nach dem Raster und schreibt
 *   design/abzeichen/icons/<abzeichen>-default.svg, design/abzeichen/icons/<abzeichen>-small.svg
 *   src/components/icons/badgeSvgs.ts
 * Die Formen selbst bleiben unverändert, nur Größe und Lage ändern sich.
 *
 * Aufruf (Playwright ist in Cloud-Sitzungen vorinstalliert, svgpath nur für den Lauf):
 *   npm i --no-save svgpath && node scripts/abzeichen/normalisieren.cjs
 * Neues Abzeichen: Exporte nach original/ legen, unten in ABZEICHEN eintragen (Farbe, Teilpfade der Bewegungsstriche).
 */
const fs = require('fs');
const path = require('path');
const SP = require('svgpath');
const { chromium } = require('playwright');

const REPO = path.join(__dirname, '..', '..');
const ICONS = path.join(REPO, 'design/abzeichen/icons');

/** Das Raster in Einheiten der Zeichenfläche 120 × 120, Kreis r 60 in der Mitte */
const RASTER = {
  // Default: Gegenstand höchstens 26 % der Kreisfläche, höchstens r 50 von der Mitte, Bewegungsstriche höchstens r 56
  default: { flaeche: 0.26, radius: 50, striche: 56 },
  // Small: ohne Bewegungsstriche, deshalb etwas größer, höchstens 32 % und r 52
  small: { flaeche: 0.32, radius: 52 },
};

/** Farbe und Teilpfade der Bewegungsstriche im Default-Pfad (Teilpfad 0 ist der Kreis) */
const ABZEICHEN = {
  pionier: { color: '#FFCC00', striche: [1, 2, 3, 4, 5, 11, 12, 13, 14, 15] },
  lotse: { color: '#34C759', striche: [3, 4, 6, 7, 8, 11, 12, 13, 14, 15] },
  anfuehrer: { color: '#6155F5', striche: [2, 3, 4, 5, 6, 8, 10, 11, 13, 14, 19, 20, 21, 22, 23] },
  seebaer: { color: '#CB30E0', striche: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  macher: { color: '#FF8D28', striche: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
};

/** Glanzlichter, die in der Fassung Default auf Farbe hell bleiben (Linse und Rohr des Fernrohrs), in Koordinaten des Exports */
const GLANZ = {
  pionier:
    'M110.80 61.15 109.90 61.15 108.30 60.25 106.80 59.05 105.35 57.50 102.45 53.30 101.25 51.30 99.75 48.60 97.15 43.20 95.45 39.00 93.85 34.30 93.45 32.00 93.65 30.70 94.35 28.90 94.85 28.10 95.80 27.35 96.40 27.35 97.60 27.85 99.75 29.50 100.55 30.60 103.05 33.30 103.55 34.30 105.75 37.30 107.15 39.50 108.35 43.30 109.55 45.80 110.15 48.40 110.55 51.70 110.85 52.90 110.85 54.20 111.25 57.00 111.25 60.30 111.05 60.90Z M72.60 47.15 72.35 47.10 72.35 46.80 72.85 45.40 73.15 43.80 73.75 42.20 75.85 38.10 77.75 35.60 78.20 35.25 78.45 35.90 78.35 37.50 77.75 41.50 77.35 42.30 76.45 43.50 73.60 46.35Z',
};

const KREIS = Math.PI * 60 * 60;
const KREIS_PFAD = 'M60 0C93.14 0 120 26.86 120 60C120 93.14 93.14 120 60 120C26.86 120 0 93.14 0 60C0 26.86 26.86 0 60 0Z';
const teilpfade = (d) => SP(d).abs().toString().split(/(?=M)/).map((x) => x.trim()).filter(Boolean);
const verschiebe = (d, t) => SP(d).abs().scale(t.s).translate(t.x, t.y).round(2).toString();

let page;
/** Rastert Flächen [d, Füllregel] mit 10 px je Einheit: Fläche, Begrenzung, größter Abstand zu einem Punkt */
async function messe(flaechen, cx, cy) {
  return page.evaluate(
    ([flaechen, cx, cy]) => {
      const c = document.getElementById('c');
      const x = c.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, 1200, 1200);
      x.setTransform(10, 0, 0, 10, 0, 0);
      for (const [d, regel] of flaechen) x.fill(new Path2D(d), regel);
      const px = x.getImageData(0, 0, 1200, 1200).data;
      let n = 0, a = 1e9, b = 1e9, e = -1, f = -1, r = 0;
      for (let y = 0; y < 1200; y++)
        for (let i = 0; i < 1200; i++)
          if (px[(y * 1200 + i) * 4 + 3] > 127) {
            n++;
            a = Math.min(a, i); e = Math.max(e, i); b = Math.min(b, y); f = Math.max(f, y);
            if (cx != null) r = Math.max(r, ((i + 0.5) / 10 - cx) ** 2 + ((y + 0.5) / 10 - cy) ** 2);
          }
      return { flaeche: n / 100, box: [a / 10, b / 10, (e + 1) / 10, (f + 1) / 10], radius: Math.sqrt(r) };
    },
    [flaechen, cx ?? null, cy ?? null],
  );
}

/** Mitte der Begrenzung auf die Kreismitte, Größe nach Fläche, gedeckelt durch den Radius */
async function einpassen(flaechen, regel) {
  const m = await messe(flaechen);
  const cx = (m.box[0] + m.box[2]) / 2;
  const cy = (m.box[1] + m.box[3]) / 2;
  const { radius } = await messe(flaechen, cx, cy);
  const s = Math.min(Math.sqrt((regel.flaeche * KREIS) / m.flaeche), regel.radius / radius);
  return { s, x: 60 - cx * s, y: 60 - cy * s };
}

(async () => {
  const browser = await chromium.launch();
  page = await browser.newPage();
  await page.setContent('<canvas id="c" width="1200" height="1200"></canvas>');
  const ts = {};
  const bericht = [];
  for (const [kind, a] of Object.entries(ABZEICHEN)) {
    // Default: ein heller Pfad, Kreis mit ausgespartem Gegenstand und Bewegungsstrichen
    const roh = fs.readFileSync(path.join(ICONS, 'original', `${kind}-default.svg`), 'utf8');
    const teile = teilpfade(roh.match(/ d="([^"]+)"/)[1]);
    const gegenstand = teile.filter((_, i) => i > 0 && !a.striche.includes(i)).join(' ');
    const striche = teile.filter((_, i) => a.striche.includes(i)).join(' ');
    const t = await einpassen([[gegenstand, 'nonzero']], RASTER.default);
    let r = (await messe([[verschiebe(striche, t), 'nonzero']], 60, 60)).radius;
    if (r > RASTER.default.striche) {
      const k = RASTER.default.striche / r;
      t.s *= k; t.x = 60 - (60 - t.x) * k; t.y = 60 - (60 - t.y) * k;
      r = (await messe([[verschiebe(striche, t), 'nonzero']], 60, 60)).radius;
    }
    const tinte = verschiebe(teile.slice(1).join(' '), t);
    const def = `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="${KREIS_PFAD} ${tinte}" fill="#F0F0F0"/>\n</svg>\n`;
    const g = await messe([[verschiebe(gegenstand, t), 'nonzero']], 60, 60);

    // Small: Farbkreis, darüber die Flächen des Gegenstands
    const rohS = fs.readFileSync(path.join(ICONS, 'original', `${kind}-small.svg`), 'utf8');
    const pfade = [...rohS.matchAll(/<path([^>]*?)d="([^"]+)"([^>]*)\/>/g)].slice(1);
    const flaechen = pfade.map((p) => [p[2], /evenodd/.test(p[1] + p[3]) ? 'evenodd' : 'nonzero']);
    const tS = await einpassen(flaechen, RASTER.small);
    const small =
      `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">\n<circle cx="60" cy="60" r="60" fill="${a.color}"/>\n` +
      pfade.map((p) => `<path${p[1]}d="${verschiebe(p[2], tS)}"${p[3].trimEnd()}/>`).join('\n') +
      '\n</svg>\n';
    const gS = await messe(flaechen.map(([d, regel]) => [verschiebe(d, tS), regel]), 60, 60);

    fs.writeFileSync(path.join(ICONS, `${kind}-default.svg`), def);
    fs.writeFileSync(path.join(ICONS, `${kind}-small.svg`), small);
    ts[kind] = { color: a.color, small: small.trim().replace(/\n/g, ' '), default: def.trim().replace(/\n/g, ' '), glanz: GLANZ[kind] ? verschiebe(GLANZ[kind], t) : undefined };
    bericht.push(
      `${kind}: Default ${(g.flaeche / KREIS * 100).toFixed(1)} % Fläche, r ${g.radius.toFixed(1)}, Striche r ${r.toFixed(1)} · Small ${(gS.flaeche / KREIS * 100).toFixed(1)} % Fläche, r ${gS.radius.toFixed(1)}`,
    );
  }
  await browser.close();

  const zeilen = Object.entries(ts).map(
    ([k, v]) =>
      `  ${k}: {\n    color: '${v.color}',\n    small: \`${v.small}\`,\n    default: \`${v.default}\`,\n` +
      (v.glanz ? `    shine: '${v.glanz}',\n` : '') +
      '  },',
  );
  const out = `/**
 * Darias Abzeichen-Icons im Kiez-Look: Small für Avatar und Listen, Default ab 80 pt.
 * Erzeugt mit scripts/abzeichen/normalisieren.cjs aus design/abzeichen/icons/original (Stand 2026-11-27).
 * Alle Abzeichen folgen einem Raster: Kreis r 60 auf 120 × 120, Gegenstand mittig, gleiche Fläche, Abstand zum Rand.
 * Nicht von Hand ändern, sondern das Skript neu laufen lassen.
 */
import type { BadgeKind } from '../../data/badges';

/** shine: Glanzlichter, die auf der Farbe des Abzeichens hell bleiben (Fassung Default) */
export const KIEZ_BADGE_SVGS: Partial<Record<BadgeKind, { small: string; default: string; color: string; shine?: string }>> = {
${zeilen.join('\n')}
};
`;
  fs.writeFileSync(path.join(REPO, 'src/components/icons/badgeSvgs.ts'), out);
  console.log(bericht.join('\n'));
})();
