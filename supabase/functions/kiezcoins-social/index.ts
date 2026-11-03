// KiezCoins-Connector (Daria, 03.11.2026): Ein Post erscheint auf KiezCoins, X, Bluesky und Instagram.
//
// Die Funktion ist ein MCP-Server für Claude. Beide Claude-Accounts fügen dieselbe URL als eigenen Connector hinzu:
//   https://<projekt>.supabase.co/functions/v1/kiezcoins-social/mcp/<SOCIAL_MCP_KEY>
// Werkzeuge: post, list_posts, cancel_post.
//
// Ein Cron-Job ruft alle 5 Minuten POST …/kiezcoins-social/publish mit dem Header x-cron-key auf und
// veröffentlicht fällige Posts (Migration 20261103000100_offizielle_posts.sql).
//
// Deploy ohne JWT-Prüfung, da claude.ai ohne Supabase-Login aufruft:
//   supabase functions deploy kiezcoins-social --no-verify-jwt
//
// Secrets (Supabase › Edge Functions › Secrets):
//   SOCIAL_MCP_KEY       zufälliger Schlüssel im Pfad der Connector-URL
//   SOCIAL_CRON_KEY      zufälliger Schlüssel für den Cron-Job (derselbe Wert im Vault)
//   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
//   BLUESKY_HANDLE, BLUESKY_APP_PASSWORD
//   IG_ACCESS_TOKEN
// SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase selbst bereit.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { BLUESKY_MAX_IMAGE_BYTES } from './bluesky.ts';
import { type Channel, officialProfile, publishDue, type SocialPost } from './publish.ts';

const ALL_CHANNELS: Channel[] = ['kiezcoins', 'x', 'bluesky', 'instagram'];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

const db = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

function sameKey(given: string, expected: string | undefined): boolean {
  if (!expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// ---------- Prüfen ----------

/** X zählt jeden Link als 23 Zeichen. */
const xLength = (text: string) => [...text.replace(/https?:\/\/\S+/g, 'x'.repeat(23))].length;
const graphemes = (text: string) => [...new Intl.Segmenter('de', { granularity: 'grapheme' }).segment(text)].length;

type PostInput = {
  title?: string;
  text?: string;
  text_x?: string;
  text_bluesky?: string;
  image_url?: string;
  image_base64?: string;
  image_alt?: string;
  publish_at?: string;
  channels?: Channel[];
};

function check(input: PostInput, channels: Channel[]): string[] {
  const problems: string[] = [];
  const title = input.title?.trim() ?? '';
  const text = input.text ?? '';
  if (title.length < 1 || title.length > 60) problems.push('title: 1 bis 60 Zeichen');
  if (!text.trim()) problems.push('text fehlt');
  if (channels.includes('kiezcoins') && text.length > 500) problems.push(`text: höchstens 500 Zeichen für KiezCoins (jetzt ${text.length})`);
  if (channels.includes('instagram') && text.length > 2200) problems.push('text: höchstens 2200 Zeichen für Instagram');
  const tx = input.text_x ?? text;
  if (channels.includes('x') && xLength(tx) > 280) {
    problems.push(`X: höchstens 280 Zeichen (jetzt ${xLength(tx)}); text_x mit kürzerer Fassung mitschicken`);
  }
  const tb = input.text_bluesky ?? text;
  if (channels.includes('bluesky') && graphemes(tb) > 300) {
    problems.push(`Bluesky: höchstens 300 Zeichen (jetzt ${graphemes(tb)}); text_bluesky mit kürzerer Fassung mitschicken`);
  }
  if (!input.image_url && !input.image_base64) problems.push('Bild fehlt: image_url oder image_base64 (JPEG)');
  if (input.publish_at && Number.isNaN(Date.parse(input.publish_at))) problems.push('publish_at: kein gültiges Datum (ISO 8601)');
  return problems;
}

async function readImage(input: PostInput): Promise<Uint8Array> {
  if (input.image_base64) {
    const raw = input.image_base64.replace(/^data:[^,]+,/, '');
    return Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  }
  const res = await fetch(input.image_url!);
  if (!res.ok) throw new Error(`Bild nicht abrufbar (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

// ---------- Werkzeuge ----------

async function toolPost(client: SupabaseClient, input: PostInput) {
  const channels = (input.channels?.length ? input.channels : ALL_CHANNELS).filter((c) => ALL_CHANNELS.includes(c));
  const problems = check(input, channels);
  if (problems.length) throw new Error(problems.join('\n'));

  const bytes = await readImage(input);
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!isJpeg) throw new Error('Bild muss ein JPEG sein (Instagram nimmt nur JPEG)');
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error('Bild ist größer als 8 MB');
  if (channels.includes('bluesky') && bytes.length > BLUESKY_MAX_IMAGE_BYTES) {
    throw new Error(`Bild ist ${Math.round(bytes.length / 1024)} KB groß; Bluesky nimmt höchstens 950 KB`);
  }

  const official = await officialProfile(client);
  const path = `${official.id}/social/${crypto.randomUUID()}.jpg`;
  const up = await client.storage.from('photos').upload(path, bytes, { contentType: 'image/jpeg' });
  if (up.error) throw new Error(`Upload: ${up.error.message}`);

  const publishAt = input.publish_at ? new Date(input.publish_at).toISOString() : new Date().toISOString();
  const { data, error } = await client
    .from('social_posts')
    .insert({
      title: input.title!.trim(),
      text: input.text,
      text_x: input.text_x ?? null,
      text_bluesky: input.text_bluesky ?? null,
      image_path: path,
      image_alt: input.image_alt ?? '',
      channels,
      publish_at: publishAt,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  const post = data as SocialPost;
  if (Date.parse(publishAt) <= Date.now()) {
    const [published] = await publishDue(client, post.id);
    return describe(published ?? post);
  }
  return describe(post);
}

function describe(p: SocialPost) {
  const state = p.done_at
    ? 'veröffentlicht'
    : Object.keys(p.errors ?? {}).length
      ? p.attempts >= 3 ? 'gescheitert' : 'teilweise, nächster Versuch beim nächsten Lauf'
      : Date.parse(p.publish_at) > Date.now() ? 'geplant' : 'wartet auf den nächsten Lauf';
  return {
    id: p.id,
    title: p.title,
    publish_at: p.publish_at,
    channels: p.channels,
    state,
    results: p.results,
    errors: p.errors,
  };
}

async function toolList(client: SupabaseClient) {
  const open = await client.from('social_posts').select('*').is('done_at', null).order('publish_at').limit(30);
  const done = await client.from('social_posts').select('*').not('done_at', 'is', null)
    .order('done_at', { ascending: false }).limit(10);
  if (open.error || done.error) throw new Error((open.error ?? done.error)!.message);
  return {
    offen: (open.data as SocialPost[]).map(describe),
    zuletzt_veroeffentlicht: (done.data as SocialPost[]).map(describe),
  };
}

async function toolCancel(client: SupabaseClient, id: string) {
  const { data, error } = await client.from('social_posts').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Post nicht gefunden');
  const post = data as SocialPost;
  if (Object.keys(post.results ?? {}).length) throw new Error('Post ist schon auf mindestens einem Kanal erschienen');
  await client.from('social_posts').delete().eq('id', id);
  await client.storage.from('photos').remove([post.image_path]);
  return { geloescht: id };
}

const channelsSchema = {
  type: 'array',
  items: { type: 'string', enum: ALL_CHANNELS },
  description: 'Kanäle; ohne Angabe alle vier',
};

const TOOLS = [
  {
    name: 'post',
    description:
      'Veröffentlicht einen Post mit Bild auf KiezCoins (als offizielles Konto), X, Bluesky und Instagram. ' +
      'Ohne publish_at sofort, sonst zur geplanten Zeit (Cron alle 5 Minuten). Vorher Daria Text und Bild zeigen ' +
      'und auf ihre Freigabe warten.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titel auf KiezCoins, 1 bis 60 Zeichen' },
        text: { type: 'string', description: 'Text für alle Kanäle; höchstens 500 Zeichen, wenn KiezCoins dabei ist' },
        text_x: { type: 'string', description: 'Kürzere Fassung für X, höchstens 280 Zeichen (Links zählen 23)' },
        text_bluesky: { type: 'string', description: 'Kürzere Fassung für Bluesky, höchstens 300 Zeichen' },
        image_url: { type: 'string', description: 'Öffentliche URL eines JPEG' },
        image_base64: { type: 'string', description: 'JPEG als Base64, alternativ zu image_url; höchstens 950 KB' },
        image_alt: { type: 'string', description: 'Bildbeschreibung für Bluesky' },
        publish_at: { type: 'string', description: 'Zeitpunkt ISO 8601 mit Zeitzone, z. B. 2026-11-04T18:00:00+01:00' },
        channels: channelsSchema,
      },
      required: ['title', 'text'],
    },
  },
  {
    name: 'list_posts',
    description: 'Zeigt geplante und zuletzt veröffentlichte Posts mit Status und Fehlern je Kanal.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'cancel_post',
    description: 'Löscht einen geplanten Post, solange er auf keinem Kanal erschienen ist.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
];

const INSTRUCTIONS =
  'KiezCoins-Connector von Daria. Ein Aufruf von post bringt einen Post mit Bild auf KiezCoins, X, Bluesky ' +
  'und Instagram. Grenzen: Titel 60 Zeichen, Text 500 (KiezCoins), X 280, Bluesky 300; Bild JPEG bis 950 KB. ' +
  'Claude veröffentlicht nur nach Darias Freigabe im Chat.';

// ---------- MCP ----------

async function handleMcp(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  let msg: { jsonrpc?: string; id?: string | number; method?: string; params?: Record<string, unknown> };
  try {
    msg = await req.json();
  } catch {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400);
  }
  if (msg.id === undefined || msg.id === null) return new Response(null, { status: 202 });

  const reply = (result: unknown) => json({ jsonrpc: '2.0', id: msg.id, result });
  switch (msg.method) {
    case 'initialize': {
      const asked = msg.params?.protocolVersion as string | undefined;
      return reply({
        protocolVersion: asked && PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[1],
        capabilities: { tools: {} },
        serverInfo: { name: 'kiezcoins-social', version: '1.0.0' },
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: TOOLS });
    case 'tools/call': {
      const name = msg.params?.name as string;
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const client = db();
        const result =
          name === 'post' ? await toolPost(client, args as PostInput)
          : name === 'list_posts' ? await toolList(client)
          : name === 'cancel_post' ? await toolCancel(client, String(args.id ?? ''))
          : (() => { throw new Error(`Unbekanntes Werkzeug: ${name}`); })();
        return reply({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
      } catch (e) {
        return reply({ content: [{ type: 'text', text: e instanceof Error ? e.message : String(e) }], isError: true });
      }
    }
    default:
      return json({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Method not found' } });
  }
}

// ---------- Eingang ----------

Deno.serve(async (req) => {
  const path = new URL(req.url).pathname;

  const mcp = path.match(/\/kiezcoins-social\/mcp\/([^/]+)\/?$/);
  if (mcp) {
    if (!sameKey(decodeURIComponent(mcp[1]), Deno.env.get('SOCIAL_MCP_KEY'))) return new Response('Not found', { status: 404 });
    return handleMcp(req);
  }

  if (/\/kiezcoins-social\/publish\/?$/.test(path) && req.method === 'POST') {
    if (!sameKey(req.headers.get('x-cron-key') ?? '', Deno.env.get('SOCIAL_CRON_KEY'))) {
      return new Response('Not found', { status: 404 });
    }
    try {
      const posts = await publishDue(db());
      return json({ verarbeitet: posts.length });
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
  }

  return new Response('Not found', { status: 404 });
});
