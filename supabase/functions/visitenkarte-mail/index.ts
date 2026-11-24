// Visitenkarte per Mail (Daria, 2026-11-17: „möchte ich es auch per Mail senden können (aus dem public interface),
// das wäre ne Mail von KiezCoins mit dem Link und der Visitenkarte (nicht als pdf als Code)“).
//
// Die öffentliche Seite kiezcoins.de/s/<kurzname> (api/s.mjs) ruft die Funktion ohne Anmeldung auf. Sie holt das
// Schaufenster über public_showcase, also nur Schaufenster mit Sichtbarkeit „Alle“, die online sind, und schickt die
// Karte als HTML-Mail (mail.ts) über Brevo.
//
// Schutz vor Missbrauch: kein Freitext, nur ein optionaler Vorname (Name und Ort der Begegnung nur vom Team). Höchstens 5 Mails je Gerät und Stunde,
// 20 je Gerät und Tag, 2 je Empfängeradresse und Tag, 50 je Schaufenster und Tag. Gerät und Empfängeradresse stehen
// nur als Prüfsumme in showcase_card_mails (Migration 20261117000500); Zeilen älter als 30 Tage löscht die Funktion.
// Gegen Massenversand über viele Geräte (Daria, 2026-11-18): höchstens 30 Mails je Stunde und 120 je Tag über alle
// Schaufenster zusammen. Brevo erlaubt im Gratis-Tarif 300 Mails am Tag, und die Anmelde-Codes (konto-ohne-mail)
// laufen über dasselbe Konto; sie sollen nie wegen Visitenkarten ausfallen.
// Ein verstecktes Feld „website“ fängt einfache Bots ab.
//
// Anfrage: POST { slug, to, from?, an?, ort?, selbst?, website? }  Antwort: { ok: true } oder { error }
// `selbst`: Die Person sendet sich die Karte selbst („An mich per Mail senden“, Daria, 2026-11-24).
// `an` (Name der Person) und `ort` (Ort der Begegnung) zählen nur, wenn ein Mitglied des Teams angemeldet schickt
// (Daria, 2026-11-24: dieselben Felder wie „Kontakt speichern und per Mail schicken“).
// Fehler: input, email, name, not_found, limit, mail
//
// Kontakt schicken und Kontakte tauschen (Daria, 2026-11-23): POST { slug, art: 'kontakt', name, email, phone?, ort?,
// nachricht?, karte, einwilligung: true, website? }. Die Funktion schickt die Angaben an die Kontakt-Mail des
// Schaufensters („Antworten“ geht an die Person) und, wenn `karte` gesetzt ist, der Person die Visitenkarte. Sie
// speichert die Angaben nicht; in showcase_card_mails steht je Mail nur eine Zeile mit Prüfsummen, wie oben.
// Höchstens 20 Kontakte je Schaufenster und Tag. Zusätzliche Fehler: consent, no_contact (Schaufenster ohne Mail).
// Seit 2026-11-24 heißt das in der App „Nachricht oder Frage senden“: Die Karte an die Person enthält ihre Nachricht
// als Kopie (cardMail mit `copy`).
//
// Secrets (Supabase › Edge Functions › Secrets): BREVO_API_KEY wie bei konto-ohne-mail.
// SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase selbst bereit.
import { createClient } from 'npm:@supabase/supabase-js@2';
import QRCode from 'npm:qrcode@1.5.4';

import { cardMail, cleanMeetingPlace, cleanRecipientName, cleanSenderName, contactMail, isEmail, type CardMailData, type Meeting, type QrMatrix } from './mail.ts';

const SITE = 'https://kiezcoins.de';
// Dieselbe bei Brevo bestätigte Absenderadresse wie bei konto-ohne-mail
const SENDER = { name: 'KiezCoins', email: 'registration.noreply@kiezcoins.de' };
const LIMITS = { deviceHour: 5, deviceDay: 20, recipientDay: 2, showcaseDay: 50, allHour: 30, allDay: 120, contactDay: 20 };

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

/** Freitext aus dem Formular: ohne Steuerzeichen, gekürzt; Zeilenumbrüche nur, wenn erlaubt */
function plain(value: unknown, max: number, multiline = false): string {
  if (typeof value !== 'string') return '';
  const v = value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ');
  return (multiline ? v : v.replace(/\n/g, ' ')).replace(/[ \t]+/g, ' ').trim().slice(0, max);
}

const today = () =>
  new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());

function qrMatrix(value: string): QrMatrix {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  // Die Ruhezone gibt die Mail selbst: 8 px weißer Rand um den Code, also zwei Module
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => !!qr.modules.get(r, c)));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'method' }, 405);

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return reply({ error: 'input' }, 400);
  }
  // Verstecktes Feld ausgefüllt: so tun, als wäre die Mail raus
  if (typeof input.website === 'string' && input.website) return reply({ ok: true });
  const slug = typeof input.slug === 'string' ? input.slug.trim().toLowerCase() : '';
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug)) return reply({ error: 'input' }, 400);
  const contact = input.art === 'kontakt';
  // Visitenkarte: Empfänger:in `to`. Kontakt: die Person selbst, die Karte geht nur mit `karte` an sie.
  const to = (typeof (contact ? input.email : input.to) === 'string' ? String(contact ? input.email : input.to) : '').trim();
  if (!isEmail(to)) return reply({ error: 'email' }, 400);
  const sender = contact ? '' : cleanSenderName(input.from);
  if (sender === null) return reply({ error: 'name' }, 400);
  const person = {
    name: plain(input.name, 80),
    phone: plain(input.phone, 30),
    place: plain(input.ort, 120),
    message: plain(input.nachricht, 1000, true),
  };
  const sendCard = !contact || input.karte === true;
  if (contact) {
    if (!person.name) return reply({ error: 'name' }, 400);
    if (person.phone && !/^\+?[0-9 ()/-]{5,30}$/.test(person.phone)) return reply({ error: 'phone' }, 400);
    if (input.einwilligung !== true) return reply({ error: 'consent' }, 400);
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: s } = await db.rpc('public_showcase', { p_slug: slug });
  if (!s) return reply({ error: 'not_found' }, 404);
  const teamMail = typeof s.email === 'string' ? s.email.trim() : '';
  if (contact && !isEmail(teamMail)) return reply({ error: 'no_contact' }, 404);

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unbekannt';
  const device = await hash('geraet', ip);
  const recipient = await hash('empfaenger', to.toLowerCase());
  // Kontakte zählen je Schaufenster, getrennt von Visitenkarten an die Adresse des Teams
  const team = await hash('kontakt', `${s.id}`);
  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const dayAgo = new Date(Date.now() - 86400e3).toISOString();
  // Ohne Spalte zählt die Abfrage alle Mails (Grenze über alle Schaufenster)
  const count = async (column: string | null, value: string, since: string) => {
    let q = db.from('showcase_card_mails').select('id', { count: 'exact', head: true }).gte('created_at', since);
    if (column) q = q.eq(column, value);
    const { count: n } = await q;
    return n ?? 0;
  };
  const [deviceHour, deviceDay, recipientDay, showcaseDay, allHour, allDay, contactDay] = await Promise.all([
    count('device_hash', device, hourAgo),
    count('device_hash', device, dayAgo),
    count('recipient_hash', recipient, dayAgo),
    count('showcase_id', s.id, dayAgo),
    count(null, '', hourAgo),
    count(null, '', dayAgo),
    count('recipient_hash', team, dayAgo),
  ]);
  if (allHour >= LIMITS.allHour || allDay >= LIMITS.allDay) {
    // Auffällig viele Mails insgesamt: im Log der Funktion sichtbar (Supabase › Edge Functions › Logs)
    console.warn(`visitenkarte-mail: Grenze für alle erreicht (Stunde ${allHour}, Tag ${allDay})`);
    return reply({ error: 'limit' }, 429);
  }
  if (
    deviceHour >= LIMITS.deviceHour ||
    deviceDay >= LIMITS.deviceDay ||
    (sendCard && recipientDay >= LIMITS.recipientDay) ||
    showcaseDay >= LIMITS.showcaseDay ||
    (contact && contactDay >= LIMITS.contactDay)
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
    phone: s.phone || undefined,
    openingHours: s.opening_hours || undefined,
    services: s.services || undefined,
    links: links.filter((l) => /^https:\/\//i.test(l)),
    url: `${SITE}/s/${s.slug}`,
    logoUrl: foto(url, s.logo_path),
    // Folgen in der App wie auf der öffentlichen Seite (api/s.mjs); ohne Konto über das Onboarding und zurück
    appUrl: `https://app.kiezcoins.de/schaufenster/${encodeURIComponent(s.id)}?folgen=1`,
  };
  // Eine Mail über Brevo; false, wenn Brevo ablehnt (Grund im Log der Funktion)
  const send = async (address: string, mail: { subject: string; html: string; text: string }, replyTo: { email: string; name: string } | null, tag: string) => {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: SENDER,
        ...(replyTo ? { replyTo } : {}),
        to: [{ email: address }],
        subject: mail.subject,
        htmlContent: mail.html,
        textContent: mail.text,
        tags: [tag],
      }),
    });
    if (!res.ok) {
      // Brevo lehnt ab (z. B. Schlüssel, Absender oder IP nicht freigegeben): Grund im Log der Funktion (Daria, 2026-11-18:
      // „Ich habe keine Mail bekommen“, die Funktion meldete nur 502).
      console.error(`visitenkarte-mail: Brevo ${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`);
    }
    return res.ok;
  };

  if (contact) {
    // Zuerst an das Team: Ohne diese Mail ist der Kontakt nicht angekommen
    const mail = contactMail(s.name, data.url, { name: person.name, email: to, phone: person.phone || undefined, place: person.place || undefined, message: person.message || undefined, cardSent: sendCard }, today());
    if (!(await send(teamMail, mail, { email: to, name: person.name }, 'visitenkarte-kontakt'))) return reply({ error: 'mail' }, 502);
    await db.from('showcase_card_mails').insert({ showcase_id: s.id, device_hash: device, recipient_hash: team });
  }
  // Name und Ort der Begegnung (Daria, 2026-11-24): nur vom Team des Schaufensters, sonst bleiben sie weg. So kann
  // niemand über die öffentliche Seite eigenen Text in fremde Postfächer schicken.
  let meeting: Meeting | undefined;
  const meetName = contact ? '' : cleanRecipientName(input.an);
  const meetPlace = contact ? '' : cleanMeetingPlace(input.ort);
  if (meetName || meetPlace) {
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      auth: { persistSession: false },
    });
    const { data: isTeam } = await asUser.rpc('can_post_showcase', { p_showcase: s.id });
    if (isTeam === true) meeting = { name: meetName || undefined, place: meetPlace || undefined, date: today() };
  }
  if (sendCard) {
    // Antworten gehen an die Kontakt-Mail des Schaufensters, wenn es eine gibt
    // Nachricht oder Frage: die Kopie mit der Nachricht; „An mich per Mail senden“: die Karte an sich selbst
    const kind = contact ? { copy: person.message || undefined } : { self: input.selbst === true };
    const mail = cardMail(data, qrMatrix(data.url), kind.self ? '' : sender, meeting, kind);
    const ok = await send(to, mail, data.email ? { email: data.email, name: data.name } : null, 'visitenkarte');
    // Beim Tausch ist der Kontakt schon beim Team: Die Seite sagt dann, dass nur die Karte fehlt
    if (!ok) return reply(contact ? { ok: true, karte: false } : { error: 'mail' }, contact ? 200 : 502);
    await db.from('showcase_card_mails').insert({ showcase_id: s.id, device_hash: device, recipient_hash: recipient });
  }
  // Aufräumen: Für die Grenzen reicht ein Tag, 30 Tage bleiben für Rückfragen zu Missbrauch
  await db.from('showcase_card_mails').delete().lt('created_at', new Date(Date.now() - 30 * 86400e3).toISOString());
  return reply({ ok: true });
});
