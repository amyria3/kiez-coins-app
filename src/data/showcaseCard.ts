import { supabase } from '../lib/supabase';
import { showcasePublicLink, type Showcase } from './showcase';

/**
 * Visitenkarte und Zahlen des Schaufensters in der App (2026-11-23): Vorschaubild, Zählen, Zusammenfassung fürs Team
 * und „Kontakt schicken“ für Mitglieder. Die Tabelle und die Funktionen stehen in der Migration
 * 20261123000100_schaufenster_zahlen.
 */

/**
 * Vorschaubild der digitalen Visitenkarte: dasselbe Bild, das Messenger beim geteilten Link zeigen
 * (kiezcoins.de/s/<kurzname>/visitenkarte.png, api/_visitenkarte-bild.mjs). Es ist die einzige Vorschau der Karte in
 * App und Web. `v` ändert sich mit den Angaben auf der Karte, damit nach dem Bearbeiten kein altes Bild bleibt.
 */
export function cardPreviewUri(s: Showcase): string {
  const v = [s.name, s.kiez, s.address, s.services, s.openingHours, s.email, s.links.join(' '), JSON.stringify(s.logo ?? null)].join('|');
  let hash = 0;
  for (let i = 0; i < v.length; i++) hash = (hash * 31 + v.charCodeAt(i)) | 0;
  return `${showcasePublicLink(s.slug)}/visitenkarte.png?v=${(hash >>> 0).toString(36)}`;
}

/** Breite zu Höhe des Vorschaubilds (BILD_B × BILD_H in api/_visitenkarte-bild.mjs) */
export const CARD_PREVIEW_RATIO = 1200 / 630;

export type VisitKind = 'page' | 'card' | 'save' | 'contact';

/**
 * Zählt einen Aufruf als Zahl pro Tag, ohne Kennung (count_showcase_visit). Das Team zählt bei sich nicht mit, das
 * prüft die Datenbank. Fehler sind egal: Ohne die Migration oder ohne Netz fehlt nur eine Zahl.
 */
export function countShowcaseVisit(slug: string, kind: VisitKind): void {
  supabase.rpc('count_showcase_visit', { p_slug: slug, p_kind: kind }).then(
    () => undefined,
    () => undefined,
  );
}

export type ShowcaseSummary = {
  posts: number;
  lastPostAt?: string;
  /** Zahlen der letzten 30 Tage; fehlt, solange die Migration 20261123000100 nicht gelaufen ist */
  stats?: {
    followers: number;
    newFollowers: number;
    pageViews: number;
    cardViews: number;
    contactSaves: number;
    contactsReceived: number;
  };
};

type SummaryRow = {
  posts: number;
  last_post_at: string | null;
  followers: number;
  new_followers: number;
  page_views: number;
  card_views: number;
  contact_saves: number;
  contacts_received: number;
};

/**
 * Zusammenfassung oben in der Verwaltung (showcase_summary, nur fürs Team). Fehlt die Funktion noch, zählt die App
 * wenigstens die Posts selbst; die übrigen Zeilen bleiben dann weg. null: nichts zu laden (z. B. ohne Netz).
 */
export async function loadShowcaseSummary(showcaseId: string): Promise<ShowcaseSummary | null> {
  const { data, error } = await supabase.rpc('showcase_summary', { p_showcase: showcaseId });
  if (!error && data) {
    const r = data as SummaryRow;
    return {
      posts: Number(r.posts) || 0,
      lastPostAt: r.last_post_at ?? undefined,
      stats: {
        followers: Number(r.followers) || 0,
        newFollowers: Number(r.new_followers) || 0,
        pageViews: Number(r.page_views) || 0,
        cardViews: Number(r.card_views) || 0,
        contactSaves: Number(r.contact_saves) || 0,
        contactsReceived: Number(r.contacts_received) || 0,
      },
    };
  }
  const { data: rows, count, error: postsError } = await supabase
    .from('challenges')
    .select('created_at', { count: 'exact' })
    .eq('showcase_id', showcaseId)
    .not('status', 'in', '(draft,deleted)')
    .order('created_at', { ascending: false })
    .limit(1);
  if (postsError) return null;
  return { posts: count ?? rows?.length ?? 0, lastPostAt: (rows?.[0] as { created_at?: string } | undefined)?.created_at };
}

export type ContactResult = 'ok' | 'card_failed' | 'email' | 'name' | 'consent' | 'limit' | 'no_contact' | 'error';

/**
 * „Deinen Kontakt schicken“ und „Kontakte tauschen“ aus der App (2026-11-23), dieselbe Edge Function wie das Formular
 * der Web-Visitenkarte (`visitenkarte-mail`, art 'kontakt'). Das Schaufenster bekommt Name, Mail und auf Wunsch Ort
 * und Nachricht per Mail; mit `sendCard` geht die Visitenkarte an die Person. KiezCoins speichert nichts.
 * Nach Erfolg zählt der Kontakt in der Zusammenfassung des Teams.
 */
export async function sendContactToShowcase(
  slug: string,
  input: { name: string; email: string; place?: string; message?: string; sendCard: boolean },
): Promise<ContactResult> {
  try {
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; karte?: boolean; error?: string }>('visitenkarte-mail', {
      body: {
        slug,
        art: 'kontakt',
        name: input.name.trim(),
        email: input.email.trim(),
        phone: '',
        ort: input.place?.trim() ?? '',
        nachricht: input.message?.trim() ?? '',
        karte: input.sendCard,
        einwilligung: true,
        website: '',
      },
    });
    const body = data ?? (await (error as { context?: Response } | null)?.context?.json?.().catch(() => null));
    if (body?.ok) {
      countShowcaseVisit(slug, 'contact');
      return body.karte === false ? 'card_failed' : 'ok';
    }
    const code = body?.error;
    return code === 'email' || code === 'name' || code === 'consent' || code === 'limit' || code === 'no_contact' ? code : 'error';
  } catch {
    return 'error';
  }
}
