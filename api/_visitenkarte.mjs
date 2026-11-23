// Eigene Ansicht der Digitalen Visitenkarte: kiezcoins.de/s/<kurzname>/visitenkarte (Daria, 2026-11-23).
//
// Die Schaufenster-Seite zeigt nur die Vorschau und „Digitale Visitenkarte öffnen“. Diese Ansicht zeigt die Karte ohne
// QR-Code, dafür mit Kompetenzen & Services, Adresse, Öffnungszeiten und Kontakt (Entwurf C + D), darunter die
// Knöpfe untereinander. Ist eine Option aufgeklappt, wird der Hauptknopf zum Secondary-Knopf (Daria, 2026-11-23).
//
// Welche Knöpfe in welcher Reihenfolge erscheinen, entscheidet src/data/cardActions.mjs, dieselbe Regel wie in der
// App (2026-11-23). Hier schaut immer ein Gast: kiezcoins.de kennt die Anmeldung der App nicht (app.kiezcoins.de).
// Die Herkunft steht in der Adresse: ?via=karte nach dem QR-Code der Karte (die Person hat das Team getroffen),
// ?von=schaufenster von der Schaufenster-Seite, sonst ein geteilter Link.
//
// Nach dem QR-Code der Karte fragt „In Kontakte speichern“ nach dem Ort der Begegnung, und „Deinen Kontakt schicken“
// und „Kontakte tauschen“ erscheinen, wenn das Schaufenster eine Kontakt-Mail hat. „In Kontakte speichern“ liefert
// eine vCard (POST /s/<kurzname>/kontakt.vcf). Ort und Notiz gehen im Formular mit, nicht in der Adresse, damit sie in
// keinem Protokoll landen. Die Edge Function visitenkarte-mail leitet Kontakte an die Kontakt-Mail weiter und schickt
// beim Tausch der Person die Digitale Visitenkarte; KiezCoins speichert nichts davon.
//
// Drucken gibt es hier nicht: Die Druckbare Visitenkarte findet das Team in der Schaufenster-Verwaltung der App.
// Die Ansicht zählt ihre Aufrufe und erhaltene Kontakte als Zahl pro Tag (count_showcase_visit, Migration
// 20261123000100), per Skript im Browser: ohne Kennung, Cookie oder Speicher auf dem Gerät.

// Nur der Kern von qrcode (ohne PNG-Ausgabe und fs), so läuft das Modul auch gebündelt in den Tests
import QRCode from 'qrcode/lib/core/qrcode.js';

import { icsFold, icsText } from './_kalender.mjs';
import { cardActionLabel, cardActions, cardOrigin } from '../src/data/cardActions.mjs';

const SITE = 'https://kiezcoins.de';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const kurzLink = (url) => String(url).replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

/** Ziel des QR-Codes: die Ansicht mit Kennung der persönlichen Begegnung */
export const visitenkarteLink = (slug) => `${SITE}/s/${slug}/visitenkarte`;
export const karteQrLink = (slug) => `${visitenkarteLink(slug)}?via=karte`;

// Ortszeile und Services teilt die Digitale Visitenkarte der App (src/components/showcase/DigitalCard.tsx)
import { placeLine as ortZeile, serviceItems as serviceListe } from '../src/data/digitalCard.mjs';

export { ortZeile, serviceListe };

const tag = (jetzt) =>
  new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' }).format(jetzt);

/** Freitext aus dem Formular: eine Zeile bzw. kurzer Absatz, ohne Steuerzeichen */
export function sauber(value, max) {
  return String(value ?? '')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, max);
}

/**
 * vCard 3.0 des Schaufensters (Daria, 2026-11-23). Die Notiz beginnt mit dem Datum und, wenn angegeben, dem Ort der
 * Begegnung, danach folgen die eigene Notiz und die Kompetenzen & Services.
 */
export function vcard(s, { ort = '', notiz = '' } = {}, jetzt = new Date()) {
  const o = sauber(ort, 120);
  const n = sauber(notiz, 500);
  const services = serviceListe(s.services);
  const notizText = [
    o ? `Kennengelernt am ${tag(jetzt)} bei ${o}.` : `Gespeichert am ${tag(jetzt)}.`,
    n,
    services.length ? `Kompetenzen & Services: ${services.join(', ')}` : '',
    s.opening_hours?.trim() ? `Öffnungszeiten: ${s.opening_hours.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const website = (s.links ?? []).find((l) => /^https:\/\//i.test(l)) ?? (s.website && /^https:\/\//i.test(s.website) ? s.website : '');
  const zeilen = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${icsText(s.name)};;;;`,
    `FN:${icsText(s.name)}`,
    `ORG:${icsText(s.name)}`,
    // Apple Kontakte zeigt den Eintrag als Firma statt als Person
    'X-ABShowAs:COMPANY',
    s.address?.trim() ? `ADR;TYPE=WORK:;;${icsText(s.address.trim().replace(/\s*\n\s*/g, ', '))};;;;` : '',
    s.email?.trim() ? `EMAIL;TYPE=WORK:${icsText(s.email.trim())}` : '',
    website ? `URL;TYPE=WORK:${icsText(website)}` : '',
    `item1.URL:${icsText(visitenkarteLink(s.slug))}`,
    'item1.X-ABLabel:KiezCoins',
    `NOTE:${icsText(notizText)}`,
    'END:VCARD',
  ];
  return zeilen.filter(Boolean).map(icsFold).join('\r\n') + '\r\n';
}

/** QR-Code als SVG, für „QR-Code zeigen“ */
function qrSvg(url) {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const rand = 2;
  let pfad = '';
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (qr.modules.get(r, c)) pfad += `M${c + rand} ${r + rand}h1v1h-1z`;
  const g = n + rand * 2;
  return `<svg viewBox="0 0 ${g} ${g}" width="220" height="220" role="img" aria-label="QR-Code zu dieser Digitalen Visitenkarte" shape-rendering="crispEdges"><rect width="${g}" height="${g}" fill="#fff"/><path d="${pfad}" fill="#000027"/></svg>`;
}

/**
 * Hinweis für das Team, wenn die App die Seite mit ?als=team öffnet (Daria, 2026-11-23: „Das kann man eben über URL
 * routing lösen“). Das Skript nimmt die Kennung sofort aus der Adresse, damit ein weitergegebener Link die normale
 * Ansicht zeigt. Die Links der Seite selbst tragen sie weiter.
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

function karte(s, logo, kater) {
  const services = serviceListe(s.services);
  // Alle Links des Schaufensters (Daria, 2026-11-23: „Auf der Digitalen Visitenkarte selbst fehlen die ganzen Links“)
  const links = [...new Set([...(s.links ?? []), ...(s.website ? [s.website] : [])])].filter((l) => /^https:\/\//i.test(l));
  const zeile = (titel, wert) => `<div><p class="vk-lb">${titel}</p>${wert}</div>`;
  const kontakt = [
    s.email?.trim() ? `<a href="mailto:${esc(s.email.trim())}">${esc(s.email.trim())}</a>` : '',
    ...links.map((l) => `<a href="${esc(l)}" rel="noopener nofollow">${esc(kurzLink(l))}</a>`),
  ].filter(Boolean);
  return `<div class="vk-karte">
    <div class="vk-marke">${logo ? `<img src="${esc(logo)}" alt="">` : `<span class="vk-kater">${kater}</span>`}<div><div class="vk-name">${esc(s.name)}</div>${ortZeile(s) ? `<div class="vk-kiez">${esc(ortZeile(s))}</div>` : ''}</div></div>
    <div class="vk-zeilen">
      ${services.length ? `<div class="vk-chips" aria-label="Kompetenzen &amp; Services">${services.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
      ${s.address?.trim() ? zeile('Adresse', `<div class="vk-v">${esc(s.address.trim())}</div>`) : ''}
      ${s.opening_hours?.trim() ? zeile('Öffnungszeiten', `<div class="vk-v">${esc(s.opening_hours.trim())}</div>`) : ''}
      ${kontakt.length ? zeile('Kontakt', `<div class="vk-v vk-links">${kontakt.join('')}</div>`) : ''}
    </div>
  </div>`;
}

/**
 * Inhalt der Ansicht. `via` ist „karte“, wenn die Person über den QR-Code der Karte gekommen ist, `von`
 * „schaufenster“, wenn sie von der Schaufenster-Seite kam. `mailFunktion` und `schluessel` für die Mails (Edge
 * Function visitenkarte-mail), `zaehlFunktion` für die Zahlen des Teams (count_showcase_visit). `team` zeigt die
 * Vorschau fürs Team (?als=team).
 * @param {any} s
 * @param {{ via?: string, von?: string, team?: boolean, logo?: string | null, kater?: string, mailFunktion?: string, schluessel?: string, zaehlFunktion?: string }} [optionen]
 */
export function visitenkarteAnsicht(s, { via, von, team = false, logo, kater, mailFunktion, schluessel, zaehlFunktion } = {}) {
  const origin = cardOrigin({ via, von });
  const begegnung = origin === 'card' && !team;
  const viewer = team ? 'team' : 'guest';
  // Team (?als=team aus der App, Daria, 2026-11-23): eine Vorschau der eigenen Karte. Was nur für andere Sinn ergibt
  // (Kontakt speichern, schicken, tauschen, folgen), fällt weg; Kopieren und Eintragen gibt es nur in der App.
  // Die Kennung ist kein Schutz: Wer sie von Hand anhängt, sieht nur weniger Knöpfe.
  const knoepfe = team
    ? [...cardActions({ viewer, origin }).filter((x) => ['share', 'qr', 'mail'].includes(x.id)), { id: 'showcase', primary: false }]
    : cardActions({
        viewer,
        origin,
        hasContactMail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email?.trim() ?? ''),
        canBefriend: !!s.freunde,
      });
  const beschriftung = (id) => esc(cardActionLabel(id, { name: s.name, viewer, origin }));
  const einwilligung = `<label class="vk-c"><input type="checkbox" name="einwilligung" required><span>Ich willige ein, dass ${esc(s.name)} meine Angaben erhält. <a href="/datenschutz#visitenkarte">Datenschutz</a></span></label>`;
  const app = `https://app.kiezcoins.de/schaufenster/${encodeURIComponent(s.id)}`;
  const knopfHtml = (id, haupt) => {
    const k = `vk-k${haupt ? ' haupt' : ''}`;
    const h = haupt ? ' data-haupt' : '';
    switch (id) {
      case 'share':
        return `<button type="button" class="${k}" id="vk-teilen"${h}>${beschriftung(id)}</button>
    <p class="vk-unter">AirDrop, Quick Share, Messenger</p>
    <p class="vk-hinweis" id="vk-teilen-hinweis" role="status"></p>`;
      case 'saveContact':
        return `<button type="button" class="${k}"${h} aria-expanded="false" aria-controls="vk-p-speichern">${beschriftung(id)}</button>
    <form class="vk-panel" id="vk-p-speichern" method="post" action="/s/${esc(s.slug)}/kontakt.vcf" hidden>
      <p>${begegnung ? 'Ort und Notiz werden im Kontakt gespeichert.' : 'Die Notiz wird im Kontakt gespeichert.'}</p>
      ${begegnung ? '<label class="vk-f"><span>Wo habt Ihr Euch getroffen? <small>optional</small></span><input name="ort" maxlength="120" placeholder="z. B. Flohmarkt am Kanal"></label><button type="button" class="vk-ort" data-ort>Aktuellen Ort einsetzen</button><p class="vk-klein" role="status" data-ort-hinweis></p>' : ''}
      <label class="vk-f"><span>Notiz für Dich <small>optional</small></span><textarea name="notiz" maxlength="500" placeholder="Notiz"></textarea></label>
      <button type="submit" class="vk-k haupt">Kontakt sichern</button>
      <button type="button" class="vk-abbrechen" data-zu>Abbrechen</button>
      <p class="vk-klein">Das Datum wird automatisch ergänzt. ${begegnung ? 'Ort und Notiz stehen' : 'Die Notiz steht'} nur in Deinem Adressbuch.</p>
    </form>`;
      case 'sendContact':
        return `<button type="button" class="${k}"${h} aria-expanded="false" aria-controls="vk-p-schicken">${beschriftung(id)}</button>
    <form class="vk-panel vk-kontakt" id="vk-p-schicken" novalidate hidden>
      <p>${esc(s.name)} erhält Deine Kontaktdaten per Mail.</p>
      <label class="vk-f"><span>Name</span><input name="name" autocomplete="name" required maxlength="80"></label>
      <label class="vk-f"><span>Mail-Adresse</span><input type="email" name="email" autocomplete="email" required maxlength="254" placeholder="name@beispiel.de"></label>
      <label class="vk-f"><span>Telefon <small>optional</small></span><input type="tel" name="phone" autocomplete="tel" maxlength="30"></label>
      <label class="vk-f"><span>Wo habt Ihr Euch getroffen? <small>optional</small></span><input name="ort" maxlength="120" placeholder="z. B. Flohmarkt am Kanal"></label>
      <label class="vk-f"><span>Nachricht <small>optional</small></span><textarea name="nachricht" maxlength="1000"></textarea></label>
      <label class="vk-c"><input type="checkbox" name="karte" checked><span>Digitale Visitenkarte von ${esc(s.name)} per Mail erhalten</span></label>
      ${einwilligung}
      <input class="vk-falle" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button type="submit" class="vk-k haupt">Kontakt schicken</button>
      <button type="button" class="vk-abbrechen" data-zu>Abbrechen</button>
      <p class="vk-klein" role="status" data-hinweis></p>
      <p class="vk-klein">KiezCoins leitet die Angaben weiter und speichert sie nicht.</p>
    </form>`;
      case 'exchange':
        return `<button type="button" class="${k}"${h} aria-expanded="false" aria-controls="vk-p-tauschen">${beschriftung(id)}</button>
    <form class="vk-panel vk-kontakt" id="vk-p-tauschen" novalidate hidden>
      <p>Du erhältst den Kontakt von ${esc(s.name)}, ${esc(s.name)} erhält Deinen Kontakt.</p>
      <label class="vk-f"><span>Name</span><input name="name" autocomplete="name" required maxlength="80"></label>
      <label class="vk-f"><span>Mail-Adresse</span><input type="email" name="email" autocomplete="email" required maxlength="254" placeholder="name@beispiel.de"></label>
      <label class="vk-f"><span>Wo habt Ihr Euch getroffen? <small>optional</small></span><input name="ort" maxlength="120" placeholder="z. B. Flohmarkt am Kanal"></label>
      <input type="hidden" name="karte" value="1">
      ${einwilligung}
      <input class="vk-falle" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button type="submit" class="vk-k haupt">Kontakte tauschen</button>
      <button type="button" class="vk-abbrechen" data-zu>Abbrechen</button>
      <p class="vk-klein" role="status" data-hinweis></p>
      <p class="vk-klein">KiezCoins leitet die Angaben weiter und speichert sie nicht.</p>
    </form>`;
      case 'qr':
        return `<button type="button" class="${k}"${h} aria-expanded="false" aria-controls="vk-p-qr">${beschriftung(id)}</button>
    <div class="vk-panel" id="vk-p-qr" hidden>
      <p>Mit der Kamera scannen, um diese Digitale Visitenkarte zu öffnen.</p>
      <div class="vk-qr">${qrSvg(karteQrLink(s.slug))}</div>
      <button type="button" class="vk-abbrechen" data-zu>Schließen</button>
    </div>`;
      case 'mail':
        return `<button type="button" class="${k}"${h} aria-expanded="false" aria-controls="vk-p-mail">${beschriftung(id)}</button>
    <form class="vk-panel" id="vk-p-mail" novalidate hidden>
      <label class="vk-f"><span>An welche Adresse?</span><input type="email" name="to" autocomplete="email" required maxlength="254" placeholder="name@beispiel.de"></label>
      ${team ? '' : '<label class="vk-f"><span>Dein Vorname <small>optional, steht in der Mail</small></span><input type="text" name="from" autocomplete="given-name" maxlength="30"></label>'}
      <input class="vk-falle" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button type="submit" class="vk-k haupt">Digitale Visitenkarte schicken</button>
      <button type="button" class="vk-abbrechen" data-zu>Abbrechen</button>
      <p class="vk-klein" role="status" data-hinweis></p>
      <p class="vk-klein">KiezCoins nutzt die Adresse nur für diese eine Mail und speichert sie nicht.</p>
    </form>`;
      // Folgen und Anfreunden in der App; ohne Konto geht es übers Onboarding und danach zurück (Daria, 2026-11-17)
      case 'follow':
        return `<a class="${k}"${h} href="${esc(app)}?folgen=1">${beschriftung(id)}</a>`;
      case 'befriend':
        return `<a class="${k}"${h} href="${esc(app)}?anfreunden=1">${beschriftung(id)}</a>`;
      case 'showcase':
        return `<a class="${k}"${h} href="/s/${esc(s.slug)}${team ? '?als=team' : ''}">${beschriftung(id)}</a>`;
      default:
        return '';
    }
  };
  return `<style>
@font-face { font-family: Unbounded_500Medium; font-display: swap; src: url(/fonts/Unbounded_500Medium.ttf) format('truetype'); }
@font-face { font-family: Karla_400Regular; font-display: swap; src: url(/fonts/Karla_400Regular.ttf) format('truetype'); }
@font-face { font-family: Karla_500Medium; font-display: swap; src: url(/fonts/Karla_500Medium.ttf) format('truetype'); }
/* Kopf nur mit KiezCoins und wenig Platz; der Name steht auf der Karte neben dem Avatar (Daria, 2026-11-23) */
.top { justify-content: flex-start; padding-top: 16px; margin-bottom: 12px; }
.geteilt h2.sf-abschnitt.vk-titel { margin-top: 8px; }
.geteilt .vk-karte { max-width: 420px; background: #F0FFA6; border-radius: 12px; padding: 22px 22px 24px; box-sizing: border-box; color: #000027;
  font-family: Karla_400Regular, sans-serif; }
.geteilt .vk-karte a { color: #000027; }
.geteilt .vk-marke { display: flex; align-items: center; gap: 12px; }
.geteilt .vk-marke img, .geteilt .vk-kater { flex: none; width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid #000027; object-fit: cover; box-sizing: border-box; }
.geteilt .vk-kater { display: inline-flex; align-items: center; justify-content: center; background: #000; }
.geteilt .vk-kater svg { width: 20px; height: 18px; }
.geteilt .vk-name { font: 500 22px/1.1 Unbounded_500Medium, sans-serif; overflow-wrap: anywhere; }
/* Ort dicht unter dem Namen (Daria, 2026-11-23) */
.geteilt .vk-kiez { font-size: 13px; line-height: 1.3; margin-top: 1px; }
.geteilt .vk-zeilen { display: grid; gap: 14px; margin-top: 20px; }
.geteilt .vk-zeilen:empty { display: none; }
.geteilt .vk-lb { margin: 0 0 6px; font: 500 8px/1 Unbounded_500Medium, sans-serif; letter-spacing: .08em; text-transform: uppercase; }
.geteilt .vk-v { font-size: 14px; line-height: 1.45; white-space: pre-line; overflow-wrap: anywhere; }
.geteilt .vk-chips { display: flex; flex-flow: row wrap; gap: 6px; }
.geteilt .vk-chips span { border: 1.5px solid #000027; border-radius: 999px; padding: 4px 9px; font: 500 12px/1.1 Karla_500Medium, sans-serif; }
.geteilt .vk-links { display: flex; flex-direction: column; gap: 2px; }
/* Knöpfe untereinander, gleich breit und hoch (Daria, 2026-11-23) */
.geteilt .vk-knoepfe { display: flex; flex-direction: column; gap: 12px; max-width: 420px; margin: 24px 0 40px; }
.geteilt .vk-k { display: flex; align-items: center; justify-content: center; width: 100%; box-sizing: border-box; min-height: 50px; padding: 13px 20px;
  border: 1.5px solid var(--text); border-radius: 999px; background: none; color: var(--text); font: 500 16px/1.25 Inter, sans-serif;
  letter-spacing: .01em; text-align: center; text-decoration: none; cursor: pointer; }
.geteilt .vk-k.haupt { background: var(--text); color: var(--bg); }
.geteilt .vk-k[aria-expanded="true"] { background: var(--surface); border-color: var(--surface); border-radius: 14px 14px 0 0; margin-bottom: -12px; }
.geteilt .vk-unter, .geteilt .vk-hinweis { font-size: 14px; color: var(--muted); text-align: center; margin: -4px 0 4px; }
.geteilt .vk-hinweis:empty { display: none; }
.geteilt .vk-panel { background: var(--surface); border-radius: 0 0 14px 14px; padding: 8px 18px 20px; display: flex; flex-direction: column; gap: 16px; }
.geteilt .vk-panel[hidden] { display: none; }
.geteilt .vk-panel p { margin: 0; font-size: 15px; line-height: 1.45; }
.geteilt .vk-f { display: flex; flex-direction: column; gap: 8px; font-size: 15px; font-weight: 500; }
.geteilt .vk-f small { font-weight: 400; color: var(--muted); }
.geteilt .vk-f input, .geteilt .vk-f textarea { font: 400 16px/1.3 Inter, sans-serif; padding: 12px 14px; border-radius: 12px;
  border: 1.5px solid var(--line); background: #fff; color: #161616; }
.geteilt .vk-f textarea { min-height: 70px; resize: vertical; }
.geteilt .vk-klein { font-size: 13px; color: var(--muted); text-align: center; }
.geteilt .vk-abbrechen { background: none; border: 0; padding: 8px; font: 500 15px/1.25 Inter, sans-serif; color: var(--text); text-decoration: underline; cursor: pointer; }
.geteilt .vk-qr { display: flex; justify-content: center; }
.geteilt .vk-c { display: flex; gap: 10px; align-items: flex-start; font-size: 15px; line-height: 1.4; }
.geteilt .vk-c input { width: 20px; height: 20px; margin: 1px 0 0; flex: none; accent-color: var(--text); }
.geteilt .vk-c a { color: inherit; }
.geteilt .vk-ort { align-self: flex-start; margin-top: -8px; padding: 0; border: 0; background: none; color: var(--text); font: 500 15px/1.3 Inter, sans-serif; text-decoration: underline; cursor: pointer; }
.geteilt .vk-ort:disabled { opacity: .5; }
.geteilt .vk-klein:empty { display: none; }
.geteilt .vk-falle { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
</style>
  <h2 class="sf-abschnitt vk-titel">Digitale Visitenkarte</h2>
  ${team ? `${teamHinweis('So sieht Deine Digitale Visitenkarte aus. Knöpfe, die nur für andere gedacht sind, wie Folgen oder Kontakt schicken, sind hier ausgeblendet.')}` : ''}
  ${karte(s, logo, kater)}
  <div class="vk-knoepfe">
    ${knoepfe.map((x) => knopfHtml(x.id, x.primary)).join('\n\n    ')}
  </div>
<script>
(() => {
  const teilen = document.getElementById('vk-teilen');
  const haupt = document.querySelector('[data-haupt]');
  const knoepfe = [...document.querySelectorAll('.vk-k[aria-controls]')];
  // Zahlen fürs Team (count_showcase_visit): Aufruf der Digitalen Visitenkarte und erhaltene Kontakte, ohne Kennung
  const zaehlen = (art) => {
    const ziel = ${JSON.stringify(zaehlFunktion ?? '')};
    if (!ziel) return;
    fetch(ziel, {
      method: 'POST',
      keepalive: true,
      headers: { apikey: ${JSON.stringify(schluessel ?? '')}, Authorization: 'Bearer ' + ${JSON.stringify(schluessel ?? '')}, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_slug: ${JSON.stringify(s.slug)}, p_kind: art }),
    }).catch(() => {});
  };
  // Das Team zählt nicht mit
  if (${JSON.stringify(!team)}) zaehlen('card');
  // Eine Option aufgeklappt: Der Hauptknopf tritt als Secondary-Knopf zurück (Daria, 2026-11-23)
  // Aufklappen (UX-Regeln, 2026-11-23): Das Panel scrollt ganz ins Bild, ein Formular bekommt den Fokus im ersten
  // Feld. „Abbrechen“ schließt es und verwirft die Eingaben, „Schließen“ klappt den QR-Code zu.
  const zeigen = (k, auf) => {
    for (const x of knoepfe) {
      x.setAttribute('aria-expanded', 'false');
      document.getElementById(x.getAttribute('aria-controls')).hidden = true;
    }
    if (auf) {
      k.setAttribute('aria-expanded', 'true');
      const p = document.getElementById(k.getAttribute('aria-controls'));
      p.hidden = false;
      const feld = p.querySelector('input:not([type=hidden]):not([type=checkbox]):not(.vk-falle), textarea');
      if (feld) feld.focus({ preventScroll: true });
      requestAnimationFrame(() => p.scrollIntoView({ behavior: 'smooth', block: feld ? 'start' : 'end' }));
    }
    if (haupt) haupt.classList.toggle('haupt', !auf);
  };
  for (const k of knoepfe) k.addEventListener('click', () => zeigen(k, k.getAttribute('aria-expanded') !== 'true'));
  for (const z of document.querySelectorAll('[data-zu]')) {
    z.addEventListener('click', () => {
      const p = z.closest('.vk-panel');
      if (p.tagName === 'FORM') p.reset();
      for (const h of p.querySelectorAll('[data-hinweis], [data-ort-hinweis]')) h.textContent = '';
      const k = knoepfe.find((x) => x.getAttribute('aria-controls') === p.id);
      if (k) {
        zeigen(k, false);
        k.focus({ preventScroll: true });
      }
    });
  }
  // Teilen über das Menü des Geräts (AirDrop, Quick Share, Messenger); ohne Menü den Link kopieren
  const link = ${JSON.stringify(visitenkarteLink(s.slug))};
  const hinweis = document.getElementById('vk-teilen-hinweis');
  teilen.addEventListener('click', async () => {
    hinweis.textContent = '';
    if (navigator.share) {
      try { await navigator.share({ title: ${JSON.stringify(s.name)}, text: ${JSON.stringify(`Digitale Visitenkarte von ${s.name}`)}, url: link }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(link); hinweis.textContent = 'Link kopiert.'; }
    catch { hinweis.textContent = link; }
  });
  // Per Mail (Edge Function visitenkarte-mail, Daria, 2026-11-17)
  const form = document.getElementById('vk-p-mail');
  const status = form.querySelector('[data-hinweis]');
  const texte = {
    email: 'Bitte prüfe die Mail-Adresse.',
    name: 'Beim Vornamen gehen nur Buchstaben, höchstens 30.',
    limit: 'Für heute sind genug Mails verschickt. Bitte morgen erneut versuchen.',
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const to = form.elements.to.value.trim();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(to)) { status.textContent = texte.email; return; }
    const senden = form.querySelector('button[type="submit"]');
    senden.disabled = true;
    status.textContent = 'Wird verschickt …';
    try {
      const res = await fetch(${JSON.stringify(mailFunktion)}, {
        method: 'POST',
        headers: { apikey: ${JSON.stringify(schluessel)}, 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: ${JSON.stringify(s.slug)}, to, from: form.elements.from ? form.elements.from.value : '', website: form.elements.website.value }),
      });
      const r = await res.json().catch(() => ({}));
      if (r.ok) { status.textContent = 'Die Digitale Visitenkarte ist unterwegs an ' + to + '.'; form.elements.to.value = ''; }
      else status.textContent = texte[r.error] ?? 'Das hat nicht geklappt. Bitte gleich erneut versuchen.';
    } catch {
      status.textContent = 'Keine Verbindung. Bitte gleich erneut versuchen.';
    } finally {
      senden.disabled = false;
    }
  });
  // Ort der Begegnung automatisch (Daria, 2026-11-23): nur nach Tippen auf den Knopf. Der Browser fragt nach dem
  // Standort; den auf etwa 100 m gerundeten Punkt übersetzt Nominatim von OpenStreetMap in einen Ort wie in der
  // Web-App (src/data/location.ts). Das Feld bleibt änderbar, gespeichert wird nur, was darin steht.
  const ortKnopf = document.querySelector('[data-ort]');
  if (ortKnopf) {
    const ortHinweis = document.querySelector('[data-ort-hinweis]');
    const ortFeld = document.querySelector('#vk-p-speichern input[name="ort"]');
    ortKnopf.addEventListener('click', () => {
      if (!navigator.geolocation) { ortHinweis.textContent = 'Dein Browser kann den Standort nicht ermitteln.'; return; }
      ortKnopf.disabled = true;
      ortHinweis.textContent = 'Ort wird ermittelt …';
      navigator.geolocation.getCurrentPosition(async (p) => {
        try {
          const lat = p.coords.latitude.toFixed(3), lon = p.coords.longitude.toFixed(3);
          const res = await fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&addressdetails=1&accept-language=de&lat=' + lat + '&lon=' + lon);
          const r = await res.json();
          const a = r.address || {};
          const gegend = a.suburb || a.city_district || a.quarter || a.city || a.town || a.village || '';
          const ort = [r.name || a.road || '', gegend].filter(Boolean).filter((x, i, l) => l.indexOf(x) === i).join(', ');
          if (ort) { ortFeld.value = ort.slice(0, 120); ortHinweis.textContent = ''; }
          else ortHinweis.textContent = 'Kein Ort gefunden. Bitte von Hand eintragen.';
        } catch {
          ortHinweis.textContent = 'Kein Ort gefunden. Bitte von Hand eintragen.';
        } finally {
          ortKnopf.disabled = false;
        }
      }, () => {
        ortKnopf.disabled = false;
        ortHinweis.textContent = 'Ohne Standortfreigabe bitte von Hand eintragen.';
      }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
    });
  }
  // Kontakt schicken und Kontakte tauschen (Daria, 2026-11-23): dieselbe Edge Function mit art 'kontakt'
  const kontaktTexte = {
    email: 'Bitte prüfe die Mail-Adresse.',
    name: 'Bitte trage Deinen Namen ein.',
    phone: 'Bitte prüfe die Telefonnummer.',
    consent: 'Bitte bestätige die Einwilligung.',
    limit: 'Für heute sind genug Kontakte verschickt. Bitte morgen erneut versuchen.',
    no_contact: 'Dieses Schaufenster hat keine Kontakt-Mail.',
  };
  for (const f of document.querySelectorAll('.vk-kontakt')) {
    const hinweis = f.querySelector('[data-hinweis]');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const el = f.elements;
      const email = el.email.value.trim();
      if (!el.name.value.trim()) { hinweis.textContent = kontaktTexte.name; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { hinweis.textContent = kontaktTexte.email; return; }
      if (!el.einwilligung.checked) { hinweis.textContent = kontaktTexte.consent; return; }
      const karte = el.karte.type === 'checkbox' ? el.karte.checked : true;
      const senden = f.querySelector('button[type="submit"]');
      senden.disabled = true;
      hinweis.textContent = 'Wird verschickt …';
      try {
        const res = await fetch(${JSON.stringify(mailFunktion)}, {
          method: 'POST',
          headers: { apikey: ${JSON.stringify(schluessel)}, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: ${JSON.stringify(s.slug)}, art: 'kontakt', name: el.name.value, email,
            phone: el.phone ? el.phone.value : '', ort: el.ort.value, nachricht: el.nachricht ? el.nachricht.value : '',
            karte, einwilligung: true, website: el.website.value,
          }),
        });
        const r = await res.json().catch(() => ({}));
        if (r.ok) {
          zaehlen('contact');
          hinweis.textContent = r.karte === false
            ? ${JSON.stringify(`${s.name} hat Deinen Kontakt erhalten. Die Digitale Visitenkarte konnte nicht verschickt werden.`)}
            : karte
              ? ${JSON.stringify(`${s.name} hat Deinen Kontakt erhalten. Die Digitale Visitenkarte ist unterwegs an `)} + email + '.'
              : ${JSON.stringify(`${s.name} hat Deinen Kontakt erhalten.`)};
          f.reset();
        } else hinweis.textContent = kontaktTexte[r.error] ?? 'Das hat nicht geklappt. Bitte gleich erneut versuchen.';
      } catch {
        hinweis.textContent = 'Keine Verbindung. Bitte gleich erneut versuchen.';
      } finally {
        senden.disabled = false;
      }
    });
  }
})();
</script>`;
}
