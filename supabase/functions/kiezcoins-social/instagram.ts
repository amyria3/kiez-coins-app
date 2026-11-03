// Instagram: Post mit Bild über die Instagram API mit Instagram-Login. Kostenlos.
//
// Voraussetzungen: Instagram-Business- oder Creator-Konto, Meta-App im Entwicklungsmodus mit diesem Konto als
// Tester und der Berechtigung instagram_business_content_publish.
// Secret: IG_ACCESS_TOKEN (langlebiger Token, 60 Tage). Die Funktion legt ihn beim ersten Lauf in
// public.social_tokens ab und erneuert ihn dort alle 30 Tage selbst.
// Instagram lädt das Bild selbst über eine öffentliche URL und nimmt nur JPEG.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const GRAPH = 'https://graph.instagram.com/v23.0';
const REFRESH_AFTER_DAYS = 30;

async function graph(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(`${GRAPH}/${path}`, init);
  const body = await res.text();
  if (!res.ok) throw new Error(`Instagram ${res.status}: ${body.slice(0, 300)}`);
  return JSON.parse(body);
}

/** Aktuellen Token holen und bei Bedarf erneuern. */
async function token(db: SupabaseClient): Promise<string> {
  const { data } = await db.from('social_tokens').select('token, refreshed_at').eq('name', 'instagram').maybeSingle();
  let current = data?.token as string | undefined;
  const refreshedAt = data?.refreshed_at ? new Date(data.refreshed_at as string) : undefined;
  if (!current) {
    current = Deno.env.get('IG_ACCESS_TOKEN');
    if (!current) throw new Error('Secret IG_ACCESS_TOKEN fehlt');
    await db.from('social_tokens').upsert({ name: 'instagram', token: current, refreshed_at: new Date().toISOString() });
    return current;
  }
  const ageDays = refreshedAt ? (Date.now() - refreshedAt.getTime()) / 86_400_000 : Infinity;
  if (ageDays >= REFRESH_AFTER_DAYS) {
    const fresh = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(current)}`,
    );
    if (fresh.ok) {
      const json = await fresh.json();
      if (json.access_token) {
        current = json.access_token as string;
        await db.from('social_tokens').upsert({ name: 'instagram', token: current, refreshed_at: new Date().toISOString() });
      }
    }
  }
  return current;
}

/** Postet ein Bild mit Bildunterschrift. Gibt die id des Posts zurück. */
export async function postToInstagram(db: SupabaseClient, caption: string, imageUrl: string): Promise<string> {
  const accessToken = await token(db);
  const q = (params: Record<string, string>) => new URLSearchParams({ ...params, access_token: accessToken });

  const me = await graph(`me?${q({ fields: 'user_id,username' })}`);
  const userId = (me.user_id ?? me.id) as string;

  const container = await graph(`${userId}/media`, { method: 'POST', body: q({ image_url: imageUrl, caption }) });
  const creationId = container.id as string;

  // Instagram verarbeitet das Bild meist sofort; sonst kurz warten.
  for (let i = 0; i < 10; i++) {
    const status = await graph(`${creationId}?${q({ fields: 'status_code' })}`);
    if (status.status_code === 'FINISHED') break;
    if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
      throw new Error(`Instagram: Bild nicht verarbeitet (${status.status_code})`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  const published = await graph(`${userId}/media_publish`, { method: 'POST', body: q({ creation_id: creationId }) });
  return published.id as string;
}
