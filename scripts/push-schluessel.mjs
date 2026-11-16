// Einmalig: VAPID-Schlüssel für Web-Push erzeugen und als Secrets der Edge Function `push` hinterlegen
// (Daria, 2026-11-16). Der geheime Schlüssel erscheint nirgends, er geht direkt an Supabase.
//
//   node scripts/push-schluessel.mjs           (braucht `npx supabase login`)
//
// Danach: `npx supabase functions deploy push --no-verify-jwt --project-ref aqxzxpxrshizlaqyjplw`.
// Neue Schlüssel machen alle bestehenden Web-Push-Abos ungültig. Nur einmal ausführen.
import { generateKeyPairSync } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const PROJECT = 'aqxzxpxrshizlaqyjplw';
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pub = publicKey.export({ format: 'jwk' });
const priv = privateKey.export({ format: 'jwk' });
const b64 = (buf) => buf.toString('base64url');
const raw = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, 'base64url'), Buffer.from(pub.y, 'base64url')]);
const publicB64 = b64(raw);
const privateB64 = priv.d;

execFileSync('npx', ['supabase', 'secrets', 'set', `VAPID_PUBLIC_KEY=${publicB64}`, `VAPID_PRIVATE_KEY=${privateB64}`, '--project-ref', PROJECT], {
  stdio: ['ignore', 'ignore', 'inherit'],
});
console.log('VAPID-Schlüssel bei Supabase hinterlegt. Öffentlicher Schlüssel:', publicB64);
