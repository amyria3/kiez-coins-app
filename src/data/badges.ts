import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { supabase } from '../lib/supabase';
import { useStore } from './store';
import { t } from './texts';

/**
 * Abzeichen am Avatar (Daria, 2026-10-31). Die Datenbank vergibt sie (Migration 20261101000100_abzeichen.sql),
 * die App fragt mit `check_my_badges()` nach und zeigt am Avatar das ausgewählte, sonst das zuletzt erhaltene.
 */
export type BadgeKind = 'pionier' | 'lotse' | 'anfuehrer' | 'seebaer' | 'macher';

export type BadgeMeta = {
  kind: BadgeKind;
  name: string;
  /** Kachelfarbe */
  color: string;
  /** Bedingung im Konto, z. B. bei offenen Abzeichen */
  rule: string;
  /** Was im Profil unter dem Namen steht */
  earned: string;
  /** Sprechblase von Cat The Käptn beim Erhalt */
  kater: string;
};

// Reihenfolge im Konto
export const BADGES: BadgeMeta[] = [
  {
    kind: 'pionier',
    name: 'Pionier:in',
    color: '#F2C94C',
    rule: 'Unter den ersten 200 an Bord',
    earned: 'Unter den ersten 200 an Bord',
    kater: 'Land in Sicht! Du warst eine:r der Ersten. Das Fernrohr gehört jetzt Dir.',
  },
  {
    kind: 'lotse',
    name: 'Lots:in',
    color: '#93F4A7',
    rule: 'Hole 5 Menschen an Bord, die mitmachen',
    earned: '5 Menschen an Bord geholt',
    kater: 'Deine Flaschenposten sind angekommen. 5 Leute machen mit, weil Du sie eingeladen hast.',
  },
  {
    kind: 'anfuehrer',
    name: 'Anführer:in',
    color: '#7E94FF',
    rule: 'Hole 5 Menschen an Bord und gründe eine Gruppe',
    earned: '5 Menschen an Bord geholt, eine Gruppe gegründet',
    kater: 'Du hast eine Crew zusammengestellt und hältst das Steuer. Käpt’n-Material, ich sag’s ja.',
  },
  {
    kind: 'seebaer',
    name: 'Seebär:in',
    color: '#FFAD7E',
    rule: 'Poste 50 Mal, höchstens 3 Posts am Tag zählen',
    earned: '50 Posts',
    kater: '50 Posts! Du bist hier fest vor Anker. Ohne Dich wäre der Feed ziemlich leer.',
  },
  {
    kind: 'macher',
    name: 'Macher:in',
    color: '#FFB2E5',
    rule: 'Erledige 15 We-Challenges',
    earned: '15 We-Challenges erledigt',
    kater: '15 We-Challenges geschafft. Du redest nicht lange, Du packst an. We can do it!',
  },
];

export const badgeMeta = (kind: BadgeKind) => BADGES.find((b) => b.kind === kind)!;

/** Name mit Nummer in der gewählten Sprache, z. B. „Pionier:in #7“ */
export const badgeTitle = (kind: BadgeKind, number?: number | null) =>
  kind === 'pionier' && number ? `${t(badgeMeta(kind).name)} #${number}` : t(badgeMeta(kind).name);

export type AvatarBadge = { badge: BadgeKind; number?: number | null };

export type MyBadge = AvatarBadge & { earnedAt: string; visible: boolean; selected: boolean; seen: boolean };

export type BadgeProgress = { rang: number | null; posts: number; einladungen: number; gruppen: number; erledigt: number };

/** Schwellen wie in der Migration */
export const BADGE_GOALS = { pionier: 200, einladungen: 5, gruppen: 1, posts: 50, erledigt: 15 } as const;

/** Fortschritt eines offenen Abzeichens, z. B. 9 von 15 */
export function badgeSteps(kind: BadgeKind, p: BadgeProgress): { have: number; need: number } | null {
  switch (kind) {
    case 'pionier':
      return null;
    case 'lotse':
      return { have: Math.min(p.einladungen, BADGE_GOALS.einladungen), need: BADGE_GOALS.einladungen };
    case 'anfuehrer':
      return {
        have: Math.min(p.einladungen, BADGE_GOALS.einladungen) + Math.min(p.gruppen, BADGE_GOALS.gruppen),
        need: BADGE_GOALS.einladungen + BADGE_GOALS.gruppen,
      };
    case 'seebaer':
      return { have: Math.min(p.posts, BADGE_GOALS.posts), need: BADGE_GOALS.posts };
    case 'macher':
      return { have: Math.min(p.erledigt, BADGE_GOALS.erledigt), need: BADGE_GOALS.erledigt };
  }
}

// ---------------------------------------------------------------------------
// Beispieldaten (Demo-Modus)
// ---------------------------------------------------------------------------

const SAMPLE_AVATAR: Record<string, AvatarBadge> = {
  gardeners: { badge: 'pionier', number: 7 },
  peter: { badge: 'lotse' },
  lena: { badge: 'seebaer' },
};

const SAMPLE_MINE: { badges: MyBadge[]; progress: BadgeProgress } = {
  badges: [
    { badge: 'pionier', number: 7, earnedAt: '2026-10-20T10:00:00Z', visible: true, selected: true, seen: true },
    { badge: 'lotse', earnedAt: '2026-10-28T10:00:00Z', visible: true, selected: false, seen: true },
  ],
  progress: { rang: 7, posts: 23, einladungen: 5, gruppen: 0, erledigt: 9 },
};

// ---------------------------------------------------------------------------
// Abzeichen am Avatar: kleiner Zwischenspeicher, gesammelt geladen
// ---------------------------------------------------------------------------

const cache = new Map<string, AvatarBadge | null>();
const listeners = new Set<() => void>();
let pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | undefined;
let version = 0;

const notify = () => {
  version += 1;
  listeners.forEach((l) => l());
};

function flush() {
  timer = undefined;
  const ids = [...pending];
  pending = new Set();
  if (!ids.length) return;
  supabase
    .from('avatar_badges')
    .select('user_id, badge, number')
    .in('user_id', ids)
    .then(({ data, error }) => {
      // Ohne Migration gibt es die Sicht noch nicht: dann keine Abzeichen, kein Fehler
      if (error) {
        ids.forEach((id) => cache.set(id, null));
      } else {
        ids.forEach((id) => cache.set(id, null));
        (data ?? []).forEach((row: { user_id: string; badge: BadgeKind; number: number | null }) =>
          cache.set(row.user_id, { badge: row.badge, number: row.number }),
        );
      }
      notify();
    });
}

function request(id: string) {
  if (cache.has(id) || pending.has(id)) return;
  pending.add(id);
  if (!timer) timer = setTimeout(flush, 30);
}

/** Lädt Abzeichen neu, z. B. nachdem die Person ihre Auswahl geändert hat */
export function forgetAvatarBadge(id: string) {
  cache.delete(id);
  notify();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Das Abzeichen am Avatar einer Person, oder null */
export function useAvatarBadge(userId: string | undefined): AvatarBadge | null {
  const { mode } = useStore();
  useSyncExternalStore(subscribe, () => version);
  const demo = mode === 'demo';
  useEffect(() => {
    if (!demo && userId) request(userId);
  }, [demo, userId]);
  if (!userId) return null;
  if (demo) return SAMPLE_AVATAR[userId] ?? null;
  return cache.get(userId) ?? null;
}

// ---------------------------------------------------------------------------
// Eigene Abzeichen
// ---------------------------------------------------------------------------

type Mine = { badges: MyBadge[]; progress: BadgeProgress };

const mineListeners = new Set<() => void>();
let mine: Mine | null = null;
let mineDemo: Mine = SAMPLE_MINE;

function setMine(next: Mine | null) {
  mine = next;
  mineListeners.forEach((l) => l());
}

/** Prüft beim Server, ob neue Abzeichen dazugekommen sind, und lädt alle eigenen */
export async function checkMyBadges(): Promise<Mine | null> {
  const { data, error } = await supabase.rpc('check_my_badges');
  if (error || !data) return mine;
  const next: Mine = {
    badges: (data.badges ?? []) as MyBadge[],
    progress: { rang: null, posts: 0, einladungen: 0, gruppen: 0, erledigt: 0, ...(data.progress ?? {}) },
  };
  setMine(next);
  return next;
}

export function useMyBadges() {
  const { mode, currentUserId } = useStore();
  const demo = mode === 'demo';
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    mineListeners.add(l);
    return () => {
      mineListeners.delete(l);
    };
  }, []);
  useEffect(() => {
    if (!demo && currentUserId) checkMyBadges().catch(() => undefined);
  }, [demo, currentUserId]);

  const update = useCallback(
    async (kind: BadgeKind, change: { visible?: boolean; selected?: boolean; seen?: boolean }) => {
      const apply = (m: Mine): Mine => ({
        ...m,
        badges: m.badges.map((b) =>
          b.badge === kind
            ? { ...b, ...change }
            : change.selected
              ? { ...b, selected: false }
              : b,
        ),
      });
      if (demo) {
        mineDemo = apply(mineDemo);
        const shown = pickAvatar(mineDemo.badges);
        if (shown) SAMPLE_AVATAR[currentUserId] = shown;
        else delete SAMPLE_AVATAR[currentUserId];
        mineListeners.forEach((l) => l());
        notify();
        return;
      }
      if (mine) setMine(apply(mine));
      const { error } = await supabase.rpc('set_badge', {
        p_badge: kind,
        p_visible: change.visible ?? null,
        p_selected: change.selected ?? null,
        p_seen: change.seen ?? null,
      });
      if (error) {
        await checkMyBadges();
        throw error;
      }
      forgetAvatarBadge(currentUserId);
    },
    [demo, currentUserId],
  );

  return { mine: demo ? mineDemo : mine, update };
}

/** Wie die Sicht avatar_badges: ausgewählt vor zuletzt erhalten, nur eingeblendete */
function pickAvatar(badges: MyBadge[]): AvatarBadge | null {
  const shown = badges.filter((b) => b.visible);
  const pick = shown.find((b) => b.selected) ?? [...shown].sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))[0];
  return pick ? { badge: pick.badge, number: pick.number } : null;
}

/** Eingeblendete Abzeichen einer Person fürs Profil, in der Reihenfolge des Erhalts */
export function useUserBadges(userId: string | undefined): AvatarBadge[] {
  const { mode, currentUserId } = useStore();
  const demo = mode === 'demo';
  const { mine } = useMyBadges();
  const [list, setList] = useState<AvatarBadge[]>([]);
  useEffect(() => {
    if (demo || !userId) return;
    let active = true;
    supabase
      .from('badges')
      .select('badge, number, earned_at')
      .eq('user_id', userId)
      .eq('visible', true)
      .order('earned_at')
      .then(({ data }) => active && setList((data ?? []).map((r: { badge: BadgeKind; number: number | null }) => ({ badge: r.badge, number: r.number }))));
    return () => {
      active = false;
    };
  }, [demo, userId, mine]);
  if (!userId) return [];
  if (userId === currentUserId && mine) return mine.badges.filter((b) => b.visible);
  if (demo) return SAMPLE_AVATAR[userId] ? [SAMPLE_AVATAR[userId]] : [];
  return list;
}
