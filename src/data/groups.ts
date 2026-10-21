import { t } from './texts';
import type { Challenge, Group } from './types';

// Gruppen: Rangliste und Grenzen (wie in Migration 20261021000100).

export const MAX_MEMBERS = 13;
export const MAX_GROUPS = 10;

export type RankEntry = { userId: string; edensteine: number; done: number };

/** Edensteine pro Mitglied aus den bestätigten Gruppenaufgaben, absteigend sortiert. */
export function leaderboard(group: Group, challenges: Challenge[]): RankEntry[] {
  const entries = new Map<string, RankEntry>(group.members.map((m) => [m.userId, { userId: m.userId, edensteine: 0, done: 0 }]));
  for (const c of challenges) {
    if (c.groupId !== group.id || c.status !== 'confirmed' || !c.assigneeId) continue;
    const entry = entries.get(c.assigneeId);
    if (!entry) continue; // ausgetreten: bleibt im Verlauf, nicht in der Rangliste
    entry.edensteine += c.edensteine ?? 0;
    entry.done += 1;
  }
  return [...entries.values()].sort((a, b) => b.edensteine - a.edensteine || b.done - a.done);
}

/** Eigener Bestand in einer Gruppe */
export const myEdensteine = (group: Group, challenges: Challenge[], userId: string) =>
  leaderboard(group, challenges).find((e) => e.userId === userId)?.edensteine ?? 0;

/** Adresse der Web-App. Universal Links mit eigener Domain fehlen noch, deshalb öffnet der Link die Web-App. */
export const WEB_APP_URL = 'https://kiezcoins.vercel.app/app';

/** Link, der „Gruppe beitreten“ mit vorausgefülltem Code öffnet */
export const inviteLink = (code: string) => `${WEB_APP_URL}/gruppen/beitreten?code=${encodeURIComponent(code)}`;

/**
 * Text zum Teilen. Link und Code stehen je auf eigener Zeile, damit Messenger den Link antippbar machen
 * und sich der Code mit einem langen Tippen markieren lässt.
 */
export const inviteMessage = (group: Group) =>
  [
    t('Komm in unsere Gruppe „{name}“ bei Kiez Coins. Mit diesem Link trittst Du bei:', { name: group.name }),
    inviteLink(group.inviteCode),
    '',
    t('Oder in der App unter „Gruppen“ auf „Mit Code beitreten“ tippen und diesen Code eingeben:'),
    group.inviteCode,
  ].join('\n');

/**
 * Findet den Einladungscode in eingefügtem Text: im Link (`?code=…`), als ganze Nachricht
 * oder als eingetippten Code. Liefert null, wenn kein Code erkennbar ist.
 */
export function parseInviteCode(input: string): string | null {
  const fromLink = input.match(/[?&]code=([A-Za-z2-9]{6})\b/);
  if (fromLink) return fromLink[1].toUpperCase();
  const plain = input.replace(/\s+/g, '');
  if (/^[A-Za-z2-9]{6}$/.test(plain)) return plain.toUpperCase();
  const token = input.match(/(?:^|\s)([A-Z2-9]{6})(?=\s|$)/);
  return token ? token[1] : null;
}
