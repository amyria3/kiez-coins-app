// Visitenkarte per Mail (Daria, 2026-11-17: „möchte ich es auch per Mail senden können (aus dem public interface),
// das wäre ne Mail von KiezCoins mit dem Link und der Visitenkarte (nicht als pdf als Code)“).
//
// Die öffentliche Seite kiezcoins.de/s/<kurzname> (api/s.mjs) ruft die Funktion ohne Anmeldung auf. Sie holt das
// Schaufenster über public_showcase, also nur Schaufenster mit Sichtbarkeit „Alle“, die online sind, und schickt die
// Karte als HTML-Mail (mail.ts) über Brevo.
//
// Schutz vor Missbrauch: kein Freitext, nur ein optionaler Vorname. Höchstens 5 Mails je Gerät und Stunde,
// 20 je Gerät und Tag, 2 je Empfängeradresse und Tag, 50 je Schaufenster und Tag. Gerät und Empfängeradresse stehen
// nur als Prüfsumme in showcase_card_mails (Migration 20261117000500); Zeilen älter als 30 Tage löscht die Funktion.
// Gegen Massenversand über viele Geräte (Daria, 2026-11-18): höchstens 30 Mails je Stunde und 120 je Tag über alle
// Schaufenster zusammen. Brevo erlaubt im Gratis-Tarif 300 Mails am Tag, und die Anmelde-Codes (konto-ohne-mail)
// laufen über dasselbe Konto; sie sollen nie wegen Visitenkarten ausfallen.
// Ein verstecktes Feld „website“ fängt einfache Bots ab.
//
// Anfrage: POST { slug, to, from?, website? }  Antwort: { ok: true } oder { error }
// Fehler: input, email, name, not_found, limit, mail
//
// Secrets (Supabase › Edge Functions › Secrets): BREVO_API_KEY wie bei konto-ohne-mail.
// SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase selbst bereit.
import { createClient } from 'npm:@supabase/supabase-js@2';
import QRCode from 'npm:qrcode@1.5.4';

import { cardMail, cleanSenderName, isEmail, type CardMailData, type QrMatrix } from './mail.ts';

const SITE = 'https://kiezcoins.de';
// Dieselbe bei Brevo bestätigte Absenderadresse wie bei konto-ohne-mail
const SENDER = { name: 'KiezKoins', email: 'registration.noreply@kiezcoins.de' };
const LIMITS = { deviceHour: 5, deviceDay: 20, recipientDay: 2, showcaseDay: 50, allHour: 30, allDay: 120 };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

/** SHA-256 mit geheimem Zusatz: Gerät und Adresse lassen sich vergleichen, aber nicht zurückrechnen */
async function hash(kind: string, value: string): Promise<string> {
  const pepper = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${pepper}:${kind}:${value}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const foto = (url: string, path?: string | null) =>
  path && !(path.split('/')[1] ?? '').startsWith('p_')
    ? `${url}/storage/v1/object/public/photos/${path.split('/').map(encodeURIComponent).join('/')}`
    : undefined;

function qrMatrix(value: string): QrMatrix {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  // Die Ruhezone gibt die Mail selbst: 8 px weißer Rand um den Code, also zwei Module
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => !!qr.modules.get(r, c)));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'method' }, 405);

  let input: { slug?: unknown; to?: unknown; from?: unknown; website?: unknown };
  try {
    input = await req.json();
  } catch {
    return reply({ error: 'input' }, 400);
  }
  // Verstecktes Feld ausgefüllt: so tun, als wäre die Mail raus
  if (typeof input.website === 'string' && input.website) return reply({ ok: true });
  const slug = typeof input.slug === 'string' ? input.slug.trim().toLowerCase() : '';
  const to = typeof input.to === 'string' ? input.to.trim() : '';
  const sender = cleanSenderName(input.from);
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug)) return reply({ error: 'input' }, 400);
  if (!isEmail(to)) return reply({ error: 'email' }, 400);
  if (sender === null) return reply({ error: 'name' }, 400);

  const url = Deno.env.get('SUPABASE_URL')!;
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: s } = await db.rpc('public_showcase', { p_slug: slug });
  if (!s) return reply({ error: 'not_found' }, 404);

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unbekannt';
  const device = await hash('geraet', ip);
  const recipient = await hash('empfaenger', to.toLowerCase());
  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const dayAgo = new Date(Date.now() - 86400e3).toISOString();
  // Ohne Spalte zählt die Abfrage alle Mails (Grenze über alle Schaufenster)
  const count = async (column: string | null, value: string, since: string) => {
    let q = db.from('showcase_card_mails').select('id', { count: 'exact', head: true }).gte('created_at', since);
    if (column) q = q.eq(column, value);
    const { count: n } = await q;
    return n ?? 0;
  };
  const [deviceHour, deviceDay, recipientDay, showcaseDay, allHour, allDay] = await Promise.all([
    count('device_hash', device, hourAgo),
    count('device_hash', device, dayAgo),
    count('recipient_hash', recipient, dayAgo),
    count('showcase_id', s.id, dayAgo),
    count(null, '', hourAgo),
    count(null, '', dayAgo),
  ]);
  if (allHour >= LIMITS.allHour || allDay >= LIMITS.allDay) {
    // Auffällig viele Mails insgesamt: im Log der Funktion sichtbar (Supabase › Edge Functions › Logs)
    console.warn(`visitenkarte-mail: Grenze für alle erreicht (Stunde ${allHour}, Tag ${allDay})`);
    return reply({ error: 'limit' }, 429);
  }
  if (
    deviceHour >= LIMITS.deviceHour ||
    deviceDay >= LIMITS.deviceDay ||
    recipientDay >= LIMITS.recipientDay ||
    showcaseDay >= LIMITS.showcaseDay
  ) {
    return reply({ error: 'limit' }, 429);
  }

  const key = Deno.env.get('BREVO_API_KEY');
  if (!key) return reply({ error: 'mail' }, 503);
  const links: string[] = Array.isArray(s.links) && s.links.length ? s.links : s.website ? [s.website] : [];
  const data: CardMailData = {
    name: s.name,
    kiez: s.kiez || undefined,
    address: s.address || undefined,
    email: s.email || undefined,
    openingHours: s.opening_hours || undefined,
    services: s.services || undefined,
    links: links.filter((l) => /^https:\/\//i.test(l)),
    url: `${SITE}/s/${s.slug}`,
    logoUrl: foto(url, s.logo_path),
    // Folgen in der App wie auf der öffentlichen Seite (api/s.mjs); ohne Konto über das Onboarding und zurück
    appUrl: `https://app.kiezcoins.de/schaufenster/${encodeURIComponent(s.id)}?folgen=1`,
  };
  const mail = cardMail(data, qrMatrix(data.url), sender);
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: SENDER,
      // Antworten gehen an die Kontakt-Mail des Schaufensters, wenn es eine gibt
      ...(data.email ? { replyTo: { email: data.email, name: data.name } } : {}),
      to: [{ email: to }],
      subject: mail.subject,
      htmlContent: mail.html,
      textContent: mail.text,
      tags: ['visitenkarte'],
    }),
  });
  if (!res.ok) {
    // Brevo lehnt ab (z. B. Schlüssel, Absender oder IP nicht freigegeben): Grund im Log der Funktion (Daria, 2026-11-18:
    // „Ich habe keine Mail bekommen“, die Funktion meldete nur 502).
    console.error(`visitenkarte-mail: Brevo ${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`);
    return reply({ error: 'mail' }, 502);
  }

  await db.from('showcase_card_mails').insert({ showcase_id: s.id, device_hash: device, recipient_hash: recipient });
  // Aufräumen: Für die Grenzen reicht ein Tag, 30 Tage bleiben für Rückfragen zu Missbrauch
  await db.from('showcase_card_mails').delete().lt('created_at', new Date(Date.now() - 30 * 86400e3).toISOString());
  return reply({ ok: true });
});
