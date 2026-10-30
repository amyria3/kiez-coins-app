// Konto ohne E-Mail: Deckname und Passwort (Daria, 27.10.2026, Button „Ich möchte meine E-Mail nicht teilen“).
//
// Supabase Auth braucht für ein Passwort-Konto eine Adresse. Die Funktion legt das Konto deshalb mit einer
// erfundenen Adresse `<zufall>@ohne-mail.kiezcoins.de` an, die niemand empfängt, und bestätigt sie gleich.
// Die App meldet sich danach mit dieser Adresse und dem Passwort an. Später findet sie die Adresse über den
// Decknamen (Funktion `login_email_for_handle`).
//
// Auf Wunsch schickt die Funktion Deckname und Passwort einmal an eine echte Adresse. Diese Adresse wird
// nirgends gespeichert und nicht protokolliert.
//
// Anfrage: POST { handle, password, copyTo? }  Antwort: { email } oder { error }
//
// Secrets (Supabase › Edge Functions › Secrets):
//   BREVO_API_KEY  API-Schlüssel von Brevo für die Kopie per Mail (ohne Schlüssel keine Kopie)
// SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase selbst bereit.
import { createClient } from 'npm:@supabase/supabase-js@2';

const DOMAIN = 'ohne-mail.kiezcoins.de';
const MIN_PASSWORD = 8;
const MAX_HANDLE = 30;
/** Höchstens so viele neue Konten ohne Mail pro Stunde, damit niemand massenhaft Konten anlegt. */
const MAX_PER_HOUR = 30;
const SENDER = { name: 'KiezKoins', email: 'registration.noreply@kiezcoins.de' };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

async function sendCopy(to: string, handle: string, password: string): Promise<boolean> {
  const key = Deno.env.get('BREVO_API_KEY');
  if (!key) return false;
  const text =
    `Ahoi!\n\nDu hast bei KiezKoins ein Konto ohne E-Mail angelegt. Damit meldest Du Dich an:\n\n` +
    `Deckname: ${handle}\nPasswort: ${password}\n\n` +
    `Wir haben Deine Adresse nur für diese Mail genutzt und nicht gespeichert. ` +
    `Ohne E-Mail können wir Dir kein neues Passwort schicken. Hebe diese Mail also gut auf.\n\nCat The Käptn`;
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: to }],
      subject: 'Deine Zugangsdaten für KiezKoins',
      textContent: text,
      htmlContent: `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
    }),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'method' }, 405);

  let input: { handle?: unknown; password?: unknown; copyTo?: unknown };
  try {
    input = await req.json();
  } catch {
    return reply({ error: 'input' }, 400);
  }
  const handle = typeof input.handle === 'string' ? input.handle.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const copyTo = typeof input.copyTo === 'string' ? input.copyTo.trim() : '';
  if (!handle || handle.length > MAX_HANDLE) return reply({ error: 'handle' }, 400);
  if (password.length < MIN_PASSWORD) return reply({ error: 'weak_password' }, 400);
  if (copyTo && !isEmail(copyTo)) return reply({ error: 'copy_invalid' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // Deckname frei? Der eindeutige Index auf profiles prüft das beim Speichern noch einmal.
  const { data: taken } = await admin.rpc('handle_taken', { p_handle: handle });
  if (taken) return reply({ error: 'handle_taken' }, 409);

  const { data: recent } = await admin.rpc('recent_no_mail_signups');
  if (typeof recent === 'number' && recent >= MAX_PER_HOUR) return reply({ error: 'rate_limit' }, 429);

  const email = `${crypto.randomUUID()}@${DOMAIN}`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { has_password: true, no_email: true },
  });
  if (created.error || !created.data.user) return reply({ error: 'create' }, 500);
  const userId = created.data.user.id;

  // Das Profil legt der Trigger on_auth_user_created an. Klappt der Deckname nicht, Konto wieder löschen.
  const { error: handleError } = await admin.from('profiles').update({ handle }).eq('id', userId);
  if (handleError) {
    await admin.auth.admin.deleteUser(userId);
    return reply({ error: handleError.code === '23505' ? 'handle_taken' : 'create' }, handleError.code === '23505' ? 409 : 500);
  }

  const copySent = copyTo ? await sendCopy(copyTo, handle, password).catch(() => false) : false;
  return reply({ email, copySent });
});
