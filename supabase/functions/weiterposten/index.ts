// Weiterposten auf BlueSky und Mastodon (Daria, 05.11.2026). Beide Schnittstellen kosten nichts.
//
// Anfragen (POST, mit Anmeldung der Person im Header Authorization):
//   { action: 'connect', platform: 'bluesky', handle, password }      App-Passwort aus BlueSky › Einstellungen
//   { action: 'connect', platform: 'mastodon', instance, token }      Zugangs-Token aus Mastodon › Entwicklung
//   { action: 'post', challengeId, platforms: ['bluesky', 'mastodon'] }
//   { action: 'delete', challengeId }                                Weiterposts dort wieder löschen
// Antworten: { handle } bei connect, { results: { bluesky: { url } | { error } } } bei post, sonst { error }.
//
// Gepostet werden nur eigene Posts, die eine öffentliche Seite bekommen dürfen (share_challenge, Migration
// 20261103000200_teilen). Der Weiterpost enthält Titel, Text, das Foto und den Link kiezcoins.de/c/<id>.
// Zugänge stehen in crosspost_accounts (Migration 20261105000100_weiterposten), lesbar nur mit dem Service-Schlüssel.
//
// SUPABASE_URL, SUPABASE_ANON_KEY und SUPABASE_SERVICE_ROLE_KEY stellt Supabase selbst bereit. Keine weiteren Secrets.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

type Platform = 'bluesky' | 'mastodon';
type Account = { platform: Platform; handle: string; instance: string; secret: string };
type Post = { id: string; title: string; body: string; link: string; image?: { bytes: Uint8Array; type: string } };

const BLUESKY = 'https://bsky.social';
/** BlueSky nimmt Bilder bis 1 MB, Texte bis 300 Zeichen. Mastodon Texte bis 500 Zeichen. */
const BLUESKY_IMAGE_MAX = 1_000_000;
const BLUESKY_TEXT_MAX = 300;
const MASTODON_TEXT_MAX = 500;

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
  if (post.image && post.image.bytes.length <= BLUESKY_IMAGE_MAX) {
    const upload = await fetch(`${account.instance}/xrpc/com.atproto.repo.uploadBlob`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': post.image.type },
      body: post.image.bytes,
    });
    if (upload.ok) {
      const { blob } = await upload.json();
      embed = { $type: 'app.bsky.embed.images', images: [{ alt: post.title, image: blob }] };
    }
  }
  // Foto zu groß oder Upload gescheitert: Linkkarte ohne Bild
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
  // Ein frisch hochgeladenes Foto ist manchmal noch in Arbeit (422). Dann kurz warten und noch einmal.
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${account.instance}/api/v1/statuses`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json', 'Idempotency-Key': post.id },
      body,
    });
    if (res.ok) return ((await res.json()) as { url: string }).url;
    if (res.status !== 422 || !mediaIds.length) throw new Error(`post ${res.status}`);
    await wait(2000);
  }
  throw new Error('media');
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

async function loadPost(admin: SupabaseClient, challengeId: string, platform: Platform): Promise<Post> {
  const { data: c, error } = await admin
    .from('challenges')
    .select('id, title, body, image_path, image_after_path, image_before_path')
    .eq('id', challengeId)
    .single();
  if (error || !c) throw new Error('challenge');
  const path = c.image_after_path ?? c.image_path ?? c.image_before_path;
  let image: Post['image'];
  if (path) {
    const { data } = await admin.storage.from('photos').download(path);
    if (data) image = { bytes: new Uint8Array(await data.arrayBuffer()), type: data.type || 'image/jpeg' };
  }
  return {
    id: c.id,
    title: (c.title ?? '').trim(),
    body: (c.body ?? '').trim(),
    link: `https://kiezcoins.de/c/${c.id}?von=${platform}`,
    image,
  };
}

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
    const platforms = (Array.isArray(input.platforms) ? input.platforms : []).filter(
      (p): p is Platform => p === 'bluesky' || p === 'mastodon',
    );
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
        const post = await loadPost(admin, challengeId, platform);
        const link = platform === 'bluesky' ? await postBluesky(account, post) : await postMastodon(account, post);
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
    // Weiterposts eines Posts dort wieder löschen. Nur die eigenen Zeilen; danach verschwindet die Zeile.
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
    const results: Record<string, { deleted?: boolean; error?: string }> = {};
    for (const { platform, url: link } of posts ?? []) {
      const account = (accounts ?? []).find((a) => a.platform === platform) as Account | undefined;
      if (!account || !link) {
        results[platform] = { error: 'not_connected' };
        continue;
      }
      try {
        if (platform === 'bluesky') await deleteBluesky(account, link);
        else await deleteMastodon(account, link);
        await admin.from('crosspost_posts').delete().eq('challenge_id', challengeId).eq('platform', platform);
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
