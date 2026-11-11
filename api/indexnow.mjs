// IndexNow (Daria, 2026-11-11: Suchmaschinen außer Google). Die App ruft POST /api/indexnow?slug=<kurzname> auf,
// wenn die Gründer:in ein öffentliches Schaufenster speichert (src/data/showcase.ts, notifySearchEngines).
// Die Funktion meldet https://kiezcoins.de/s/<kurzname> an api.indexnow.org. Von dort erfahren es Bing (und damit
// DuckDuckGo, Ecosia, Yahoo), Yandex, Seznam und Naver. Google nutzt IndexNow nicht und liest die Sitemap.
//
// Der Schlüssel ist öffentlich gedacht: Er liegt als website/<schlüssel>.txt auf kiezcoins.de, damit die Suchmaschinen
// prüfen können, dass die Meldung von dieser Website kommt. Gemeldet werden nur Schaufenster, die öffentlich und
// online sind, damit niemand über diese Funktion fremde Adressen meldet.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://aqxzxpxrshizlaqyjplw.supabase.co';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_WqrL7Y7Wm0l9cq4tHQpjAQ_iooAaNe0';
const HOST = 'kiezcoins.de';
const KEY = '9d531368796c971e61f2f569cef4e22b';
const SLUG = /^[a-z0-9][a-z0-9-]{2,39}$/;
const CORS = { 'Access-Control-Allow-Origin': '*' };

async function istOeffentlich(slug) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_showcase`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_slug: slug }),
  });
  return res.ok && (await res.json()) !== null;
}

export async function POST(request) {
  const slug = (new URL(request.url).searchParams.get('slug') ?? '').toLowerCase();
  if (!SLUG.test(slug) || !(await istOeffentlich(slug))) return new Response(null, { status: 404, headers: CORS });
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `https://${HOST}/${KEY}.txt`,
      urlList: [`https://${HOST}/s/${slug}`],
    }),
  });
  // 200 und 202 heißen angenommen; alles andere ist für die App egal, die Sitemap holt es später nach
  return new Response(null, { status: res.ok ? 204 : 502, headers: CORS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST' } });
}
