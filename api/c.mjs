// Öffentliche Seite für einen geteilten Post: kiezcoins.de/c/<id> (Daria, 03.11.2026).
//
// vercel.json leitet /c/:id hierher. Die Funktion holt den Post über die Datenbankfunktion shared_post
// (Migration 20261103000200_teilen.sql) und füllt die Vorlage /teilen-vorlage (scripts/build-download-site.mjs).
// Die Vorschau-Tags (Open Graph) sorgen dafür, dass WhatsApp, Signal, Telegram, X, Bluesky und Mastodon den Link
// mit Foto zeigen. Vorschau-Abrufe dieser Dienste zählen nicht als Besuch.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://aqxzxpxrshizlaqyjplw.supabase.co';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_WqrL7Y7Wm0l9cq4tHQpjAQ_iooAaNe0';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VORSCHAU =
  /bot|crawl|spider|facebookexternalhit|whatsapp|telegram|signal|slack|discord|mastodon|bluesky|cardyb|skype|preview|embed/i;

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const foto = (path) =>
  path ? `${SUPABASE_URL}/storage/v1/object/public/photos/${path.split('/').map(encodeURIComponent).join('/')}` : null;

const kurz = (text, max) => {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
};

async function ladePost(id, zaehlen) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/shared_post`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_challenge_id: id, p_count: zaehlen }),
  });
  if (!res.ok) return null;
  return res.json();
}

function kopf(post, url) {
  if (!post) return '<title>Post nicht gefunden – KiezCoins</title>';
  const titel = `${post.title} – KiezCoins`;
  const beschreibung = kurz(post.body, 200) || 'Ein Post aus KiezCoins, der App für Deinen Kiez.';
  const bild = foto(post.image_after_path) ?? foto(post.image_path) ?? foto(post.image_before_path);
  return [
    `<title>${esc(titel)}</title>`,
    `<meta name="description" content="${esc(beschreibung)}">`,
    '<meta property="og:site_name" content="KiezCoins">',
    '<meta property="og:type" content="article">',
    '<meta property="og:locale" content="de_DE">',
    `<meta property="og:title" content="${esc(titel)}">`,
    `<meta property="og:description" content="${esc(beschreibung)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    bild ? `<meta property="og:image" content="${esc(bild)}">` : '',
    bild ? `<meta property="og:image:alt" content="${esc(post.title)}">` : '',
    `<meta name="twitter:card" content="${bild ? 'summary_large_image' : 'summary'}">`,
  ]
    .filter(Boolean)
    .join('\n');
}

function inhalt(post) {
  if (!post) {
    return `  <h1>Dieser Post ist nicht mehr öffentlich.</h1>
  <p class="text">Die Person hat ihn gelöscht oder auf privat gestellt.</p>`;
  }
  const vorher = post.type === 'before_after' ? foto(post.image_before_path) : null;
  const nachher = post.type === 'before_after' ? foto(post.image_after_path) : null;
  const fotos =
    vorher && nachher
      ? `<div class="fotos zwei"><figure><img src="${esc(vorher)}" alt="Vorher"><figcaption>Vorher</figcaption></figure>` +
        `<figure><img src="${esc(nachher)}" alt="Nachher"><figcaption>Nachher</figcaption></figure></div>`
      : (() => {
          const bild = nachher ?? vorher ?? foto(post.image_path);
          return bild ? `<div class="fotos"><img src="${esc(bild)}" alt="${esc(post.title)}"></div>` : '';
        })();
  const wer = [post.handle, post.kiez].filter(Boolean).map(esc).join(' · ');
  return `  ${fotos}
  ${wer ? `<p class="wer">${wer}</p>` : ''}
  <h1>${esc(post.title)}</h1>
  ${post.body ? `<p class="text">${esc(post.body)}</p>` : ''}
  <p><a class="button" href="/app/challenge/${esc(post.id)}?von=teilen">Post in KiezCoins öffnen</a></p>`;
}

export async function GET(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? '';
  const vorschau = VORSCHAU.test(request.headers.get('user-agent') ?? '');
  const post = UUID.test(id) ? await ladePost(id, !vorschau) : null;

  const vorlage = await fetch(new URL('/teilen-vorlage', url.origin));
  if (!vorlage.ok) return new Response('Vorlage fehlt', { status: 500 });
  const seite = (await vorlage.text())
    .replace('<!--KOPF-->', () => kopf(post, `${url.origin}/c/${id}`))
    .replace('<!--POST-->', () => inhalt(post));

  return new Response(seite, {
    status: post ? 200 : 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Nicht zwischenspeichern: So zählt jeder Besuch, und ein Post, der privat wird, verschwindet sofort.
      'Cache-Control': 'no-store',
    },
  });
}
