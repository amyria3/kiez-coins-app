// X: Bild hochladen und Post anlegen, mit OAuth 1.0a im Namen des eigenen Kontos.
//
// Secrets: X_API_KEY, X_API_SECRET (Consumer Keys der App), X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET (eigenes Konto).
// Kosten (Stand 11/2026): 0,015 $ pro Post, 0,20 $ mit Link.

const API = 'https://api.x.com/2';

const enc = (s: string) =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Secret ${name} fehlt`);
  return value;
}

/** Authorization-Header für OAuth 1.0a. Bei JSON und multipart fließt der Body nicht in die Signatur ein. */
async function oauthHeader(method: string, url: string): Promise<string> {
  const params: Record<string, string> = {
    oauth_consumer_key: env('X_API_KEY'),
    oauth_nonce: crypto.randomUUID().replaceAll('-', ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: env('X_ACCESS_TOKEN'),
    oauth_version: '1.0',
  };
  const u = new URL(url);
  const all: [string, string][] = [...Object.entries(params), ...u.searchParams.entries()];
  const paramString = all
    .map(([k, v]) => [enc(k), enc(v)])
    .sort(([a, x], [b, y]) => (a === b ? (x < y ? -1 : 1) : a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const base = [method.toUpperCase(), enc(u.origin + u.pathname), enc(paramString)].join('&');
  const signingKey = `${enc(env('X_API_SECRET'))}&${enc(env('X_ACCESS_TOKEN_SECRET'))}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(base)));
  params.oauth_signature = btoa(String.fromCharCode(...sig));
  return 'OAuth ' + Object.entries(params).map(([k, v]) => `${enc(k)}="${enc(v)}"`).join(', ');
}

async function call(url: string, init: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: await oauthHeader(init.method ?? 'GET', url) },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`X ${res.status}: ${body.slice(0, 300)}`);
  return JSON.parse(body);
}

/** Postet Text mit einem Bild. Gibt die id des Posts zurück. */
export async function postToX(text: string, image: Blob): Promise<string> {
  const form = new FormData();
  form.append('media', image, 'bild.jpg');
  form.append('media_category', 'tweet_image');
  const media = await call(`${API}/media/upload`, { method: 'POST', body: form });
  const mediaId = (media.data as { id?: string } | undefined)?.id ?? (media as { media_id_string?: string }).media_id_string;
  if (!mediaId) throw new Error('X: keine Media-ID erhalten');

  const tweet = await call(`${API}/tweets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, media: { media_ids: [mediaId] } }),
  });
  const id = (tweet.data as { id?: string } | undefined)?.id;
  if (!id) throw new Error('X: keine Post-ID erhalten');
  return id;
}
