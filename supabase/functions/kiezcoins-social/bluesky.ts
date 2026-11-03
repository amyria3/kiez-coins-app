// Bluesky: Post mit Bild über das AT Protocol. Kostenlos.
//
// Secrets: BLUESKY_HANDLE (z. B. kiezkatz.bsky.social), BLUESKY_APP_PASSWORD (Einstellungen › App-Passwörter).

const PDS = 'https://bsky.social/xrpc';
/** Bluesky nimmt Bilder bis knapp 1 MB. */
export const BLUESKY_MAX_IMAGE_BYTES = 976_560;

type Facet = {
  index: { byteStart: number; byteEnd: number };
  features: Record<string, string>[];
};

/** Links und Hashtags klickbar machen. Bluesky zählt Positionen in UTF-8-Bytes. */
export function facets(text: string): Facet[] {
  const bytes = (s: string) => new TextEncoder().encode(s).length;
  const result: Facet[] = [];
  for (const m of text.matchAll(/https?:\/\/[^\s)]+[^\s).,;:!?]/g)) {
    const start = bytes(text.slice(0, m.index));
    result.push({
      index: { byteStart: start, byteEnd: start + bytes(m[0]) },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: m[0] }],
    });
  }
  for (const m of text.matchAll(/(^|\s)#([\p{L}\p{N}_]+)/gu)) {
    const start = bytes(text.slice(0, m.index! + m[1].length));
    result.push({
      index: { byteStart: start, byteEnd: start + bytes('#' + m[2]) },
      features: [{ $type: 'app.bsky.richtext.facet#tag', tag: m[2] }],
    });
  }
  return result;
}

async function xrpc(method: string, init: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(`${PDS}/${method}`, init);
  const body = await res.text();
  if (!res.ok) throw new Error(`Bluesky ${res.status}: ${body.slice(0, 300)}`);
  return JSON.parse(body);
}

/** Postet Text mit einem Bild. Gibt die at-URI des Posts zurück. */
export async function postToBluesky(text: string, image: Blob, alt: string): Promise<string> {
  const identifier = Deno.env.get('BLUESKY_HANDLE');
  const password = Deno.env.get('BLUESKY_APP_PASSWORD');
  if (!identifier || !password) throw new Error('Secrets BLUESKY_HANDLE oder BLUESKY_APP_PASSWORD fehlen');
  if (image.size > BLUESKY_MAX_IMAGE_BYTES) throw new Error('Bluesky: Bild ist größer als 1 MB');

  const session = await xrpc('com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const auth = { Authorization: `Bearer ${session.accessJwt}` };

  const upload = await xrpc('com.atproto.repo.uploadBlob', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': image.type || 'image/jpeg' },
    body: image,
  });

  const record = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString(),
    langs: ['de'],
    facets: facets(text),
    embed: { $type: 'app.bsky.embed.images', images: [{ alt, image: upload.blob }] },
  };
  const created = await xrpc('com.atproto.repo.createRecord', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo: session.did, collection: 'app.bsky.feed.post', record }),
  });
  return created.uri as string;
}
