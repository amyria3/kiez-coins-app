import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../lib/supabase';
import { eventTime, type SingleEvent } from './calendar';
import { WEB_APP_URL } from './groups';
import { dayName } from './katerRoutine';
import { localDate } from './reminders';
import { isModerator, photoUrl, uploadPhoto } from './remote';
import { useStore } from './store';
import { t } from './texts';
import type { ImageSource } from './types';

/**
 * Schaufenster, Bau ohne Geld, erster Teil (Daria, 2026-11-10; Plan: Übergabe/2026-11-10_offen_schaufenster.md).
 * Migration 20261110000400_schaufenster. Erstmal nur für Moderatorinnen sichtbar (useShowcaseEnabled).
 */
export type Visibility = 'public' | 'invite';

export type Showcase = {
  id: string;
  groupId: string;
  name: string;
  slug: string;
  logo?: ImageSource;
  cover?: ImageSource;
  about?: string;
  /** Services als formatierbarer Text (data/richText.ts, Daria, 2026-11-10) */
  services?: string;
  kiez?: string;
  /** Nur für Menschen mit Zugang (showcase_private); sonst leer */
  address?: string;
  /** Bis zu 10 Links (Daria, 2026-11-10: „mehr Links“) */
  links: string[];
  openingHours?: string;
  imprint?: string;
  visibility: Visibility;
  /** Nur für das Team (showcase_private); sonst leer */
  inviteCode: string;
};

export type ShowcaseAccess = {
  /** Gründer:in der Gruppe */
  founder: boolean;
  /** Darf posten und Termine anlegen */
  team: boolean;
  /** Sieht Posts und Termine */
  canSee: boolean;
  following: boolean;
  /** Eigene Anfrage bei „nur für Eingeladene“ */
  request?: 'requested' | 'accepted';
};

export type ShowcaseEvent = {
  id: string;
  title: string;
  body?: string;
  image?: ImageSource;
  startsAt: string;
  endsAt?: string;
  location?: string;
  cancelled: boolean;
  createdAt: string;
  saved: boolean;
  /** Herzen, ein einfacher Zähler; auch ohne Konto (Migration 20261110000500_termin_herzen) */
  likes: number;
};

export type ShowcasePost = { id: string; title: string; body: string; type: string; image?: ImageSource; createdAt: string };

export type ShowcaseEntry = { kind: 'post'; post: ShowcasePost } | { kind: 'event'; event: ShowcaseEvent };

/** Sichtbar sind die 10 neuesten Einträge (Posts und Termine zusammen) */
export const VISIBLE_ENTRIES = 10;

type Row = {
  id: string;
  group_id: string;
  name: string;
  slug: string;
  logo_path: string | null;
  cover_path: string | null;
  about: string | null;
  services: string | null;
  kiez: string | null;
  website: string | null;
  links: string[] | null;
  opening_hours: string | null;
  imprint: string | null;
  visibility: Visibility;
};

/**
 * Lesbare Spalten (Migration 20261110000600): Adresse, Ort und Einladungscode liefert nur showcase_private,
 * damit Menschen ohne Zugang sie nicht sehen.
 */
const COLUMNS = 'id, group_id, name, slug, logo_path, cover_path, about, services, kiez, website, links, opening_hours, imprint, visibility';
type Private = { address: string | null; invite_code: string | null } | null;

const toShowcase = (r: Row): Showcase => ({
  id: r.id,
  groupId: r.group_id,
  name: r.name,
  slug: r.slug,
  logo: photoUrl(r.logo_path),
  cover: photoUrl(r.cover_path),
  about: r.about ?? undefined,
  services: r.services ?? undefined,
  kiez: r.kiez ?? undefined,
  links: r.links?.length ? r.links : r.website ? [r.website] : [],
  openingHours: r.opening_hours ?? undefined,
  imprint: r.imprint ?? undefined,
  visibility: r.visibility,
  inviteCode: '',
});

/** Erstmal nur für Moderatorinnen (Daria, 2026-11-10: wie Routine) */
export function useShowcaseEnabled(): boolean {
  const { mode } = useStore();
  const [moderator, setModerator] = useState(false);
  useEffect(() => {
    if (mode !== 'live') return;
    isModerator().then(setModerator).catch(() => undefined);
  }, [mode]);
  return mode === 'live' && moderator;
}

/** „Café Kiezblick“ → „cafe-kiezblick“ */
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 34);
  return base.length >= 3 ? base : `${base}-kiez`.replace(/^-/, '');
}

/** `undefined`: keins, `null`: Fehler (z. B. Migration fehlt) */
export async function showcaseOfGroup(groupId: string): Promise<Showcase | undefined | null> {
  const { data, error } = await supabase.from('showcases').select(COLUMNS).eq('group_id', groupId).maybeSingle();
  if (error) return null;
  return data ? toShowcase(data as Row) : undefined;
}

export async function loadShowcase(id: string, userId: string): Promise<{ showcase: Showcase; access: ShowcaseAccess } | null> {
  const { data, error } = await supabase.from('showcases').select(COLUMNS).eq('id', id).maybeSingle();
  if (error || !data) return null;
  const showcase = toShowcase(data as Row);
  const { data: priv } = await supabase.rpc('showcase_private', { p_showcase: id });
  showcase.address = (priv as Private)?.address ?? undefined;
  showcase.inviteCode = (priv as Private)?.invite_code ?? '';
  const [member, group, guest, follow, see] = await Promise.all([
    supabase.from('group_members').select('role, can_post_showcase').eq('group_id', showcase.groupId).eq('user_id', userId).maybeSingle(),
    supabase.from('groups').select('founder_id').eq('id', showcase.groupId).maybeSingle(),
    supabase.from('showcase_guests').select('status').eq('showcase_id', id).eq('user_id', userId).maybeSingle(),
    supabase.from('showcase_follows').select('showcase_id').eq('showcase_id', id).eq('user_id', userId).maybeSingle(),
    supabase.rpc('can_see_showcase', { p_showcase: id }),
  ]);
  const m = member.data as { role: string; can_post_showcase: boolean } | null;
  const founder = (group.data as { founder_id: string } | null)?.founder_id === userId;
  return {
    showcase,
    access: {
      founder,
      team: founder || !!m?.can_post_showcase || m?.role === 'founder',
      canSee: see.data === true,
      following: !!follow.data,
      request: (guest.data as { status: 'requested' | 'accepted' } | null)?.status,
    },
  };
}

/** Legt das Schaufenster an; hängt bei belegtem Kurznamen eine Zahl an */
export async function createShowcase(groupId: string, name: string): Promise<string> {
  const base = slugify(name);
  for (let i = 0; i < 5; i++) {
    const slug = i ? `${base.slice(0, 36)}-${i + 1}` : base;
    const { data, error } = await supabase.rpc('create_showcase', { p_group_id: groupId, p_name: name, p_slug: slug });
    if (!error && data) return data as string;
    if (error && !/slug|duplicate|unique/i.test(error.message)) throw new Error(error.message);
  }
  throw new Error('Kein freier Kurzname gefunden.');
}

export type ShowcaseInput = {
  name: string;
  about?: string;
  services?: string;
  kiez?: string;
  address?: string;
  links: string[];
  openingHours?: string;
  imprint?: string;
  visibility: Visibility;
  /** Neues Bild (lokal) oder unverändert */
  logo?: ImageSource;
  cover?: ImageSource;
};

const isLocal = (img?: ImageSource) =>
  !!img && typeof img === 'object' && 'uri' in img && typeof img.uri === 'string' && !img.uri.startsWith('http');

export const MAX_LINKS = 10;
/** „https://www.kiezblick.de/“ → „kiezblick.de“, „https://instagram.com/kiezblick“ → „instagram.com/kiezblick“ */
export const shortLink = (url: string) => url.replace(/^https:\/\/(www\.)?/i, '').replace(/\/$/, '');

export async function updateShowcase(id: string, userId: string, input: ShowcaseInput): Promise<void> {
  const nullIfEmpty = (s?: string) => (s && s.trim() ? s.trim() : null);
  const fields: Record<string, unknown> = {
    name: input.name.trim(),
    about: nullIfEmpty(input.about),
    services: nullIfEmpty(input.services),
    kiez: nullIfEmpty(input.kiez),
    address: nullIfEmpty(input.address),
    links: input.links.map((l) => l.trim()).filter(Boolean).slice(0, MAX_LINKS),
    // Die alte Spalte bleibt der erste Link
    website: input.links.map((l) => l.trim()).find(Boolean) ?? null,
    opening_hours: nullIfEmpty(input.openingHours),
    imprint: nullIfEmpty(input.imprint),
    visibility: input.visibility,
  };
  if (isLocal(input.logo)) fields.logo_path = await uploadPhoto(userId, input.logo!);
  if (isLocal(input.cover)) fields.cover_path = await uploadPhoto(userId, input.cover!);
  const { error } = await supabase.from('showcases').update(fields).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteShowcase(id: string): Promise<boolean> {
  const { error } = await supabase.from('showcases').delete().eq('id', id);
  return !error;
}

/** Mitglieder, die posten dürfen (für die Gründer:in) */
export async function showcasePosters(groupId: string): Promise<Record<string, boolean>> {
  const { data } = await supabase.from('group_members').select('user_id, role, can_post_showcase').eq('group_id', groupId);
  return Object.fromEntries(
    ((data ?? []) as { user_id: string; role: string; can_post_showcase: boolean }[]).map((m) => [m.user_id, m.role === 'founder' || m.can_post_showcase]),
  );
}
export async function setShowcasePoster(groupId: string, userId: string, allow: boolean): Promise<boolean> {
  const { error } = await supabase.rpc('set_showcase_poster', { p_group_id: groupId, p_user_id: userId, p_allow: allow });
  return !error;
}

// ---------- Einträge ----------

export async function loadEntries(showcaseId: string, userId: string): Promise<ShowcaseEntry[]> {
  const [posts, events] = await Promise.all([
    supabase
      .from('challenges')
      .select('id, title, body, type, image_path, created_at, status')
      .eq('showcase_id', showcaseId)
      .neq('status', 'draft')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(VISIBLE_ENTRIES),
    supabase
      .from('showcase_events')
      .select('*')
      .eq('showcase_id', showcaseId)
      .order('created_at', { ascending: false })
      .limit(VISIBLE_ENTRIES),
  ]);
  const eventRows = (events.data ?? []) as {
    id: string;
    title: string;
    body: string | null;
    image_path: string | null;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    cancelled_at: string | null;
    created_at: string;
    likes?: number;
  }[];
  const { data: saves } = eventRows.length
    ? await supabase.from('event_saves').select('event_id').eq('user_id', userId).in('event_id', eventRows.map((e) => e.id))
    : { data: [] };
  const saved = new Set(((saves ?? []) as { event_id: string }[]).map((s) => s.event_id));
  const entries: ShowcaseEntry[] = [
    ...((posts.data ?? []) as { id: string; title: string; body: string; type: string; image_path: string | null; created_at: string }[]).map(
      (p): ShowcaseEntry => ({
        kind: 'post',
        post: { id: p.id, title: p.title, body: p.body, type: p.type, image: photoUrl(p.image_path), createdAt: p.created_at },
      }),
    ),
    ...eventRows.map(
      (e): ShowcaseEntry => ({
        kind: 'event',
        event: {
          id: e.id,
          title: e.title,
          body: e.body ?? undefined,
          image: photoUrl(e.image_path),
          startsAt: e.starts_at,
          endsAt: e.ends_at ?? undefined,
          location: e.location ?? undefined,
          cancelled: !!e.cancelled_at,
          createdAt: e.created_at,
          saved: saved.has(e.id),
          likes: e.likes ?? 0,
        },
      }),
    ),
  ];
  const at = (x: ShowcaseEntry) => (x.kind === 'post' ? x.post.createdAt : x.event.createdAt);
  return entries.sort((a, b) => at(b).localeCompare(at(a))).slice(0, VISIBLE_ENTRIES);
}

export type EventInput = { title: string; body?: string; image?: ImageSource; startsAt: Date; endsAt?: Date; location?: string };

export async function createEvent(showcaseId: string, userId: string, input: EventInput): Promise<void> {
  const image_path = isLocal(input.image) ? await uploadPhoto(userId, input.image!) : null;
  const { error } = await supabase.from('showcase_events').insert({
    showcase_id: showcaseId,
    title: input.title.trim(),
    body: input.body?.trim() || null,
    image_path,
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt ? input.endsAt.toISOString() : null,
    location: input.location?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function cancelEvent(id: string): Promise<boolean> {
  const { error } = await supabase.from('showcase_events').update({ cancelled_at: new Date().toISOString() }).eq('id', id);
  return !error;
}

export async function saveEvent(id: string, save: boolean): Promise<boolean> {
  const { error } = save
    ? await supabase.from('event_saves').insert({ event_id: id })
    : await supabase.from('event_saves').delete().eq('event_id', id);
  return !error;
}

/** Herz für einen Termin setzen oder zurücknehmen; liefert die neue Zahl oder `null` */
export async function likeEvent(id: string, on: boolean): Promise<number | null> {
  const { data, error } = await supabase.rpc('like_event', { p_event_id: id, p_on: on });
  return error || typeof data !== 'number' ? null : data;
}

/** Welche Termine dieses Gerät geliked hat; die Datenbank speichert das nicht (einfacher Zähler) */
const LIKES_KEY = 'event-likes';
export async function likedEvents(): Promise<Set<string>> {
  try {
    return new Set(JSON.parse((await AsyncStorage.getItem(LIKES_KEY)) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}
export async function rememberLike(id: string, on: boolean): Promise<void> {
  const set = await likedEvents();
  if (on) set.add(id);
  else set.delete(id);
  await AsyncStorage.setItem(LIKES_KEY, JSON.stringify([...set])).catch(() => {});
}

export async function eventSaveCount(id: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('event_save_count', { p_event_id: id });
  return error || data === null ? null : (data as number);
}

/** Gespeicherte Termine ab heute, für Routine (Änderungen und Absagen des Teams kommen so automatisch an) */
export async function savedEvents(userId: string): Promise<(ShowcaseEvent & { showcase: string })[]> {
  const { data, error } = await supabase
    .from('event_saves')
    .select('event:showcase_events(*, showcase:showcases(name))')
    .eq('user_id', userId);
  if (error || !data) return [];
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  return (data as unknown as { event: Record<string, unknown> | null }[])
    .map((r) => r.event)
    .filter((e): e is Record<string, unknown> => !!e && new Date(e.starts_at as string) >= since)
    .map((e) => ({
      id: e.id as string,
      title: e.title as string,
      body: (e.body as string | null) ?? undefined,
      image: photoUrl(e.image_path as string | null),
      startsAt: e.starts_at as string,
      endsAt: (e.ends_at as string | null) ?? undefined,
      location: (e.location as string | null) ?? undefined,
      cancelled: !!e.cancelled_at,
      createdAt: e.created_at as string,
      saved: true,
      likes: (e.likes as number | undefined) ?? 0,
      showcase: ((e.showcase as { name: string } | null)?.name ?? '') as string,
    }))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

// ---------- Folgen, Einladung ----------

/** Öffentliche Seite ohne Anmeldung, nur bei Sichtbarkeit „Alle“ (api/s.mjs) */
export const showcasePublicLink = (slug: string) => `https://kiezcoins.de/s/${slug}`;

export const showcaseInviteLink = (code: string) => `${WEB_APP_URL}/schaufenster/beitreten?code=${encodeURIComponent(code)}`;

export async function follow(showcaseId: string, on: boolean): Promise<boolean> {
  const { error } = on
    ? await supabase.from('showcase_follows').insert({ showcase_id: showcaseId })
    : await supabase.from('showcase_follows').delete().eq('showcase_id', showcaseId);
  return !error;
}

export async function requestAccess(showcaseId: string): Promise<boolean> {
  const { error } = await supabase.from('showcase_guests').insert({ showcase_id: showcaseId });
  return !error;
}

export async function joinShowcase(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_showcase', { p_code: code });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function openRequests(showcaseId: string): Promise<{ userId: string; handle: string }[]> {
  const { data } = await supabase.from('showcase_guests').select('user_id').eq('showcase_id', showcaseId).eq('status', 'requested');
  const ids = ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
  if (!ids.length) return [];
  const { data: profiles } = await supabase.from('profiles').select('id, handle').in('id', ids);
  const handles = new Map(((profiles ?? []) as { id: string; handle: string | null }[]).map((p) => [p.id, p.handle ?? '']));
  return ids.map((id) => ({ userId: id, handle: handles.get(id) || 'Neue Crew' }));
}

export async function answerRequest(showcaseId: string, userId: string, accept: boolean): Promise<boolean> {
  const { error } = await supabase.rpc('answer_showcase_request', { p_showcase_id: showcaseId, p_user_id: userId, p_accept: accept });
  return !error;
}

// ---------- Posten im Schaufenster ----------

/**
 * „Post erstellen“ im Schaufenster öffnet das Erstellen-Blatt über dem Feed. Der nächste Post, der dort entsteht,
 * kommt ins Schaufenster (attach_showcase_post). Schließt das Blatt ohne Post, verfällt der Auftrag.
 */
let pendingShowcase: { id: string; name: string } | null = null;
export const setShowcasePost = (s: { id: string; name: string }) => {
  pendingShowcase = s;
};
export const peekShowcasePost = () => pendingShowcase;
export const clearShowcasePost = () => {
  pendingShowcase = null;
};
export async function attachShowcasePost(challengeId: string): Promise<void> {
  const target = pendingShowcase;
  pendingShowcase = null;
  if (!target) return;
  await supabase
    .rpc('attach_showcase_post', { p_challenge_id: challengeId, p_showcase_id: target.id })
    .then(() => undefined, () => undefined);
}

/** „Do, 12.11. um 19:00“, „Heute von 19:00 bis 22:00“ (mehrtägig: „… bis Fr, 13.11. 02:00“) */
export function eventWhen(e: Pick<ShowcaseEvent, 'startsAt' | 'endsAt'>, now = new Date()): string {
  const start = new Date(e.startsAt);
  const day = dayName(localDate(start), now);
  const from = eventTime(e.startsAt);
  if (!e.endsAt) return t('{day} um {from}', { day, from });
  const end = new Date(e.endsAt);
  const until = eventTime(e.endsAt);
  if (localDate(end) === localDate(start)) return t('{day} von {from} bis {until}', { day, from, until });
  return t('{day} {from} bis {endDay} {until}', { day, from, endDay: dayName(localDate(end), now), until });
}

/** Für „In meinen Kalender“ */
export const asSingleEvent = (e: ShowcaseEvent, showcase?: string): SingleEvent => ({
  id: e.id,
  title: e.title,
  start: new Date(e.startsAt),
  end: e.endsAt ? new Date(e.endsAt) : undefined,
  location: e.location,
  notes: [showcase, e.body].filter(Boolean).join('\n\n') || undefined,
});

// ---------- Schaufenster ohne die Social App (kiezcoins.de/schaufenster, Daria, 2026-11-10) ----------

/** Schaufenster, die die Person pflegt: Gruppen, in denen sie Gründer:in ist oder posten darf */
export async function myShowcases(userId: string): Promise<Showcase[]> {
  const { data: members } = await supabase.from('group_members').select('group_id, role, can_post_showcase').eq('user_id', userId);
  const ids = ((members ?? []) as { group_id: string; role: string; can_post_showcase: boolean }[])
    .filter((m) => m.role === 'founder' || m.can_post_showcase)
    .map((m) => m.group_id);
  if (!ids.length) return [];
  const { data } = await supabase.from('showcases').select(COLUMNS).in('group_id', ids).order('created_at');
  return ((data ?? []) as unknown as Row[]).map(toShowcase);
}

/**
 * Deckname für Konten, die nur ein Schaufenster pflegen: der Name des Schaufensters, bei Bedarf mit Kiez oder Zahl.
 * So steht bei Posts im Feed der Name des Ladens. Ein vorhandener Deckname bleibt.
 */
export async function handleFromShowcase(userId: string, name: string, kiez?: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('handle').eq('id', userId).maybeSingle();
  const current = (data as { handle: string | null } | null)?.handle;
  if (current?.trim()) return current;
  const base = name.trim().slice(0, 30);
  const tries = [base, kiez ? `${base} ${kiez}`.slice(0, 30) : null, `${base.slice(0, 27)} 2`, `${base.slice(0, 27)} 3`].filter(Boolean) as string[];
  for (const handle of tries) {
    const { error } = await supabase.from('profiles').update({ handle }).eq('id', userId);
    if (!error) return handle;
  }
  return null;
}
