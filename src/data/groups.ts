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

/** Text zum Teilen des Einladungscodes */
export const inviteMessage = (group: Group) =>
  t('Komm in unsere Gruppe „{name}“ bei Kiez Coins: In der App unter „Gruppen“ auf „Mit Code beitreten“ tippen und {code} eingeben.', {
    name: group.name,
    code: group.inviteCode,
  });
