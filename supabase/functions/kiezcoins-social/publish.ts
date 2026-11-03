// Fällige Posts auf alle gewählten Kanäle bringen. Jeder Kanal läuft für sich: Scheitert einer, erscheinen die
// anderen trotzdem, und der nächste Lauf versucht nur den gescheiterten erneut (höchstens 3 Versuche).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { postToBluesky } from './bluesky.ts';
import { postToInstagram } from './instagram.ts';
import { postToX } from './x.ts';

export type Channel = 'kiezcoins' | 'x' | 'bluesky' | 'instagram';

export type SocialPost = {
  id: string;
  title: string;
  text: string;
  text_x: string | null;
  text_bluesky: string | null;
  image_path: string;
  image_alt: string;
  channels: Channel[];
  publish_at: string;
  results: Record<string, string>;
  errors: Record<string, string>;
  attempts: number;
  done_at: string | null;
};

/** Ein Bild-Beitrag bleibt so lange offen wie die längste Laufzeit in der App. */
const KIEZCOINS_DAYS = 30;

export const publicImageUrl = (path: string) =>
  `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/photos/${path.split('/').map(encodeURIComponent).join('/')}`;

export async function officialProfile(db: SupabaseClient): Promise<{ id: string; kiez: string | null }> {
  const { data, error } = await db.from('profiles').select('id, kiez').eq('is_official', true).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Kein offizielles Konto: profiles.is_official ist bei keinem Konto gesetzt');
  return data as { id: string; kiez: string | null };
}

async function postToKiezCoins(db: SupabaseClient, post: SocialPost): Promise<string> {
  const official = await officialProfile(db);
  const { data, error } = await db
    .from('challenges')
    .insert({
      author_id: official.id,
      type: 'photo',
      title: post.title.trim(),
      body: post.text,
      location: official.kiez ?? 'Leipzig',
      deadline: new Date(Date.now() + KIEZCOINS_DAYS * 86_400_000).toISOString(),
      image_path: post.image_path,
    })
    .select('id')
    .single();
  if (error) throw new Error(`KiezCoins: ${error.message}`);
  return data.id as string;
}

async function loadImage(db: SupabaseClient, path: string): Promise<Blob> {
  const { data, error } = await db.storage.from('photos').download(path);
  if (error || !data) throw new Error(`Bild nicht gefunden: ${path}`);
  return data;
}

/** Bringt einen Post auf alle noch offenen Kanäle und speichert Ergebnisse und Fehler. */
export async function publishPost(db: SupabaseClient, post: SocialPost): Promise<SocialPost> {
  const results = { ...post.results };
  const errors: Record<string, string> = {};
  let image: Blob | undefined;
  const getImage = async () => (image ??= await loadImage(db, post.image_path));

  for (const channel of post.channels) {
    if (results[channel]) continue;
    try {
      if (channel === 'kiezcoins') results.kiezcoins = await postToKiezCoins(db, post);
      if (channel === 'x') results.x = await postToX(post.text_x ?? post.text, await getImage());
      if (channel === 'bluesky') {
        results.bluesky = await postToBluesky(post.text_bluesky ?? post.text, await getImage(), post.image_alt);
      }
      if (channel === 'instagram') results.instagram = await postToInstagram(db, post.text, publicImageUrl(post.image_path));
    } catch (e) {
      errors[channel] = e instanceof Error ? e.message : String(e);
    }
  }

  const done = post.channels.every((c) => results[c]);
  const { data, error } = await db
    .from('social_posts')
    .update({ results, errors, done_at: done ? new Date().toISOString() : null, locked_until: null })
    .eq('id', post.id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as SocialPost;
}

/** Holt fällige Posts (oder genau einen) und veröffentlicht sie. */
export async function publishDue(db: SupabaseClient, id?: string): Promise<SocialPost[]> {
  const { data, error } = await db.rpc('claim_social_posts', { p_id: id ?? null });
  if (error) throw new Error(error.message);
  const done: SocialPost[] = [];
  for (const post of (data ?? []) as SocialPost[]) done.push(await publishPost(db, post));
  return done;
}
