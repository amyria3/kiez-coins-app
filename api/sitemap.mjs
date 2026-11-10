// kiezcoins.de/sitemap.xml: alle öffentlichen Schaufenster (/s/<kurzname>) für Suchmaschinen (Daria, 2026-11-10).
// vercel.json leitet /sitemap.xml hierher. Die Liste kommt aus der Datenbankfunktion public_showcase_slugs
// (Migration 20261110001900_schaufenster_sitemap.sql). Fehlt die Funktion noch, bleibt die Sitemap leer statt kaputt.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://aqxzxpxrshizlaqyjplw.supabase.co';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_WqrL7Y7Wm0l9cq4tHQpjAQ_iooAaNe0';
const SITE = 'https://kiezcoins.de';
const SLUG = /^[a-z0-9][a-z0-9-]{2,39}$/;

async function ladeSlugs() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_showcase_slugs`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows.filter((r) => SLUG.test(r?.slug ?? '')) : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const eintraege = (await ladeSlugs())
    .map((r) => {
      const lastmod = r.lastmod ? `<lastmod>${new Date(r.lastmod).toISOString()}</lastmod>` : '';
      return `  <url><loc>${SITE}/s/${r.slug}</loc>${lastmod}</url>`;
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${eintraege}
</urlset>
`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' },
  });
}
