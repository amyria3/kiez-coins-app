// Rückkehr von der Anmeldung bei LinkedIn (Daria, 2026-11-28). LinkedIn leitet hierher weiter:
//   GET /functions/v1/linkedin-anmeldung?code=…&state=…      (oder ?error=…&state=…, wenn die Person abbricht)
// Die Funktion tauscht den Code gegen den Zugang, liest Namen und Kennung der Person (OpenID Connect), speichert den
// Zugang verschlüsselt (crosspost_save, Migration 20261114000100) und leitet zurück in die App:
//   <returnTo>?linkedin=ok   oder   <returnTo>?linkedin=fehler
// Begonnen wird die Anmeldung in der Edge Function `weiterposten` (action 'linkedin_start'), die `state` und
// `returnTo` in linkedin_oauth_states ablegt (Migration 20261128000100). Ohne passende Zeile geht nichts weiter.
//
// Secrets: LINKEDIN_CLIENT_ID und LINKEDIN_CLIENT_SECRET (LinkedIn Developer Portal › Auth). Deploy ohne Anmeldung,
// denn LinkedIn ruft die Adresse ohne Supabase-Token auf:
//   npx supabase functions deploy linkedin-anmeldung --no-verify-jwt --project-ref aqxzxpxrshizlaqyjplw
import { createClient } from 'npm:@supabase/supabase-js@2';

/** Eine Anmeldung gilt 10 Minuten */
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

const back = (returnTo: string, result: 'ok' | 'fehler') => {
  const target = new URL(returnTo);
  target.searchParams.set('linkedin', result);
  return new Response(null, { status: 302, headers: { Location: target.toString() } });
};

Deno.serve(async (req) => {
  if (req.method !== 'GET') return new Response('method', { status: 405 });
  const params = new URL(req.url).searchParams;
  const state = params.get('state') ?? '';
  const code = params.get('code') ?? '';

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  // Zeile holen und gleich löschen: Jeder Zufallswert gilt nur einmal
  const { data: row } = await admin
    .from('linkedin_oauth_states')
    .delete()
    .eq('state', state)
    .select('user_id, return_to, created_at')
    .maybeSingle();
  if (!state || !row) return new Response('Diese Anmeldung ist abgelaufen. Bitte starte sie in KiezCoins neu.', { status: 400 });
  if (Date.now() - new Date(row.created_at).getTime() > STATE_MAX_AGE_MS || !code) return back(row.return_to, 'fehler');

  try {
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${url}/functions/v1/linkedin-anmeldung`,
        client_id: Deno.env.get('LINKEDIN_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('LINKEDIN_CLIENT_SECRET') ?? '',
      }),
    });
    if (!tokenRes.ok) throw new Error(`token ${tokenRes.status}`);
    const token = (await tokenRes.json()) as { access_token: string; expires_in: number };

    const meRes = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!meRes.ok) throw new Error(`userinfo ${meRes.status}`);
    const me = (await meRes.json()) as { sub: string; name?: string };

    const { error } = await admin.rpc('crosspost_save', {
      p_user: row.user_id,
      p_platform: 'linkedin',
      p_handle: me.name || 'LinkedIn',
      p_instance: `urn:li:person:${me.sub}`,
      p_secret: token.access_token,
    });
    if (error) throw new Error('save');
    // Ablauf merken, damit die App vor dem Ablauf „Neu verbinden“ anbieten kann (60 Tage)
    await admin
      .from('crosspost_accounts')
      .update({ expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString() })
      .eq('user_id', row.user_id)
      .eq('platform', 'linkedin');
    return back(row.return_to, 'ok');
  } catch (e) {
    console.error('linkedin-anmeldung', (e as Error).message);
    return back(row.return_to, 'fehler');
  }
});
