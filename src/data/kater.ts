// Sprüche des Katers, gemeinsam mit der Website (/kater). Quelle: src/data/kater-sprueche.json.
// Ein Eintrag oder beliebig viele; Text allein oder mit Aktion (fegen, winken, brille, stampfen).
import raw from './kater-sprueche.json';

export type KaterAktion = 'fegen' | 'winken' | 'brille' | 'stampfen';
export type KaterSpruch = { text: string; aktion?: KaterAktion };
type Liste = 'hallo' | 'sprueche';

const listen = raw as unknown as Record<Liste, (string | KaterSpruch)[]>;
const zuletzt: Partial<Record<Liste, number>> = {};

/** Zufälliger Spruch, möglichst nicht zweimal hintereinander derselbe */
export function katerSpruch(liste: Liste): KaterSpruch | null {
  const eintraege = (listen[liste] ?? []).map((e) => (typeof e === 'string' ? { text: e } : e));
  if (!eintraege.length) return liste === 'hallo' ? katerSpruch('sprueche') : null;
  let i = Math.floor(Math.random() * eintraege.length);
  if (eintraege.length > 1 && i === zuletzt[liste]) i = (i + 1) % eintraege.length;
  zuletzt[liste] = i;
  return eintraege[i];
}
