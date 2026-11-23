// Digitale Visitenkarte unter kiezcoins.de/s/<kurzname>/visitenkarte (Daria, 2026-11-23).
//
// Die Karte selbst ist eine Komponente der App (src/components/showcase/DigitalCard.tsx und CardActions.tsx). Gäste
// sehen sie unter app.kiezcoins.de/s/<kurzname>/visitenkarte (src/app/s/[slug]/visitenkarte.tsx), auch ohne
// Anmeldung. Diese Adresse leitet Menschen dorthin weiter, mit Herkunft (?via=karte nach dem QR-Code der Karte,
// ?von=schaufenster von der Schaufenster-Seite) und ?als=team. So gilt jede Änderung an der Karte, an den Knöpfen und
// an den Formularen sofort für App und Web (UX-Regeln, „Eine Sache ist eine Komponente“).
//
// Linkvorschauen von Messengern und Suchmaschinen bekommen eine kleine Seite mit Titel, Beschreibung und Vorschaubild
// (visitenkarte.png, _visitenkarte-bild.mjs) und dem Link zur Karte.
//
// Hier bleibt nur, was der Server braucht: die vCard für /s/<kurzname>/kontakt.vcf (aus der App auf dem Handy) und die
// Adressen für den QR-Code.

import { showcaseVcard } from '../src/data/vcard.mjs';

const SITE = 'https://kiezcoins.de';
const APP = 'https://app.kiezcoins.de';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Ziel des QR-Codes: die Ansicht mit Kennung der persönlichen Begegnung */
export const visitenkarteLink = (slug) => `${SITE}/s/${slug}/visitenkarte`;
export const karteQrLink = (slug) => `${visitenkarteLink(slug)}?via=karte`;

// Ortszeile und Services teilt die Digitale Visitenkarte der App (src/components/showcase/DigitalCard.tsx)
import { placeLine as ortZeile, serviceItems as serviceListe } from '../src/data/digitalCard.mjs';

export { ortZeile, serviceListe };

/**
 * vCard des Schaufensters aus den Feldern von public_showcase (src/data/vcard.mjs, dieselbe wie in der App)
 * @param {any} s
 * @param {{ ort?: string, notiz?: string }} [felder]
 * @param {Date} [jetzt]
 */
export function vcard(s, { ort = '', notiz = '' } = {}, jetzt = new Date()) {
  return showcaseVcard({ ...s, openingHours: s.opening_hours }, { place: ort, note: notiz }, jetzt);
}

/**
 * Ziel der Weiterleitung in der App. Nur bekannte Werte gehen mit.
 * @param {string} slug
 * @param {{ via?: string, von?: string, team?: boolean }} [herkunft]
 */
export function appVisitenkarte(slug, { via, von, team = false } = {}) {
  const q = new URLSearchParams();
  if (via === 'karte') q.set('via', 'karte');
  if (von === 'schaufenster') q.set('von', 'schaufenster');
  if (team) q.set('als', 'team');
  const query = q.toString();
  return `${APP}/s/${encodeURIComponent(slug)}/visitenkarte${query ? `?${query}` : ''}`;
}

/**
 * Seite für Linkvorschauen (Messenger, Suchmaschinen): Kopf mit Titel und Vorschaubild, sichtbar das Bild und ein
 * Link zur Karte. Browser, die als Bot gelten, kommen über die Weiterleitung im Kopf trotzdem zur Karte.
 * @param {any} s
 * @param {string} kopf
 * @param {string} ziel
 */
export function vorschauSeite(s, kopf, ziel) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
${kopf}
<meta http-equiv="refresh" content="0; url=${esc(ziel)}">
<style>body { margin: 0; padding: 24px 16px; font: 16px/1.4 system-ui, sans-serif; background: #F7F7F4; color: #161616; }
main { max-width: 420px; margin: 0 auto; display: grid; gap: 16px; } img { width: 100%; height: auto; border-radius: 12px; } a { color: inherit; }</style>
</head>
<body>
<main>
  <a href="${esc(ziel)}"><img src="/s/${esc(s.slug)}/visitenkarte.png" width="1200" height="630" alt="Digitale Visitenkarte von ${esc(s.name)}"></a>
  <a href="${esc(ziel)}">Digitale Visitenkarte öffnen</a>
</main>
</body>
</html>`;
}

/**
 * Hinweis für das Team, wenn die App die Schaufenster-Seite mit ?als=team öffnet (Daria, 2026-11-23: „Das kann man
 * eben über URL routing lösen“). Das Skript nimmt die Kennung sofort aus der Adresse, damit ein weitergegebener Link
 * die normale Ansicht zeigt. Die Links der Seite selbst tragen sie weiter.
 */
export function teamHinweis(text) {
  return `<p class="sf-team" role="note">${esc(text)}</p>
<style>.geteilt .sf-team { max-width: 420px; margin: 0 0 20px; padding: 12px 16px; border-radius: 12px; background: var(--surface); font-size: 15px; line-height: 1.45; }</style>
<script>
try {
  const u = new URL(location.href);
  if (u.searchParams.has('als')) { u.searchParams.delete('als'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); }
} catch {}
</script>`;
}
