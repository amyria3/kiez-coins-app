// Push-Nachrichten verschicken (Daria, 2026-11-16, Migration 20261116000300_push).
//
// 1. GET /functions/v1/push?key   → { publicKey } für das Web-Push-Abo in der App (öffentlicher VAPID-Schlüssel)
// 2. POST { id? }                 → verschickt offene Zeilen aus push_outbox (mit id nur diese, sonst die der letzten
//    Stunde) an alle Geräte der Person: Web-Push (Web-App) und Expo-Push (Android-App). Abgelaufene Geräte (404/410,
//    DeviceNotRegistered) fliegen raus. Die Datenbank stößt das per pg_net an, gleich nach dem Einreihen.
//
// Ohne JWT-Prüfung, denn pg_net schickt keinen Schlüssel. Das ist unkritisch: Die Funktion verschickt nur, was schon
// in der Warteschlange steht, und jede Zeile nur einmal.
//   npx supabase functions deploy push --no-verify-jwt --project-ref aqxzxpxrshizlaqyjplw
// Secrets (einmal, siehe scripts/push-schluessel.mjs): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.
// SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase selbst bereit.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
if (VAPID_PUBLIC && VAPID_PRIVATE) webpush.setVapidDetails('mailto:kontakt@kiezcoins.de', VAPID_PUBLIC, VAPID_PRIVATE);

type Outbox = { id: number; user_id: string; category: string; title: string; body: string; url: string };
type Device = { id: string; kind: 'web' | 'expo'; endpoint: string; p256dh: string | null; auth: string | null };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method === 'GET') return reply({ publicKey: VAPID_PUBLIC || null });
  if (req.method !== 'POST') return reply({ error: 'method' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  let id: number | undefined;
  try {
    const body = await req.json();
    if (typeof body?.id === 'number') id = body.id;
  } catch {
    // ohne Body: alle offenen
  }

  let query = admin.from('push_outbox').select('id, user_id, category, title, body, url').is('sent_at', null);
  query = id ? query.eq('id', id) : query.gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()).limit(100);
  const { data: rows, error } = await query;
  if (error) return reply({ error: error.message }, 500);

  let sent = 0;
  for (const row of (rows ?? []) as Outbox[]) {
    // Gleich als verschickt markieren, damit ein zweiter Aufruf dieselbe Zeile nicht noch einmal schickt
    const { data: claimed } = await admin
      .from('push_outbox')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('sent_at', null)
      .select('id');
    if (!claimed?.length) continue;
    const { data: devices } = await admin
      .from('push_subscriptions')
      .select('id, kind, endpoint, p256dh, auth')
      .eq('user_id', row.user_id);
    const errors: string[] = [];
    const payload = { title: row.title, body: row.body, url: row.url, tag: `${row.category}-${row.id}` };
    for (const d of (devices ?? []) as Device[]) {
      try {
        if (d.kind === 'web') await sendWeb(d, payload);
        else await sendExpo(d, payload);
        await admin.from('push_subscriptions').update({ last_ok_at: new Date().toISOString() }).eq('id', d.id);
        sent++;
      } catch (e) {
        const message = (e as Error).message ?? String(e);
        if (/^gone/.test(message)) await admin.from('push_subscriptions').delete().eq('id', d.id);
        else errors.push(`${d.kind}: ${message}`.slice(0, 200));
      }
    }
    if (errors.length) await admin.from('push_outbox').update({ error: errors.join(' | ').slice(0, 500) }).eq('id', row.id);
  }
  return reply({ ok: true, sent });
});

type Payload = { title: string; body: string; url: string; tag: string };

async function sendWeb(d: Device, payload: Payload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) throw new Error('VAPID-Schlüssel fehlen');
  try {
    await webpush.sendNotification(
      { endpoint: d.endpoint, keys: { p256dh: d.p256dh ?? '', auth: d.auth ?? '' } },
      JSON.stringify(payload),
      { TTL: 24 * 60 * 60, urgency: 'normal' },
    );
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) throw new Error('gone');
    throw new Error(`web ${status ?? ''} ${(e as Error).message}`.trim());
  }
}

async function sendExpo(d: Device, payload: Payload) {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ to: d.endpoint, title: payload.title, body: payload.body, data: { url: payload.url }, sound: 'default' }),
  });
  const json = (await res.json().catch(() => ({}))) as { data?: { status?: string; details?: { error?: string }; message?: string } };
  if (json.data?.status === 'error') {
    if (json.data.details?.error === 'DeviceNotRegistered') throw new Error('gone');
    throw new Error(`expo ${json.data.message ?? ''}`);
  }
  if (!res.ok) throw new Error(`expo ${res.status}`);
}
