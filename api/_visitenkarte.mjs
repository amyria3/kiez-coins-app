// Eigene Ansicht der Visitenkarte: kiezcoins.de/s/<kurzname>/visitenkarte (Daria, 2026-11-23).
//
// Die Schaufenster-Seite zeigt nur noch die Karte und „Visitenkarte öffnen“. Diese Ansicht zeigt die Karte ohne
// Instant-Code, dafür mit Kompetenzen & Services, Adresse, Öffnungszeiten und Kontakt (Entwurf C + D), darunter die
// Knöpfe untereinander. Ist eine Option aufgeklappt, wird „Visitenkarte teilen“ zum Secondary-Knopf (Daria, 2026-11-23).
//
// Wer über den Instant-Code der gedruckten Karte kommt (?via=karte), hat die Person getroffen. Nur dann fragt
// „In Kontakte speichern“ nach dem Ort der Begegnung (Daria, 2026-11-23). „In Kontakte speichern“ liefert eine vCard
// (POST /s/<kurzname>/kontakt.vcf). Ort und Notiz gehen im Formular mit, nicht in der Adresse, damit sie in keinem
// Protokoll landen. KiezCoins speichert sie nicht.
//
// Drucken und Herunterladen gibt es hier nicht: Das Team findet beides in der App unter „Schaufenster › Visitenkarte“
// (Daria, 2026-11-23: „Herunterladen und PDF nur auf Desktop und für mich selbst“).
// Noch offen (Teil 2): „Deinen Kontakt schicken“, „Kontakte tauschen“ und die Ansicht der Eigentümerin.

// Nur der Kern von qrcode (ohne PNG-Ausgabe und fs), so läuft das Modul auch gebündelt in den Tests
import QRCode from 'qrcode/lib/core/qrcode.js';

import { icsFold, icsText } from './_kalender.mjs';

const SITE = 'https://kiezcoins.de';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const kurzLink = (url) => String(url).replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

/** Ziel des Instant-Codes: die Ansicht mit Kennung der persönlichen Begegnung */
export const visitenkarteLink = (slug) => `${SITE}/s/${slug}/visitenkarte`;
export const karteQrLink = (slug) => `${visitenkarteLink(slug)}?via=karte`;

/** Services ohne Auszeichnung, eine Zeile je Eintrag (Aufzählungszeichen, **fett** und *kursiv* fallen weg) */
export function serviceListe(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/^\s*[-•·]\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').trim())
    .filter(Boolean);
}

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

/** Instant-Code als SVG, für „QR-Code zeigen“ */
function qrSvg(url) {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const rand = 2;
  let pfad = '';
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (qr.modules.get(r, c)) pfad += `M${c + rand} ${r + rand}h1v1h-1z`;
  const g = n + rand * 2;
  return `<svg viewBox="0 0 ${g} ${g}" width="220" height="220" role="img" aria-label="QR-Code zu dieser Visitenkarte" shape-rendering="crispEdges"><rect width="${g}" height="${g}" fill="#fff"/><path d="${pfad}" fill="#000027"/></svg>`;
}

function karte(s, logo, kater) {
  const services = serviceListe(s.services);
  const website = (s.links ?? []).find((l) => /^https:\/\//i.test(l));
  const zeile = (titel, wert) => `<div><p class="vk-lb">${titel}</p>${wert}</div>`;
  return `<div class="vk-karte">
    <div class="vk-marke">${logo ? `<img src="${esc(logo)}" alt="">` : `<span class="vk-kater">${kater}</span>`}SCHAUFENSTER</div>
    <div class="vk-name">${esc(s.name)}</div>
    ${s.kiez ? `<div class="vk-kiez">${esc(s.kiez)}</div>` : ''}
    <div class="vk-zeilen">
      ${services.length ? zeile('Kompetenzen &amp; Services', `<div class="vk-chips">${services.map((x) => `<span>${esc(x)}</span>`).join('')}</div>`) : ''}
      ${s.address?.trim() ? zeile('Adresse', `<div class="vk-v">${esc(s.address.trim())}</div>`) : ''}
      ${s.opening_hours?.trim() ? zeile('Öffnungszeiten', `<div class="vk-v">${esc(s.opening_hours.trim())}</div>`) : ''}
      ${s.email?.trim() || website ? zeile('Kontakt', `<div class="vk-v">${[s.email?.trim() ? `<a href="mailto:${esc(s.email.trim())}">${esc(s.email.trim())}</a>` : '', website ? `<a href="${esc(website)}" rel="noopener nofollow">${esc(kurzLink(website))}</a>` : ''].filter(Boolean).join('<br>')}</div>`) : ''}
    </div>
  </div>`;
}

/**
 * Inhalt der Ansicht. `via` ist „karte“, wenn die Person über den Instant-Code gekommen ist.
 * `mailFunktion` und `schluessel` für „Per Mail schicken“ (Edge Function visitenkarte-mail).
 */
export function visitenkarteAnsicht(s, { via, logo, kater, mailFunktion, schluessel }) {
  const begegnung = via === 'karte';
  const app = `https://app.kiezcoins.de/schaufenster/${encodeURIComponent(s.id)}?folgen=1`;
  return `<style>
@font-face { font-family: Unbounded_500Medium; font-display: swap; src: url(/fonts/Unbounded_500Medium.ttf) format('truetype'); }
@font-face { font-family: Karla_400Regular; font-display: swap; src: url(/fonts/Karla_400Regular.ttf) format('truetype'); }
@font-face { font-family: Karla_500Medium; font-display: swap; src: url(/fonts/Karla_500Medium.ttf) format('truetype'); }
.geteilt .vk-zurueck { display: inline-block; font-size: 16px; color: var(--text); text-decoration: none; margin: 4px 0 20px; }
.geteilt .vk-karte { max-width: 420px; background: #F0FFA6; border-radius: 12px; padding: 22px 22px 24px; box-sizing: border-box; color: #000027;
  font-family: Karla_400Regular, sans-serif; }
.geteilt .vk-karte a { color: #000027; }
.geteilt .vk-marke { display: flex; align-items: center; gap: 8px; font: 500 9px/1 Unbounded_500Medium, sans-serif; letter-spacing: .06em; }
.geteilt .vk-marke img, .geteilt .vk-kater { width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid #000027; object-fit: cover; box-sizing: border-box; }
.geteilt .vk-kater { display: inline-flex; align-items: center; justify-content: center; background: #000; }
.geteilt .vk-kater svg { width: 20px; height: 18px; }
.geteilt .vk-name { font: 500 24px/1.1 Unbounded_500Medium, sans-serif; margin-top: 18px; overflow-wrap: anywhere; }
.geteilt .vk-kiez { font-size: 12px; margin-top: 4px; }
.geteilt .vk-zeilen { display: grid; gap: 14px; margin-top: 20px; }
.geteilt .vk-zeilen:empty { display: none; }
.geteilt .vk-lb { margin: 0 0 6px; font: 500 8px/1 Unbounded_500Medium, sans-serif; letter-spacing: .08em; text-transform: uppercase; }
.geteilt .vk-v { font-size: 14px; line-height: 1.45; white-space: pre-line; overflow-wrap: anywhere; }
.geteilt .vk-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.geteilt .vk-chips span { border: 1.5px solid #000027; border-radius: 999px; padding: 5px 10px; font: 500 12px/1.1 Karla_500Medium, sans-serif; }
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
.geteilt .vk-qr { display: flex; justify-content: center; }
.geteilt .vk-falle { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
</style>
  <a class="vk-zurueck" href="/s/${esc(s.slug)}">‹ ${esc(s.name)}</a>
  <h2 class="sf-abschnitt">Visitenkarte</h2>
  ${karte(s, logo, kater)}
  <div class="vk-knoepfe">
    <button type="button" class="vk-k haupt" id="vk-teilen">Visitenkarte teilen</button>
    <p class="vk-unter">AirDrop, Quick Share, Messenger</p>
    <p class="vk-hinweis" id="vk-teilen-hinweis" role="status"></p>

    <button type="button" class="vk-k" aria-expanded="false" aria-controls="vk-p-speichern">In Kontakte speichern</button>
    <form class="vk-panel" id="vk-p-speichern" method="post" action="/s/${esc(s.slug)}/kontakt.vcf" hidden>
      <p>${begegnung ? 'Ort und Notiz werden im Kontakt gespeichert.' : 'Die Notiz wird im Kontakt gespeichert.'}</p>
      ${begegnung ? '<label class="vk-f"><span>Wo habt Ihr Euch getroffen? <small>optional</small></span><input name="ort" maxlength="120" placeholder="z. B. Flohmarkt am Kanal"></label>' : ''}
      <label class="vk-f"><span>Notiz für Dich <small>optional</small></span><textarea name="notiz" maxlength="500" placeholder="Notiz"></textarea></label>
      <button type="submit" class="vk-k haupt">Kontakt sichern</button>
      <p class="vk-klein">Das Datum wird automatisch ergänzt. ${begegnung ? 'Ort und Notiz stehen' : 'Die Notiz steht'} nur in Deinem Adressbuch.</p>
    </form>

    <button type="button" class="vk-k" aria-expanded="false" aria-controls="vk-p-qr">QR-Code zeigen</button>
    <div class="vk-panel" id="vk-p-qr" hidden>
      <p>Mit der Kamera scannen, um diese Visitenkarte zu öffnen.</p>
      <div class="vk-qr">${qrSvg(karteQrLink(s.slug))}</div>
    </div>

    <button type="button" class="vk-k" aria-expanded="false" aria-controls="vk-p-mail">Per Mail schicken</button>
    <form class="vk-panel" id="vk-p-mail" novalidate hidden>
      <label class="vk-f"><span>An welche Adresse?</span><input type="email" name="to" autocomplete="email" required maxlength="254" placeholder="name@beispiel.de"></label>
      <label class="vk-f"><span>Dein Vorname <small>optional, steht in der Mail</small></span><input type="text" name="from" autocomplete="given-name" maxlength="30"></label>
      <input class="vk-falle" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button type="submit" class="vk-k haupt">Visitenkarte schicken</button>
      <p class="vk-klein" role="status" data-hinweis></p>
      <p class="vk-klein">KiezCoins nutzt die Adresse nur für diese eine Mail und speichert sie nicht.</p>
    </form>

    <a class="vk-k" href="${esc(app)}">${esc(s.name)} in KiezCoins folgen</a>
  </div>
<script>
(() => {
  const teilen = document.getElementById('vk-teilen');
  const knoepfe = [...document.querySelectorAll('.vk-k[aria-controls]')];
  // Eine Option aufgeklappt: „Teilen“ tritt als Secondary-Knopf zurück (Daria, 2026-11-23)
  for (const k of knoepfe) {
    k.addEventListener('click', () => {
      const auf = k.getAttribute('aria-expanded') !== 'true';
      for (const x of knoepfe) {
        x.setAttribute('aria-expanded', 'false');
        document.getElementById(x.getAttribute('aria-controls')).hidden = true;
      }
      if (auf) {
        k.setAttribute('aria-expanded', 'true');
        document.getElementById(k.getAttribute('aria-controls')).hidden = false;
      }
      teilen.classList.toggle('haupt', !auf);
    });
  }
  // Teilen über das Menü des Geräts (AirDrop, Quick Share, Messenger); ohne Menü den Link kopieren
  const link = ${JSON.stringify(visitenkarteLink(s.slug))};
  const hinweis = document.getElementById('vk-teilen-hinweis');
  teilen.addEventListener('click', async () => {
    hinweis.textContent = '';
    if (navigator.share) {
      try { await navigator.share({ title: ${JSON.stringify(s.name)}, text: ${JSON.stringify(`Visitenkarte von ${s.name}`)}, url: link }); return; }
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
        body: JSON.stringify({ slug: ${JSON.stringify(s.slug)}, to, from: form.elements.from.value, website: form.elements.website.value }),
      });
      const r = await res.json().catch(() => ({}));
      if (r.ok) { status.textContent = 'Die Visitenkarte ist unterwegs an ' + to + '.'; form.elements.to.value = ''; }
      else status.textContent = texte[r.error] ?? 'Das hat nicht geklappt. Bitte gleich erneut versuchen.';
    } catch {
      status.textContent = 'Keine Verbindung. Bitte gleich erneut versuchen.';
    } finally {
      senden.disabled = false;
    }
  });
})();
</script>`;
}
