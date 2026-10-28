// Download der Test-App. Seit 28.10.2026 ohne Passwort (Daria); die Prüfung greift nur noch, wenn ein
// Passwort gesetzt ist (Secret oder Hash in `download_settings`).
// Die Download-Seite schickt das Formular per POST hierher. Stimmt das Passwort, leitet die Funktion
// auf einen 10 Minuten gültigen Link zur APK im privaten Bucket `downloads` weiter, sonst zurück zur Seite.
//
// Secrets (Supabase › Edge Functions › Secrets):
//   DOWNLOAD_PASSWORD  Passwort für die Download-Seite (Pflicht)
//   DOWNLOAD_PAGE      Adresse der Download-Seite, z. B. https://kiezcoins.de/ (für den Rückweg bei falschem Passwort)
//   APK_PATH           optional, Datei im Bucket `downloads`, Standard: kiez-coins.apk
// Ohne Secret gilt Tabelle `download_settings`: Passwort-Hash (SHA-256, hex), Adresse der Download-Seite
// und APK-Adresse als Ausweichweg, wenn im Bucket keine Datei liegt.
// SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase selbst bereit.
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'downloads';
const LINK_SECONDS = 600;

const encoder = new TextEncoder();

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

/** Vergleich in konstanter Zeit, damit die Antwortzeit nichts über das Passwort verrät. */
async function samePassword(given: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(given), sha256(expected)]);
  return sameBytes(a, b);
}

const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Vergleich mit gespeichertem Hash, ebenfalls in konstanter Zeit. */
async function matchesHash(given: string, expectedHex: string): Promise<boolean> {
  return sameBytes(encoder.encode(hex(await sha256(given))), encoder.encode(expectedHex.toLowerCase()));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function redirect(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

Deno.serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: settings } = await supabase
    .from('download_settings')
    .select('password_sha256, apk_url, download_page')
    .eq('id', 1)
    .maybeSingle();

  const page = Deno.env.get('DOWNLOAD_PAGE') ?? settings?.download_page ?? 'https://kiezcoins.de/';
  const back = (reason: string) => redirect(`${page}${page.includes('?') ? '&' : '?'}fehler=${reason}#download`);

  const expected = Deno.env.get('DOWNLOAD_PASSWORD');
  const open = !expected && !settings?.password_sha256;
  // Ohne Passwort lädt auch ein einfacher Link (GET) die App
  if (req.method !== 'POST' && !open) return redirect(page);

  let given = '';
  if (!open) try {
    const form = await req.formData();
    given = String(form.get('passwort') ?? '');
  } catch {
    return back('passwort');
  }

  const ok = open || (expected ? await samePassword(given, expected) : await matchesHash(given, settings!.password_sha256!));
  if (!ok) {
    // Bremst Durchprobieren aus.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return back('passwort');
  }

  const path = Deno.env.get('APK_PATH') ?? 'kiez-coins.apk';
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, LINK_SECONDS, { download: 'kiez-coins.apk' });
  if (error || !data?.signedUrl) return settings?.apk_url ? redirect(settings.apk_url) : back('datei');

  return redirect(data.signedUrl);
});
