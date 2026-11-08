import type { User } from '../data/types';

/** Höchstens so viele Zeichen nach dem @ gelten noch als Suche nach einem Namen. */
const MAX_QUERY = 40;

/**
 * Laufende @-Erwähnung direkt vor dem Cursor, etwa „@Sim“. Das @ steht am Anfang oder nach einem Leerzeichen.
 * Ohne Treffer `null`, dann zeigt das Feld keine Vorschläge.
 */
export function activeMention(text: string, cursor: number): { start: number; query: string } | null {
  const before = text.slice(0, cursor);
  const at = before.lastIndexOf('@');
  if (at < 0) return null;
  if (at > 0 && !/\s/.test(before[at - 1])) return null;
  const query = before.slice(at + 1);
  if (query.length > MAX_QUERY || /[\n@]/.test(query)) return null;
  // Zwei Leerzeichen hintereinander: Die Person schreibt schon weiter
  if (/\s\s/.test(query) || /^\s/.test(query)) return null;
  return { start: at, query };
}

/** Passt der Name zur Suche? Am Anfang des Namens oder eines seiner Wörter, ohne Groß- und Kleinschreibung. */
function matches(name: string, query: string): boolean {
  const n = name.toLocaleLowerCase();
  const q = query.toLocaleLowerCase();
  if (!q) return true;
  return n.startsWith(q) || n.split(/\s+/).some((word) => word.startsWith(q));
}

/** Vorschläge zur Suche, in der Reihenfolge der Kandidatinnen. */
export function mentionSuggestions(candidates: User[], query: string, limit = 5): User[] {
  return candidates.filter((u) => u.name.trim() && matches(u.name, query)).slice(0, limit);
}

/** Setzt „@Name “ an die Stelle der laufenden Erwähnung. Gibt den neuen Text und die Cursorposition zurück. */
export function insertMention(text: string, start: number, cursor: number, name: string): { text: string; cursor: number } {
  const after = text.slice(cursor).replace(/^\S*/, '');
  const inserted = `@${name} `;
  const rest = after.startsWith(' ') ? after.slice(1) : after;
  return { text: text.slice(0, start) + inserted + rest, cursor: start + inserted.length };
}

export type MentionPart = { text: string; user?: User };

/**
 * Zerlegt einen Text in Stücke. „@Name“ bekannter Personen wird ein eigenes Stück mit `user`,
 * auch wenn der Name Leerzeichen hat („@Simon the Cat“). Längere Namen gewinnen.
 */
export function splitMentions(text: string, users: User[]): MentionPart[] {
  const named = users.filter((u) => u.name.trim()).sort((a, b) => b.name.length - a.name.length);
  const parts: MentionPart[] = [];
  let plain = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '@' && (i === 0 || /\s/.test(text[i - 1]))) {
      const rest = text.slice(i + 1);
      const lower = rest.toLocaleLowerCase();
      const user = named.find((u) => {
        const name = u.name.toLocaleLowerCase();
        // Nach dem Namen darf kein Buchstabe oder keine Ziffer folgen, sonst wäre es ein längeres Wort
        return lower.startsWith(name) && !/[\p{L}\p{N}_]/u.test(rest[name.length] ?? '');
      });
      if (user) {
        if (plain) parts.push({ text: plain });
        plain = '';
        parts.push({ text: `@${rest.slice(0, user.name.length)}`, user });
        i += 1 + user.name.length;
        continue;
      }
    }
    plain += ch;
    i += 1;
  }
  if (plain) parts.push({ text: plain });
  return parts;
}
