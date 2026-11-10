/**
 * Formatierbarer Text, z. B. die Services eines Schaufensters (Daria, 2026-11-10). Kleine Auswahl wie in Messengern:
 * **fett**, *kursiv*, Aufzählung mit „- “ am Zeilenanfang, Leerzeile für einen neuen Absatz.
 * Die öffentliche Seite (api/s.mjs) wandelt denselben Text mit denselben Regeln in HTML.
 */
export type Inline = { text: string; bold?: boolean; italic?: boolean };
export type RichBlock = { kind: 'p'; lines: Inline[][] } | { kind: 'ul'; items: Inline[][] };

const BULLET = /^\s*[-•]\s+/;

/** „Ein **fetter** und *kursiver* Text“ → Abschnitte mit Auszeichnung */
export function parseInline(line: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  for (let m = re.exec(line); m; m = re.exec(line)) {
    if (m.index > last) out.push({ text: line.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ text: m[1], bold: true });
    else out.push({ text: m[2], italic: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last) });
  return out;
}

export function parseRich(value: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  for (const line of value.replace(/\r\n?/g, '\n').split('\n')) {
    const prev = blocks[blocks.length - 1];
    if (!line.trim()) {
      blocks.push({ kind: 'p', lines: [] });
      continue;
    }
    if (BULLET.test(line)) {
      const item = parseInline(line.replace(BULLET, ''));
      if (prev?.kind === 'ul') prev.items.push(item);
      else blocks.push({ kind: 'ul', items: [item] });
      continue;
    }
    if (prev?.kind === 'p') prev.lines.push(parseInline(line));
    else blocks.push({ kind: 'p', lines: [parseInline(line)] });
  }
  return blocks.filter((b) => (b.kind === 'p' ? b.lines.length : b.items.length));
}

/**
 * Auszeichnung um die Auswahl setzen oder, ohne Auswahl, ein Beispiel einfügen.
 * Gibt den neuen Text zurück. `mark` ist „**“ (fett) oder „*“ (kursiv).
 */
export function wrapSelection(value: string, sel: { start: number; end: number }, mark: string, sample: string): string {
  const chosen = value.slice(sel.start, sel.end);
  return value.slice(0, sel.start) + mark + (chosen || sample) + mark + value.slice(sel.end);
}

/** Zeilen der Auswahl (oder die Zeile der Einfügemarke) als Aufzählung; sind schon alle Aufzählung, wieder normal */
export function toggleBullets(value: string, sel: { start: number; end: number }): string {
  const from = value.lastIndexOf('\n', Math.max(0, sel.start - 1)) + 1;
  const toBreak = value.indexOf('\n', sel.end);
  const to = toBreak === -1 ? value.length : toBreak;
  const lines = value.slice(from, to).split('\n');
  const all = lines.every((l) => BULLET.test(l));
  const next = lines.map((l) => (all ? l.replace(BULLET, '') : BULLET.test(l) ? l : `- ${l}`)).join('\n');
  return value.slice(0, from) + next + value.slice(to);
}
