// Weiterposten auf BlueSky, Mastodon, Instagram und Facebook (Daria, 05.11.2026; Facebook 09.11.2026).
// Alle vier Schnittstellen kosten nichts.
//
// Anfragen (POST, mit Anmeldung der Person im Header Authorization):
//   { action: 'connect', platform: 'bluesky', handle, password }      App-Passwort aus BlueSky › Einstellungen
//   { action: 'connect', platform: 'mastodon', instance, token }      Zugangs-Token aus Mastodon › Entwicklung
//   { action: 'connect', platform: 'instagram', token }               Zugangs-Token aus Meta for Developers (Instagram-Login)
//   { action: 'connect', platform: 'facebook', token }                Seiten-Zugangs-Token einer Facebook-Seite (pages_manage_posts)
//   { action: 'post', challengeId, platforms: ['bluesky', 'mastodon', 'instagram', 'facebook'], look?: { frame, watermark } }
//                                                                    look: Foto im Rahmen, mit Logo; ohne Angabe beides an
//   { action: 'delete', challengeId, platforms? }                    Weiterposts dort wieder löschen (ohne platforms: alle)
// Antworten: { handle } bei connect, { results: { bluesky: { url } | { error } } } bei post, sonst { error }.
//
// Gepostet werden nur eigene Posts, die eine öffentliche Seite bekommen dürfen (share_challenge, Migration
// 20261103000200_teilen). Der Weiterpost enthält Titel, Text, das Foto und den Link kiezcoins.de/c/<id>.
// Zugänge stehen in crosspost_accounts (Migration 20261105000100_weiterposten), lesbar nur mit dem Service-Schlüssel.
//
// SUPABASE_URL, SUPABASE_ANON_KEY und SUPABASE_SERVICE_ROLE_KEY stellt Supabase selbst bereit. Keine weiteren Secrets.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';

import { FULL_LOOK, framePhoto, type Look } from './rahmen.ts';

type Platform = 'bluesky' | 'mastodon' | 'instagram' | 'facebook';
const PLATFORMS: Platform[] = ['bluesky', 'mastodon', 'instagram', 'facebook'];
const isPlatform = (p: unknown): p is Platform => PLATFORMS.includes(p as Platform);
type Account = { platform: Platform; handle: string; instance: string; secret: string };
type Post = {
  id: string;
  title: string;
  body: string;
  link: string;
  image?: { bytes: Uint8Array; type: string; width?: number; height?: number };
  imageUrl?: string;
};

const BLUESKY = 'https://bsky.social';
/** BlueSky nimmt Bilder bis 1 MB, Texte bis 300 Zeichen. Mastodon Texte bis 500 Zeichen. */
const BLUESKY_IMAGE_MAX = 1_000_000;
/** Kantenlängen und JPEG-Qualitäten, mit denen ein zu großes Foto für BlueSky verkleinert wird, der Reihe nach */
const BLUESKY_SHRINK: [number, number][] = [[2000, 85], [1600, 80], [1600, 70], [1200, 70], [1000, 60]];
const BLUESKY_TEXT_MAX = 300;
const MASTODON_TEXT_MAX = 500;
/** Instagram: Bildunterschrift bis 2200 Zeichen, nur JPEG, Foto ist Pflicht. */
const INSTAGRAM = 'https://graph.instagram.com';
const INSTAGRAM_API = `${INSTAGRAM}/v21.0`;
const INSTAGRAM_TEXT_MAX = 2200;
/** Facebook: nur Seiten, keine privaten Profile (die Schnittstelle erlaubt das nicht). Foto ist freiwillig. */
const FACEBOOK = 'https://graph.facebook.com';
const FACEBOOK_API = `${FACEBOOK}/v21.0`;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const clip = (value: string, max: number) => value.slice(0, max);

/** Nur echte öffentliche Adressen, keine IPs und kein localhost (die Funktion ruft die Adresse selbst auf). */
function normalizeInstance(value: string): string | null {
  try {
    const url = new URL(/^https?:\/\//.test(value) ? value : `https://${value}`);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || !host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':')) return null;
    return `https://${host}`;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// BlueSky (AT-Protokoll)
// ---------------------------------------------------------------------------

async function blueskySession(instance: string, identifier: string, password: string) {
  const res = await fetch(`${instance}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) throw new Error('login');
  return (await res.json()) as { accessJwt: string; did: string; handle: string };
}

const graphemes = (value: string) => [...new Intl.Segmenter('de', { granularity: 'grapheme' }).segment(value)].map((s) => s.segment);

/** Text bis zur Grenze kürzen, in Graphemen gezählt (Emojis zählen wie ein Zeichen). */
function clipGraphemes(value: string, max: number) {
  const parts = graphemes(value);
  return parts.length <= max ? value : `${parts.slice(0, Math.max(0, max - 1)).join('').trimEnd()}…`;
}

/**
 * Foto für BlueSky: unverändert, wenn es klein genug ist, sonst als JPEG verkleinert, bis es unter 1 MB liegt.
 * Gibt auch die Maße zurück, damit BlueSky das Foto im richtigen Seitenverhältnis zeigt.
 */
async function blueskyPhoto(image: NonNullable<Post['image']>) {
  if (image.bytes.length <= BLUESKY_IMAGE_MAX && image.width && image.height) return image;
  if (image.bytes.length <= BLUESKY_IMAGE_MAX) {
    const size = await Image.decode(image.bytes).then((d) => ({ width: d.width, height: d.height })).catch(() => ({}));
    return { ...image, ...size } as typeof image & { width?: number; height?: number };
  }
  const decoded = await Image.decode(image.bytes);
  for (const [edge, quality] of BLUESKY_SHRINK) {
    const scaled = decoded.clone();
    if (Math.max(scaled.width, scaled.height) > edge) {
      if (scaled.width >= scaled.height) scaled.resize(edge, Image.RESIZE_AUTO);
      else scaled.resize(Image.RESIZE_AUTO, edge);
    }
    const bytes = await scaled.encodeJPEG(quality);
    if (bytes.length <= BLUESKY_IMAGE_MAX) return { bytes, type: 'image/jpeg', width: scaled.width, height: scaled.height };
  }
  return undefined;
}

async function postBluesky(account: Account, post: Post): Promise<string> {
  const session = await blueskySession(account.instance, account.handle, account.secret);
  const auth = { Authorization: `Bearer ${session.accessJwt}` };
  const encoder = new TextEncoder();

  // Text: Titel, Text, Link. Der Link bekommt eine Facette, damit er klickbar ist.
  const tail = `\n\n${post.link}`;
  const head = clipGraphemes([post.title, post.body].filter(Boolean).join('\n\n'), BLUESKY_TEXT_MAX - graphemes(tail).length);
  const text = head + tail;
  const byteStart = encoder.encode(head + '\n\n').length;
  const facets = [
    {
      index: { byteStart, byteEnd: byteStart + encoder.encode(post.link).length },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: post.link }],
    },
  ];

  let embed: Record<string, unknown> | undefined;
  // Fotos aus der App haben oft 1 bis 2,5 MB, BlueSky nimmt nur bis 1 MB: dann erst verkleinern (Daria, 13.11.2026)
  const photo = post.image ? await blueskyPhoto(post.image).catch(() => undefined) : undefined;
  if (photo) {
    const upload = await fetch(`${account.instance}/xrpc/com.atproto.repo.uploadBlob`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': photo.type },
      body: photo.bytes,
    });
    if (upload.ok) {
      const { blob } = await upload.json();
      const aspectRatio = photo.width && photo.height ? { width: photo.width, height: photo.height } : undefined;
      embed = { $type: 'app.bsky.embed.images', images: [{ alt: post.title, image: blob, aspectRatio }] };
    } else {
      console.error('bluesky uploadBlob', upload.status, await upload.text().catch(() => ''));
    }
  }
  // Verkleinern oder Upload gescheitert: Linkkarte ohne Bild
  embed ??= { $type: 'app.bsky.embed.external', external: { uri: post.link, title: post.title, description: clip(post.body, 300) } };

  const res = await fetch(`${account.instance}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repo: session.did,
      collection: 'app.bsky.feed.post',
      record: { $type: 'app.bsky.feed.post', text, facets, embed, langs: ['de'], createdAt: new Date().toISOString() },
    }),
  });
  if (!res.ok) throw new Error(`post ${res.status}`);
  const { uri } = (await res.json()) as { uri: string };
  return `https://bsky.app/profile/${session.handle}/post/${uri.split('/').pop()}`;
}

// ---------------------------------------------------------------------------
// Mastodon
// ---------------------------------------------------------------------------

async function mastodonAccount(instance: string, token: string) {
  const res = await fetch(`${instance}/api/v1/accounts/verify_credentials`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('login');
  return (await res.json()) as { acct: string };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function postMastodon(account: Account, post: Post): Promise<string> {
  const auth = { Authorization: `Bearer ${account.secret}` };
  const mediaIds: string[] = [];
  if (post.image) {
    const form = new FormData();
    form.append('file', new Blob([post.image.bytes], { type: post.image.type }), 'foto');
    form.append('description', post.title);
    const media = await fetch(`${account.instance}/api/v2/media`, { method: 'POST', headers: auth, body: form });
    if (media.ok) mediaIds.push(((await media.json()) as { id: string }).id);
  }
  const tail = `\n\n${post.link}`;
  // Mastodon zählt jeden Link als 23 Zeichen
  const head = clip([post.title, post.body].filter(Boolean).join('\n\n'), MASTODON_TEXT_MAX - 25);
  const body = JSON.stringify({ status: head + tail, media_ids: mediaIds, visibility: 'public', language: 'de' });
  // Ein Schlüssel pro Aufruf: schützt die Wiederholungen unten vor Doppelposts, erlaubt aber neues Posten nach dem Löschen
  const idempotencyKey = `${post.id}-${crypto.randomUUID()}`;
  // Ein frisch hochgeladenes Foto ist manchmal noch in Arbeit (422). Dann kurz warten und noch einmal.
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${account.instance}/api/v1/statuses`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body,
    });
    if (res.ok) return ((await res.json()) as { url: string }).url;
    if (res.status !== 422 || !mediaIds.length) throw new Error(`post ${res.status}`);
    await wait(2000);
  }
  throw new Error('media');
}

// ---------------------------------------------------------------------------
// Instagram (Instagram-API mit Instagram-Login). Das Foto holt Instagram selbst über die öffentliche Adresse.
// ---------------------------------------------------------------------------

async function instagram(path: string, token: string, init?: { method?: string; params?: Record<string, string> }) {
  const url = new URL(`${INSTAGRAM_API}/${path}`);
  for (const [k, v] of Object.entries(init?.params ?? {})) url.searchParams.set(k, v);
  url.searchParams.set('access_token', token);
  const res = await fetch(url, { method: init?.method ?? 'GET' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`instagram ${res.status} ${clip(body?.error?.message ?? '', 200)}`.trim());
  return body as Record<string, unknown>;
}

async function instagramAccount(token: string) {
  try {
    const me = await instagram('me', token, { params: { fields: 'user_id,username' } });
    return { username: String(me.username ?? '') };
  } catch {
    throw new Error('login');
  }
}

async function postInstagram(account: Account, post: Post): Promise<string> {
  // Instagram nimmt nur Posts mit Foto, und nur JPEG
  if (!post.imageUrl || (post.image && !/jpe?g/.test(post.image.type))) throw new Error('no_photo');
  const caption = `${clip([post.title, post.body].filter(Boolean).join('\n\n'), INSTAGRAM_TEXT_MAX - post.link.length - 4)}\n\n${post.link}`;
  const container = await instagram('me/media', account.secret, { method: 'POST', params: { image_url: post.imageUrl, caption } });
  const creationId = String(container.id);
  // Instagram lädt das Foto erst herunter. Bis es fertig ist, kurz warten.
  for (let attempt = 0; attempt < 10; attempt++) {
    const status = await instagram(creationId, account.secret, { params: { fields: 'status_code' } });
    if (status.status_code === 'FINISHED') break;
    if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') throw new Error(`media ${status.status_code}`);
    await wait(2000);
  }
  const published = await instagram('me/media_publish', account.secret, { method: 'POST', params: { creation_id: creationId } });
  const media = await instagram(String(published.id), account.secret, { params: { fields: 'permalink' } });
  // Kennung vorne an den Link, damit das Löschen sie findet (Permalinks enthalten sie nicht)
  return `${media.permalink ?? 'https://www.instagram.com/'}#${published.id}`;
}

async function deleteInstagram(account: Account, link: string) {
  const id = link.split('#').pop();
  if (!id) throw new Error('delete id');
  await instagram(id, account.secret, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Facebook-Seite (Graph-API mit Seiten-Zugangs-Token). Das Foto holt Facebook selbst über die öffentliche Adresse.
// ---------------------------------------------------------------------------

async function facebook(path: string, token: string, init?: { method?: string; params?: Record<string, string> }) {
  const url = new URL(`${FACEBOOK_API}/${path}`);
  for (const [k, v] of Object.entries(init?.params ?? {})) url.searchParams.set(k, v);
  url.searchParams.set('access_token', token);
  const res = await fetch(url, { method: init?.method ?? 'GET' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`facebook ${res.status} ${clip(body?.error?.message ?? '', 200)}`.trim());
  return body as Record<string, unknown>;
}

/** Mit einem Seiten-Token liefert `me` die Seite selbst */
async function facebookPage(token: string) {
  try {
    const me = await facebook('me', token, { params: { fields: 'id,name' } });
    if (!me.id) throw new Error('login');
    return { id: String(me.id), name: String(me.name ?? '') };
  } catch {
    throw new Error('login');
  }
}

async function postFacebook(account: Account, post: Post): Promise<string> {
  const message = [post.title, post.body, post.link].filter(Boolean).join('\n\n');
  // instance enthält die Kennung der Seite
  const page = account.instance.split('/').pop()!;
  const created = post.imageUrl
    ? await facebook(`${page}/photos`, account.secret, { method: 'POST', params: { url: post.imageUrl, caption: message } })
    : await facebook(`${page}/feed`, account.secret, { method: 'POST', params: { message, link: post.link } });
  const id = String(created.post_id ?? created.id);
  const info = await facebook(id, account.secret, { params: { fields: 'permalink_url' } }).catch(() => ({}) as Record<string, unknown>);
  // Kennung hinten an den Link, damit das Löschen sie findet
  return `${info.permalink_url ?? `https://www.facebook.com/${id}`}#${id}`;
}

async function deleteFacebook(account: Account, link: string) {
  const id = link.split('#').pop();
  if (!id) throw new Error('delete id');
  try {
    await facebook(id, account.secret, { method: 'DELETE' });
  } catch (e) {
    // Dort schon gelöscht
    if (!/facebook 404|does not exist/.test((e as Error).message)) throw e;
  }
}

// ---------------------------------------------------------------------------
// Löschen: Der Link in crosspost_posts enthält die Kennung des Posts (letzter Teil des Pfads).
// ---------------------------------------------------------------------------

async function deleteBluesky(account: Account, link: string) {
  const session = await blueskySession(account.instance, account.handle, account.secret);
  const res = await fetch(`${account.instance}/xrpc/com.atproto.repo.deleteRecord`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.accessJwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo: session.did, collection: 'app.bsky.feed.post', rkey: link.split('/').pop() }),
  });
  if (!res.ok) throw new Error(`delete ${res.status}`);
}

async function deleteMastodon(account: Account, link: string) {
  const id = new URL(link).pathname.split('/').pop();
  const res = await fetch(`${account.instance}/api/v1/statuses/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${account.secret}` },
  });
  // 404: dort schon gelöscht
  if (!res.ok && res.status !== 404) throw new Error(`delete ${res.status}`);
}

// ---------------------------------------------------------------------------

/** Post einmal pro Anfrage laden; das Foto kommt im gewählten Look (Rahmen, Logo) */
async function loadPost(admin: SupabaseClient, challengeId: string, look: Look): Promise<Omit<Post, 'link'>> {
  const { data: c, error } = await admin
    .from('challenges')
    .select('id, title, body, author_id, image_path, image_after_path, image_before_path')
    .eq('id', challengeId)
    .single();
  if (error || !c) throw new Error('challenge');
  const path = c.image_after_path ?? c.image_path ?? c.image_before_path;
  let image: Post['image'];
  let imageUrl = path ? `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/photos/${path}` : undefined;
  if (path) {
    const { data } = await admin.storage.from('photos').download(path);
    if (data) image = { bytes: new Uint8Array(await data.arrayBuffer()), type: data.type || 'image/jpeg' };
  }
  if (image && look.frame) {
    try {
      const framed = await framePhoto(image.bytes, await loadAuthor(admin, c.author_id), look);
      image = { bytes: framed.bytes, type: 'image/jpeg', width: framed.width, height: framed.height };
      // Instagram und Facebook holen das Foto über eine öffentliche Adresse
      const framedPath = `weiterposten/${c.id}.jpg`;
      const { error: uploadError } = await admin.storage
        .from('photos')
        .upload(framedPath, framed.bytes, { contentType: 'image/jpeg', upsert: true });
      if (!uploadError) imageUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/photos/${framedPath}?v=${Date.now()}`;
    } catch (e) {
      // Rahmen gescheitert: Foto ohne Rahmen
      console.error('rahmen', (e as Error).message);
    }
  }
  return { id: c.id, title: (c.title ?? '').trim(), body: (c.body ?? '').trim(), image, imageUrl };
}

/** Name und Profilbild für den Rahmen */
async function loadAuthor(admin: SupabaseClient, authorId: string | null) {
  if (!authorId) return undefined;
  const { data: p } = await admin.from('profiles').select('handle, avatar_path').eq('id', authorId).maybeSingle();
  if (!p?.handle) return undefined;
  let avatar: Uint8Array | undefined;
  if (p.avatar_path) {
    const { data } = await admin.storage.from('photos').download(p.avatar_path);
    if (data) avatar = new Uint8Array(await data.arrayBuffer());
  }
  return { name: String(p.handle), avatar };
}

const parseLook = (value: unknown): Look => {
  const v = (value ?? {}) as Partial<Look>;
  return { frame: v.frame !== false, watermark: v.watermark !== false };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'method' }, 405);

  const authorization = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: auth } = await asUser.auth.getUser();
  const user = auth.user;
  if (!user || user.is_anonymous) return reply({ error: 'auth' }, 401);
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return reply({ error: 'input' }, 400);
  }
  const str = (key: string) => (typeof input[key] === 'string' ? (input[key] as string).trim() : '');

  if (input.action === 'connect') {
    const platform = input.platform;
    let account: Omit<Account, 'platform'>;
    try {
      if (platform === 'bluesky') {
        const handle = str('handle').replace(/^@/, '');
        const password = str('password');
        if (!handle || !password) return reply({ error: 'input' }, 400);
        const session = await blueskySession(BLUESKY, handle, password);
        account = { handle: session.handle, instance: BLUESKY, secret: password };
      } else if (platform === 'mastodon') {
        const instance = normalizeInstance(str('instance'));
        const token = str('token');
        if (!instance || !token) return reply({ error: 'input' }, 400);
        const { acct } = await mastodonAccount(instance, token);
        account = { handle: acct.includes('@') ? acct : `${acct}@${new URL(instance).hostname}`, instance, secret: token };
      } else if (platform === 'instagram') {
        const token = str('token');
        if (!token) return reply({ error: 'input' }, 400);
        const { username } = await instagramAccount(token);
        account = { handle: username || 'instagram', instance: INSTAGRAM, secret: token };
      } else if (platform === 'facebook') {
        const token = str('token');
        if (!token) return reply({ error: 'input' }, 400);
        const page = await facebookPage(token);
        account = { handle: page.name || 'Facebook-Seite', instance: `${FACEBOOK}/${page.id}`, secret: token };
      } else {
        return reply({ error: 'platform' }, 400);
      }
    } catch {
      return reply({ error: 'login' }, 400);
    }
    const { error } = await admin
      .from('crosspost_accounts')
      .upsert({ user_id: user.id, platform, ...account }, { onConflict: 'user_id,platform' });
    if (error) return reply({ error: 'save' }, 500);
    return reply({ handle: account.handle });
  }

  if (input.action === 'post') {
    const challengeId = str('challengeId');
    const platforms = (Array.isArray(input.platforms) ? input.platforms : []).filter(isPlatform);
    if (!challengeId || !platforms.length) return reply({ error: 'input' }, 400);

    // Prüft Ersteller:in und ob der Post öffentlich sein darf; gibt ihn zugleich für die Seite kiezcoins.de/c/<id> frei
    const { error: shareError } = await asUser.rpc('share_challenge', { p_challenge_id: challengeId });
    if (shareError) return reply({ error: 'not_shareable' }, 403);

    const { data: accounts } = await admin
      .from('crosspost_accounts')
      .select('platform, handle, instance, secret')
      .eq('user_id', user.id)
      .in('platform', platforms);
    const { data: done } = await admin
      .from('crosspost_posts')
      .select('platform, status, url')
      .eq('challenge_id', challengeId);

    const results: Record<string, { url?: string; error?: string }> = {};
    // Rahmen und Logo, wie unter Funktionen gewählt; erlaubt ist, was die Freischaltung hergibt (Daria, 2026-11-13):
    // beides eigene Funktionen, im Moment für alle an; gesperrt wird später über public.features.default_on
    const wanted = input.look === undefined ? FULL_LOOK : parseLook(input.look);
    const feature = async (key: string, fallback: boolean) => {
      const { data, error } = await asUser.rpc('feature_an', { p_key: key });
      return error || typeof data !== 'boolean' ? fallback : data;
    };
    const look: Look = {
      frame: wanted.frame && (await feature('weiterposten_rahmen', true)),
      watermark: wanted.watermark || !(await feature('weiterposten_ohne_logo', true)),
    };
    // Das Foto (mit Rahmen) einmal für alle Plattformen vorbereiten
    let base: Promise<Omit<Post, 'link'>> | undefined;
    for (const platform of platforms) {
      const account = (accounts ?? []).find((a) => a.platform === platform) as Account | undefined;
      if (!account) {
        results[platform] = { error: 'not_connected' };
        continue;
      }
      // Jeder Post höchstens einmal pro Plattform; nach einem Fehler darf es noch einmal klappen
      const previous = (done ?? []).find((d) => d.platform === platform);
      if (previous && previous.status !== 'error') {
        results[platform] = previous.url ? { url: previous.url } : { error: 'running' };
        continue;
      }
      await admin
        .from('crosspost_posts')
        .upsert({ challenge_id: challengeId, platform, user_id: user.id, status: 'running', url: null, error: null });
      try {
        base ??= loadPost(admin, challengeId, look);
        const post: Post = { ...(await base), link: `https://kiezcoins.de/c/${challengeId}?von=${platform}` };
        const link =
          platform === 'bluesky'
            ? await postBluesky(account, post)
            : platform === 'mastodon'
              ? await postMastodon(account, post)
              : platform === 'instagram'
                ? await postInstagram(account, post)
                : await postFacebook(account, post);
        await admin.from('crosspost_posts').update({ status: 'ok', url: link }).eq('challenge_id', challengeId).eq('platform', platform);
        results[platform] = { url: link };
      } catch (e) {
        const message = clip((e as Error).message || 'error', 500);
        await admin.from('crosspost_posts').update({ status: 'error', error: message }).eq('challenge_id', challengeId).eq('platform', platform);
        results[platform] = { error: message };
      }
    }
    return reply({ results });
  }

  if (input.action === 'delete') {
    // Weiterposts eines Posts dort wieder löschen. Nur die eigenen Zeilen. Die Zeile bleibt mit Fehler 'deleted'
    // stehen: Beim Wiederherstellen postet die App dorthin neu (post versucht Zeilen mit Fehler erneut).
    const challengeId = str('challengeId');
    if (!challengeId) return reply({ error: 'input' }, 400);
    const { data: posts } = await admin
      .from('crosspost_posts')
      .select('platform, url')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .eq('status', 'ok');
    const { data: accounts } = await admin
      .from('crosspost_accounts')
      .select('platform, handle, instance, secret')
      .eq('user_id', user.id);
    const only = Array.isArray(input.platforms) ? (input.platforms as unknown[]) : null;
    const results: Record<string, { deleted?: boolean; error?: string }> = {};
    for (const { platform, url: link } of (posts ?? []).filter((p) => !only || only.includes(p.platform))) {
      const account = (accounts ?? []).find((a) => a.platform === platform) as Account | undefined;
      if (!account || !link) {
        results[platform] = { error: 'not_connected' };
        continue;
      }
      try {
        if (platform === 'bluesky') await deleteBluesky(account, link);
        else if (platform === 'mastodon') await deleteMastodon(account, link);
        else if (platform === 'instagram') await deleteInstagram(account, link);
        else await deleteFacebook(account, link);
        await admin
          .from('crosspost_posts')
          .update({ status: 'error', error: 'deleted', url: null })
          .eq('challenge_id', challengeId)
          .eq('platform', platform);
        results[platform] = { deleted: true };
      } catch (e) {
        const message = clip((e as Error).message || 'error', 500);
        await admin.from('crosspost_posts').update({ error: message }).eq('challenge_id', challengeId).eq('platform', platform);
        results[platform] = { error: message };
      }
    }
    return reply({ results });
  }

  return reply({ error: 'action' }, 400);
});
