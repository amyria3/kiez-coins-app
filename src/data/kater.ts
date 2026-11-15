// Sprüche des Katers, gemeinsam mit der Website (/kater). Quelle: src/data/kater-sprueche.json.
// Ein Eintrag oder beliebig viele; Text allein oder mit Aktion (fegen, winken, brille, stampfen).
import raw from './kater-sprueche.json';

export type KaterAction = 'fegen' | 'winken' | 'brille' | 'stampfen';
export type KaterSaying = { text: string; aktion?: KaterAction };
type SayingList = 'hallo' | 'sprueche';

const listen = raw as unknown as Record<SayingList, (string | KaterSaying)[]>;
const lastShown: Partial<Record<SayingList, number>> = {};

/** Zufälliger Spruch, möglichst nicht zweimal hintereinander derselbe */
export function katerSaying(list: SayingList): KaterSaying | null {
  const entries = (listen[list] ?? []).map((e) => (typeof e === 'string' ? { text: e } : e));
  if (!entries.length) return list === 'hallo' ? katerSaying('sprueche') : null;
  let i = Math.floor(Math.random() * entries.length);
  if (entries.length > 1 && i === lastShown[list]) i = (i + 1) % entries.length;
  lastShown[list] = i;
  return entries[i];
}
