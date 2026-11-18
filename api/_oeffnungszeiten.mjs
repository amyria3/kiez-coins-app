// Öffnungszeiten aus dem freien Text des Schaufensters für Google (Daria, 2026-11-18: Google Business Profile, Stufe 1).
// Die App speichert Öffnungszeiten als freien Text. Google liest sie nur im Format von schema.org
// (openingHoursSpecification). Diese Datei übersetzt die üblichen deutschen Schreibweisen:
//   „Mo–Fr 9–18 Uhr“, „Di-So 10:00-18:30“, „Sa 10–14“, „Mo, Mi, Fr 8–12 und 14–18“, „täglich 7–22“, „So geschlossen“.
// Mehrere Angaben stehen in eigenen Zeilen oder durch Semikolon getrennt. Versteht sie eine Angabe nicht, gibt sie
// null zurück: Lieber keine Öffnungszeiten an Google als falsche. Reine Logik, geprüft in tests/oeffnungszeiten.test.ts.

const TAGE = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const KURZ = { mo: 0, di: 1, mi: 2, do: 3, fr: 4, sa: 5, so: 6 };
const LANG = { montag: 0, dienstag: 1, mittwoch: 2, donnerstag: 3, freitag: 4, samstag: 5, sonnabend: 5, sonntag: 6 };

/** „Mo“, „Mo.“, „Montag“, „montags“ → 0 … 6, sonst undefined */
function tag(wort) {
  const w = wort.toLowerCase().replace(/\.$/, '').replace(/s$/, (s) => (wort.length > 3 ? '' : s));
  if (w in LANG) return LANG[w];
  if (w in KURZ) return KURZ[w];
  return undefined;
}

/** „9“, „09:30“, „9.30“ → „09:00“, „09:30“; „24“ → „23:59“ */
function uhr(text) {
  const m = text.match(/^(\d{1,2})(?:[:.](\d{2}))?$/);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h === 24 && min === 0) return '23:59';
  if (h > 23 || min > 59) return undefined;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const STRICH = /\s*(?:–|—|-|bis)\s*/;

/** Tagesteil: „Mo–Fr“, „Mo, Mi, Fr“, „Sa und So“, „täglich“ → Liste der Tage, sonst undefined */
function tage(text) {
  const t = text.trim().toLowerCase();
  if (/^(täglich|jeden tag|mo\s*(?:–|—|-|bis)\s*so)$/.test(t)) return [0, 1, 2, 3, 4, 5, 6];
  const out = [];
  for (const teil of t.split(/\s*(?:,|&|\bund\b|\/)\s*/)) {
    if (!teil) return undefined;
    const bereich = teil.split(STRICH);
    if (bereich.length === 1) {
      const d = tag(bereich[0]);
      if (d === undefined) return undefined;
      out.push(d);
    } else if (bereich.length === 2) {
      const von = tag(bereich[0]);
      const bis = tag(bereich[1]);
      if (von === undefined || bis === undefined) return undefined;
      for (let d = von; ; d = (d + 1) % 7) {
        out.push(d);
        if (d === bis) break;
      }
    } else return undefined;
  }
  return out.length ? [...new Set(out)] : undefined;
}

/** Zeitteil: „9–18 Uhr“, „8–12 und 14–18“ → [[„08:00“, „12:00“], …]; „geschlossen“ → []; sonst undefined */
function zeiten(text) {
  const t = text.trim().toLowerCase().replace(/\s*uhr\b/g, '').trim();
  if (/^(geschlossen|ruhetag|zu)$/.test(t)) return [];
  const out = [];
  for (const teil of t.split(/\s*(?:,|&|\bund\b|\/)\s*/)) {
    const [a, b, ...rest] = teil.split(STRICH);
    if (rest.length || !b) return undefined;
    const von = uhr(a);
    const bis = uhr(b);
    if (!von || !bis) return undefined;
    out.push([von, bis]);
  }
  return out.length ? out : undefined;
}

/**
 * Freier Text → openingHoursSpecification von schema.org, oder null, wenn eine Angabe unklar ist.
 * Bis-Zeiten nach Mitternacht („18–2 Uhr“) übernimmt Google so, wie sie stehen.
 */
export function oeffnungszeiten(text) {
  const zeilen = String(text ?? '')
    .split(/\r?\n|;/)
    .map((z) => z.trim().replace(/:$/, ''))
    .filter(Boolean);
  if (!zeilen.length) return null;
  const specs = [];
  for (const zeile of zeilen) {
    // Erste Ziffer oder „geschlossen“ trennt Tage und Zeiten; ein Doppelpunkt nach den Tagen ist erlaubt
    const m = zeile.match(/^(.*?)(?::\s*|\s+)(\d.*|geschlossen.*|ruhetag.*|zu)$/i);
    if (!m) return null;
    const d = tage(m[1].replace(/:$/, ''));
    const z = zeiten(m[2]);
    if (!d || !z) return null;
    for (const [opens, closes] of z) specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: d.map((i) => TAGE[i]), opens, closes });
  }
  return specs.length ? specs : null;
}
