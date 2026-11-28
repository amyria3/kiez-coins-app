// Öffentliche Seite eines Schaufensters: kiezcoins.de/s/<kurzname> (Daria, 2026-11-10).
//
// vercel.json leitet /s/:slug hierher. Die Funktion holt das Schaufenster über die Datenbankfunktion public_showcase
// (Migration 20261110000500_termin_herzen.sql) und füllt die Vorlage /teilen-vorlage wie die geteilten Posts (api/c.mjs).
// Nur Schaufenster mit Sichtbarkeit „Alle“ haben eine Seite. Termine lassen sich hier ohne Konto liken: einfacher
// Zähler (Daria: „Einfacher Zähler“), das Gerät merkt sich im Browser, welche Termine es geliked hat.

import { hatTermine, schaufensterKalender } from './_kalender.mjs';
import { buchungsLink } from './_buchung.mjs';
import { contactGroups, shortUrl, socialLink, telLink } from '../src/data/digitalCard.mjs';
import { cleanPaymentLinks } from '../src/data/paymentLinks.mjs';
import { anfahrtLink, hatPunkt, KARTE_B, KARTE_H, karteGross, kartenKacheln } from './_karte.mjs';
import { oeffnungszeiten } from './_oeffnungszeiten.mjs';
import { appVisitenkarte, serviceListe, teamHinweis, vcard, vorschauSeite } from './_visitenkarte.mjs';
import { BILD_B, BILD_H, bildBaum, bildText } from './_visitenkarte-bild.mjs';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://aqxzxpxrshizlaqyjplw.supabase.co';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_WqrL7Y7Wm0l9cq4tHQpjAQ_iooAaNe0';
const SLUG = /^[a-z0-9][a-z0-9-]{2,39}$/;
// Feste Adresse für Suchmaschinen (canonical, JSON-LD), auch wenn die Seite über kiezcoins.vercel.app aufgerufen wird
const SITE = 'https://kiezcoins.de';

// Lange Wörter im Namen („Sachsenbrücke“) passten neben dem Logo nicht in die Zeile und liefen links aus dem Bild
// (Daria, 2026-11-17). Die Schrift wird nach dem längsten Wort kleiner, höchstens 32 px, mindestens 20 px.
const titelGroesse = (name) => {
  const laengstes = Math.max(1, ...String(name ?? '').split(/\s+/).map((w) => w.length));
  return `font-size: clamp(20px, ${Math.min(8.5, 78 / laengstes).toFixed(2)}vw, 32px)`;
};

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Private Fotos (`<ordner>/p_<datei>`, Migration 20261116000100) haben keine öffentliche Adresse: dann ohne Bild
const foto = (path) =>
  path && !(path.split('/')[1] ?? '').startsWith('p_')
    ? `${SUPABASE_URL}/storage/v1/object/public/photos/${path.split('/').map(encodeURIComponent).join('/')}`
    : null;

const kurz = (text, max) => {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
};

// Services: formatierbarer Text mit denselben Regeln wie in der App (src/data/richText.ts):
// **fett**, *kursiv*, „- “ am Zeilenanfang für eine Liste, Leerzeile für einen neuen Absatz
const inline = (line) =>
  esc(line)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
function richHtml(value) {
  const out = [];
  let list = null;
  let para = null;
  for (const line of String(value ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.trim()) {
      list = para = null;
      continue;
    }
    const bullet = line.match(/^\s*[-•]\s+(.*)$/);
    if (bullet) {
      para = null;
      if (!list) out.push((list = []));
      list.push(`<li>${inline(bullet[1])}</li>`);
    } else {
      list = null;
      if (!para) out.push((para = { lines: [] }));
      para.lines.push(inline(line));
    }
  }
  return out.map((b) => (Array.isArray(b) ? `<ul>${b.join('')}</ul>` : `<p>${b.lines.join('<br>')}</p>`)).join('');
}

// Eigene Hintergrundfarbe (showcases.bg_color, Daria, 2026-11-10). Die Schrift wird nach der Helligkeit dunkel oder
// hell, damit alles lesbar bleibt. Ohne Farbe bleibt der Standard der Seite.
function farbe(hex) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex ?? '')) return '';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const hell = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) > 0.35;
  const vars = hell
    ? '--text: #26233A; --muted: #4A465E; --surface: #FFFFFF; --line: rgba(38,35,58,.10); --purple: #5260E0; --red: #D6334A;'
    : '--text: #F0F0F0; --muted: #C8C8D0; --surface: rgba(255,255,255,.08); --line: rgba(240,240,240,.14); --purple: #A9B4FF; --red: #FF7E8B;';
  // :root:root schlägt die Variablen auf :root in seite.css
  return `:root:root { --bg: ${hex}; ${vars} background: ${hex} !important; background-image: none !important; color: var(--text); }`;
}

// Darias Herz aus der App (src/components/icons/svgs.ts)
const HERZ = '<svg width="22" height="22" aria-hidden="true" viewBox="0 0 35 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.13 19.80C4.69 17.98 4.69 17.99 4.65 17.83C3.49 14.30 3.44 13.36 3.30 11.33C3.04 7.67 2.67 7.39 3.59 4.23C3.92 3.08 4.60 2.44 4.72 2.32C5.96 1.15 6.98 -0.30 9.13 0.05C10.96 0.36 12.37 0.31 14.39 4.99C15.25 7.07 15.19 7.09 15.83 9.28C15.89 9.33 16.46 9.93 16.66 9.83C16.90 9.70 18.20 7.62 19.14 6.42C19.97 5.46 20.05 5.58 20.82 4.54C22.05 3.22 22.69 2.64 24.45 1.85C26.70 0.85 28.13 1.21 28.18 1.22C31.63 1.91 31.76 4.45 32.00 6.19C32.04 9.58 31.44 11.07 30.64 13.39C30.07 15.02 29.92 14.91 29.21 16.45C28.12 18.81 28.02 18.73 26.22 21.23C23.40 25.09 23.40 25.08 23.16 25.43C21.83 27.32 20.67 28.37 20.20 28.98C18.92 30.63 18.79 30.67 17.36 32.14C16.65 32.77 16.24 33.16 16.15 33.25C11.83 37.38 10.06 33.12 9.41 31.48C7.05 26.17 7.44 25.98 5.13 19.80Z M 19.91,20.47 C 18.90,19.97 18.22,20.78 19.16,21.92 C 19.56,22.40 20.56,23.58 21.84,23.72 C 22.47,23.78 22.41,23.13 22.37,23.03 C 22.34,22.94 22.32,22.89 21.59,22.01 C 21.48,21.87 20.61,20.82 19.91,20.47 M 17.38,22.29 C 17.05,22.52 16.36,23.45 17.95,24.71 C 17.97,24.74 17.98,24.72 18.29,24.95 C 18.58,25.18 18.56,25.19 18.82,25.44 C 18.90,25.51 18.94,25.59 19.02,25.67 C 20.09,26.68 21.24,25.72 20.23,24.35 C 19.85,23.83 18.82,22.62 18.39,22.40 C 17.86,22.11 17.42,22.25 17.38,22.29 M 20.97,17.81 C 20.20,18.15 21.16,19.04 21.17,19.06 C 22.09,20.04 22.26,20.16 22.38,20.22 C 23.72,21.10 24.26,20.67 23.97,20.03 C 23.53,19.10 23.47,19.13 23.37,19.03 C 22.74,18.48 22.78,18.44 22.14,17.90 C 21.69,17.51 21.05,17.78 20.97,17.81 M 14.44,25.29 C 14.11,25.88 15.07,26.21 16.07,27.58 C 16.13,27.68 16.47,28.14 17.20,28.41 C 17.81,28.63 18.45,27.85 18.12,26.91 C 17.78,25.91 17.09,25.72 16.94,25.45 C 16.84,25.25 16.82,25.06 16.71,24.87 C 16.66,24.81 16.54,24.80 16.51,24.74 C 16.45,24.88 16.42,24.86 16.37,24.99 C 16.31,25.17 16.35,25.19 16.34,25.19 C 16.28,25.21 16.23,25.09 16.16,25.06 C 16.09,25.02 16.01,25.04 15.94,25.02 C 15.88,24.99 15.83,24.94 15.76,24.91 C 14.85,24.58 14.50,25.20 14.44,25.29 M 23.08,15.69 C 22.20,15.15 21.70,15.48 22.15,16.28 C 22.63,17.10 22.93,18.11 24.17,18.03 C 24.66,18.00 24.90,17.90 24.69,17.31 C 24.35,16.42 23.80,16.20 23.31,15.84 C 23.23,15.80 23.16,15.74 23.08,15.69" fill-rule="evenodd" clip-rule="evenodd" fill="currentColor"/></svg>';

// Platzhalter für leere Schaufenster (Daria, 2026-11-11): Verlauf statt Titelbild, schwarzer Kreis mit Darias
// Kater-Maske (Cat-Avatar-Mask.svg) statt Logo, graue Zeilen für fehlende Angaben, ein erster Post zum Ansehen.
// Die App zeigt dasselbe (src/components/ShowcasePlaceholder.tsx).
const KATER = '<svg width="36" height="32" aria-hidden="true" viewBox="0 0 35 31" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M29.8389 4.32385C30.2718 4.51386 30.6554 4.74222 30.9434 5.01624C32.2062 6.21818 32.5338 6.31956 32.9248 6.68616C33.8973 7.59812 34.1006 9.62071 34.1006 11.3531C34.1006 15.5488 34.0681 14.3748 34.0869 16.9537C34.1004 18.81 34.1005 21.6209 31.6338 24.7985C23.8527 29.9038 21.9208 30.116 15.3193 30.0006L12.0439 29.8278C8.81613 29.0959 8.63087 29.6764 4.41895 26.6461C2.03591 24.282 2.1456 24.2364 1.42871 23.3541C-0.109269 20.2796 0.0537125 19.6386 0.0537109 14.9225C0.0536608 12.0929 -0.415933 9.49597 1.42871 7.37659L3.24023 5.79651L3.55273 1.68713L8.52539 2.83655C13.2778 1.69417 19.3517 2.45528 22.7344 2.99963L29.8389 0.0201416V4.32385ZM17.4287 19.9996V25.6403C17.0274 25.6499 14.9325 25.0144 14.4238 24.7799L13.5 26.4996C14.0792 26.7912 15.2601 27.3747 16.4121 27.6696C17.1297 27.8532 17.1206 27.7815 18.3096 27.6608C18.8564 27.4785 21.8033 27.0677 22.5 25.9996L21.5742 24.8951L18.3096 25.6403L18.1396 19.444L17.4287 19.9996ZM11.3252 10.5641C10.5048 10.504 8.81272 9.98065 7.48145 10.8131C6.65543 11.5079 6.67591 11.5295 6.4082 11.7975C5.70135 12.7796 5.67338 12.7945 5.48633 13.9449C5.2902 15.1509 6.00632 15.9637 6.16113 16.6969L14.1787 16.6276C14.892 15.7542 15.2723 15.579 15.0137 14.2301C14.1321 11.8204 13.5238 11.3916 12.0664 10.8131L11.3252 10.5641ZM26.8262 10.7799C25.6015 9.98107 24.0714 10.4465 23.3262 10.4908L22.6562 10.7135C21.34 11.2341 20.7935 11.6264 20.0312 13.8707C19.8182 15.1305 20.1677 15.3 20.8311 16.1285L28.125 16.3112C28.2536 15.6265 28.8918 14.8746 28.6934 13.7418C28.5043 12.6619 28.4786 12.6478 27.8193 11.7174C27.5714 11.4625 27.5892 11.4429 26.8262 10.7799Z" fill="#F0F0F0"/></svg>';
// Neutraler Look der öffentlichen Seite (Daria, 2026-11-12: „neutral, yet modern and a little bit elegant“):
// warmes Weiß, fast schwarze Schrift, feine Linien, kleine Überschriften in Versalien, viel Luft.
const NEUTRAL = `:root:root { --bg: #F7F7F4; --text: #161616; --muted: #6F6F6A; --surface: #FFFFFF; --line: rgba(22,22,22,.10);
  --purple: #161616; background: #F7F7F4 !important; background-image: none !important; color: var(--text); }
.geteilt .sf-verlauf { background: linear-gradient(135deg, #ECECE6 0%, #E1E1DA 100%) !important; }`;

// Alter Kurzname: aktueller Kurzname des Schaufensters (Migration 20261111000200), sonst null
async function neuerKurzname(slug) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_showcase_redirect`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_slug: slug }),
  });
  if (!res.ok) return null;
  const neu = await res.json();
  return typeof neu === 'string' && SLUG.test(neu) && neu !== slug ? neu : null;
}

async function ladeSchaufenster(slug) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_showcase`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_slug: slug }),
  });
  if (!res.ok) return null;
  const s = await res.json();
  if (s?.id) s.freunde = await nimmtFreunde(s.id);
  return s;
}

// Knopf „Mit … anfreunden“ (Daria, 2026-11-17: „mit der Person gleich nach dem Scannen anfreunden“): nur bei
// eingeschaltetem Schalter im Schaufenster (Migration 20261117000500)
async function nimmtFreunde(id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/showcase_accepts_friends`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_showcase: id }),
    });
    return res.ok && (await res.json()) === true;
  } catch {
    return false;
  }
}

// Zeiten in deutscher Ortszeit, da die Seite auf dem Server entsteht
const ZONE = 'Europe/Berlin';
// „Mi, 11.11.“ wie in der App (Intl schreibt „Mi., 11.11.“)
const tag = (iso) =>
  new Intl.DateTimeFormat('de-DE', { timeZone: ZONE, weekday: 'short', day: '2-digit', month: '2-digit' })
    .format(new Date(iso))
    .replace('.,', ',');
const uhr = (iso) => new Intl.DateTimeFormat('de-DE', { timeZone: ZONE, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
function wann(e) {
  if (!e.ends_at) return `${tag(e.starts_at)} um ${uhr(e.starts_at)}`;
  if (tag(e.ends_at) === tag(e.starts_at)) return `${tag(e.starts_at)} von ${uhr(e.starts_at)} bis ${uhr(e.ends_at)}`;
  return `${tag(e.starts_at)} ${uhr(e.starts_at)} bis ${tag(e.ends_at)} ${uhr(e.ends_at)}`;
}

// Titel für Suchmaschinen: Name und Kiez, damit „Bäckerei Neukölln“ trifft (Daria, 2026-11-10: SEO für Kleingewerbe)
// Eigene Angaben aus dem Abschnitt „In Suchmaschinen“ gehen vor (seo_title, seo_description, Daria, 2026-11-11).
// Die App zeigt im Editor dieselben automatischen Texte als Vorschau (bearbeiten.tsx, autoTitle, autoDescription).
const titelVon = (s) => kurz(s.seo_title, 70) || `${s.name}${s.kiez ? ` in ${s.kiez}` : ''} – KiezCoins`;
const beschreibungVon = (s) =>
  kurz(s.seo_description, 200) ||
  kurz(s.about, 160) ||
  `${s.name}${s.kiez ? ` in ${s.kiez}` : ''}: Termine, Neuigkeiten und Infos bei KiezCoins.`;

// Strukturierte Daten (schema.org) für Google: das Geschäft als LocalBusiness, Termine als Event.
// Öffnungszeiten stehen als freier Text in der App; api/_oeffnungszeiten.mjs übersetzt die üblichen Schreibweisen ins
// Format von schema.org, bei unklarem Text fehlen sie. Dazu der Kartenpunkt (Daria, 2026-11-18: Google Business Profile,
// Stufe 1). Google gleicht diese Angaben mit dem Unternehmensprofil ab, wenn dort die Seite als Website steht.
function jsonLd(s, url) {
  const bild = foto(s.cover_path) ?? foto(s.logo_path);
  const links = (Array.isArray(s.links) && s.links.length ? s.links : s.website ? [s.website] : []).filter((l) =>
    /^https:\/\//i.test(l),
  );
  const geschaeft = {
    '@type': 'LocalBusiness',
    '@id': `${url}#geschaeft`,
    name: s.name,
    url,
    ...(s.about ? { description: kurz(s.about, 500) } : {}),
    ...(bild ? { image: bild } : {}),
    ...(foto(s.logo_path) ? { logo: foto(s.logo_path) } : {}),
    ...(s.address ? { address: s.address } : {}),
    ...(hatPunkt(s) ? { geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng }, hasMap: karteGross(s) } : {}),
    ...(oeffnungszeiten(s.opening_hours) ? { openingHoursSpecification: oeffnungszeiten(s.opening_hours) } : {}),
    ...(s.email ? { email: s.email } : {}),
    ...(s.phone ? { telephone: s.phone } : {}),
    ...(s.kiez ? { areaServed: s.kiez } : {}),
    ...(links.length ? { sameAs: links } : {}),
  };
  const termine = (s.entries ?? [])
    .filter((x) => x.kind === 'event' && x.starts_at)
    .map((x) => ({
      '@type': 'Event',
      name: x.title,
      startDate: x.starts_at,
      ...(x.ends_at ? { endDate: x.ends_at } : {}),
      ...(x.body ? { description: kurz(x.body, 500) } : {}),
      ...(foto(x.image_path) ? { image: foto(x.image_path) } : {}),
      eventStatus: x.cancelled ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: x.location || s.name,
        address: x.location || s.address || s.kiez || s.name,
      },
      organizer: { '@id': `${url}#geschaeft` },
      url,
    }));
  const daten = { '@context': 'https://schema.org', '@graph': [geschaeft, ...termine] };
  // „<“ maskieren, damit kein Text aus dem Schaufenster das Script-Tag schließen kann
  return `<script type="application/ld+json">${JSON.stringify(daten).replace(/</g, '\\u003c')}</script>`;
}

function kopf(s, url) {
  if (!s) return '<title>Schaufenster nicht gefunden – KiezCoins</title>';
  const titel = titelVon(s);
  const beschreibung = beschreibungVon(s);
  const bild = foto(s.cover_path) ?? foto(s.logo_path);
  return [
    `<title>${esc(titel)}</title>`,
    `<meta name="description" content="${esc(beschreibung)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    '<meta property="og:site_name" content="KiezCoins">',
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="de_DE">',
    `<meta property="og:title" content="${esc(titel)}">`,
    `<meta property="og:description" content="${esc(beschreibung)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    bild ? `<meta property="og:image" content="${esc(bild)}">` : '',
    `<meta name="twitter:card" content="${bild ? 'summary_large_image' : 'summary'}">`,
    jsonLd(s, url),
  ]
    .filter(Boolean)
    .join('\n');
}

function eintrag(x) {
  const bild = foto(x.image_path);
  const img = bild ? `<img class="sf-bild" src="${esc(bild)}" alt="${esc(x.title ?? '')}" loading="lazy">` : '';
  if (x.kind === 'post') {
    const art = x.type === 'before_after' ? 'Us-Challenge' : x.type === 'individual' ? 'We-Challenge' : 'Post';
    return `<article class="sf-karte">${img}<div class="sf-inhalt">
      <p class="sf-art sf-post">${art}</p>
      ${x.title?.trim() ? `<h2>${esc(x.title)}</h2>` : ''}
      ${x.body ? `<p class="sf-text">${esc(x.body)}</p>` : ''}
      <a class="sf-link" href="https://app.kiezcoins.de/challenge/${esc(x.id)}?von=schaufenster">In KiezCoins öffnen</a>
    </div></article>`;
  }
  const n = Number(x.likes) || 0;
  return `<article class="sf-karte">${img}<div class="sf-inhalt">
      <p class="sf-art ${x.cancelled ? 'sf-abgesagt' : ''}">${x.cancelled ? 'Abgesagt' : 'Termin'}</p>
      <h2 ${x.cancelled ? 'class="sf-durch"' : ''}>${esc(x.title)}</h2>
      <p class="sf-klein">${esc(wann(x))}</p>
      ${x.location ? `<p class="sf-klein">${esc(x.location)}</p>` : ''}
      ${x.body ? `<p class="sf-text">${esc(x.body)}</p>` : ''}
      <button type="button" class="sf-herz" data-id="${esc(x.id)}" data-n="${n}" aria-pressed="false" ${x.cancelled ? 'disabled' : ''}
        aria-label="Gefällt mir">${HERZ}<span>${n || ''}</span></button>
    </div></article>`;
}

// Digitale Visitenkarte auf der Schaufenster-Seite: nur die Vorschau und „Digitale Visitenkarte öffnen“ (Daria, 2026-11-23). Die Vorschau
// ist überall dieselbe (2026-11-23): das Bild /s/<kurzname>/visitenkarte.png, das auch Messenger beim geteilten Link
// zeigen (_visitenkarte-bild.mjs). Die druckbare Karte (vorne und hinten) gibt es nur in der Verwaltung der App.
// Teilen, Speichern, QR-Code und Mail stehen auf der Karte in der Web-App; /s/<kurzname>/visitenkarte leitet dorthin
// (api/_visitenkarte.mjs). `von=schaufenster` sagt ihr, dass die Person von hier kommt. Kam sie über den QR-Code der Karte (?via=karte), geht
// die Kennung mit.
function visitenkarte(s, via, team, fassung) {
  // height: auto und object-fit: contain (2026-11-24, Bildschirmfoto von Daria): Das Bild hat width und height als
  // Attribute. Ohne height: auto galten die 630 px Höhe bei voller Breite, und `.geteilt img` (Fotos der Posts, cover)
  // schnitt die Karte riesig vergrößert zu.
  const ziel = `/s/${s.slug}/visitenkarte?von=schaufenster${via === 'karte' ? '&via=karte' : ''}${team ? '&als=team' : ''}`;
  // Die Seite zeigt die Karte zweimal (rechte Spalte am Desktop, Schluss am Handy); der Stil kommt einmal mit
  const stil = fassung === 'schmal' ? '' : `<style>
.geteilt .sf-vk { margin: 0 0 56px; max-width: 420px; }
.geteilt .sf-vk-bild { display: block; width: 100%; height: auto; object-fit: contain; aspect-ratio: ${BILD_B} / ${BILD_H}; border-radius: 10px; margin: 0 0 24px; background: #F0FFA6; }
.geteilt .sf-vk a.sf-vk-haupt { display: flex; align-items: center; justify-content: center; min-height: 50px; padding: 13px 20px; box-sizing: border-box;
  border-radius: 999px; background: var(--text); color: var(--bg); font: 500 16px/1.25 Inter, sans-serif; letter-spacing: .01em; text-decoration: none; }
</style>`;
  return `${stil}
  <h2 class="sf-abschnitt">Digitale Visitenkarte</h2>
  <section class="sf-vk" aria-label="Digitale Visitenkarte">
    <a href="${esc(ziel)}"><img class="sf-vk-bild" src="/s/${esc(s.slug)}/visitenkarte.png" width="${BILD_B}" height="${BILD_H}" loading="lazy" alt="Digitale Visitenkarte von ${esc(s.name)}"></a>
    <a class="sf-vk-haupt" href="${esc(ziel)}">Digitale Visitenkarte öffnen</a>
  </section>`;
}

/**
 * Zählt einen Aufruf fürs Team (count_showcase_visit, Migration 20261123000100, 2026-11-23): ein Skript im Browser,
 * damit Bots und Linkvorschauen ohne JavaScript nicht mitzählen und der Zwischenspeicher der Seite nicht stört.
 * Ohne Kennung, Cookie oder Speicher auf dem Gerät.
 */
function zaehlSkript(slug, art) {
  return `<script>
fetch(${JSON.stringify(`${SUPABASE_URL}/rest/v1/rpc/count_showcase_visit`)}, {
  method: 'POST', keepalive: true,
  headers: { apikey: ${JSON.stringify(SUPABASE_KEY)}, Authorization: ${JSON.stringify(`Bearer ${SUPABASE_KEY}`)}, 'Content-Type': 'application/json' },
  body: ${JSON.stringify(JSON.stringify({ p_slug: slug, p_kind: art }))},
}).catch(() => {});
</script>`;
}

/** Bots, Linkvorschauen und Skripte zählen beim Abruf der vCard nicht mit */
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|slack|discord|twitter|linkedin|skype|curl|wget|python|node-fetch|axios|headless/i;

/** Zählt serverseitig (für die vCard, die ohne Seite abgerufen wird); höchstens 1,5 Sekunden warten */
async function zaehlen(slug, art, request) {
  if (BOT.test(request.headers.get('user-agent') ?? '')) return;
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/count_showcase_visit`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_slug: slug, p_kind: art }),
    signal: AbortSignal.timeout(1500),
  }).catch(() => {});
}

// Fuß der Schaufenster-Seite (Daria, 2026-11-12): Wer die Seite sieht, kann dem Betrieb folgen, selbst eine Seite
// anlegen oder die App laden. Ersetzt die Karte „Mach mit in Deinem Kiez.“ der gemeinsamen Vorlage, die geteilte Posts
// weiter zeigen.
// Neu geordnet (Daria, 2026-11-28, Variante A „Zwei Kacheln“, vorher „Hierarchie unklar, vor allem die 3 Buttons
// stören“): zwei gleich große Kacheln, links Folgen als einziger gefüllter Knopf mit „Anfreunden“ als Link, rechts die
// eigene Seite mit umrandetem Knopf. Die Seite gehört dem Betrieb, Folgen hat deshalb Vorrang. „Komplett kostenlos“ und
// „Super schnell“ stehen gerade nebeneinander über der Frage. Runterladen und „Mehr über KiezCoins“ als Textlinks darunter.
function mitmachen(s) {
  return `<style>
.geteilt .sf-mit { margin: 56px 0 40px; padding-top: 32px; border-top: 1px solid var(--line); }
.geteilt .sf-mit-kacheln { display: grid; gap: 16px; }
@media (min-width: 760px) { .geteilt .sf-mit-kacheln { grid-template-columns: 1fr 1fr; } }
.geteilt .sf-mit-kachel { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 24px;
  display: flex; flex-direction: column; align-items: flex-start; gap: 12px; min-width: 0; }
.geteilt .sf-mit h2 { font: 500 22px/1.25 Unbounded, var(--display); letter-spacing: 0; margin: 0; overflow-wrap: anywhere; }
.geteilt .sf-mit-kachel p { margin: 0; font-size: 16px; line-height: 1.4; }
.geteilt .sf-mit-kachel p.sf-mit-marke { font: 600 12px/15px 'Inter Tight', Inter, sans-serif; letter-spacing: .03em; text-transform: uppercase; margin: 0; }
.geteilt .sf-mit-sticker { display: flex; flex-wrap: wrap; gap: 8px; }
.geteilt .sf-mit-sticker span { font: 600 12px/15px 'Inter Tight', Inter, sans-serif; letter-spacing: .03em; text-transform: uppercase;
  padding: 5px 10px; border-radius: 999px; background: #E4FF5F; color: #161616; white-space: nowrap; }
.geteilt .sf-mit-zeile { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; margin-top: auto; padding-top: 4px; max-width: 100%; }
.geteilt .sf-mit a.sf-mit-knopf { display: inline-flex; max-width: 100%; box-sizing: border-box; border-radius: 999px; padding: 12px 22px;
  font: 500 15px/1.25 Inter, sans-serif; letter-spacing: .01em; text-decoration: none; white-space: nowrap; }
.geteilt .sf-mit a.sf-mit-voll { background: var(--text); color: var(--bg); }
.geteilt .sf-mit a.sf-mit-rand { color: var(--text); box-shadow: inset 0 0 0 1.5px var(--text); }
/* Langer Name wird gekürzt, „folgen“ bleibt stehen (Daria, 2026-11-17) */
.geteilt .sf-mit-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.geteilt .sf-mit-zeile a:not(.sf-mit-knopf), .geteilt .sf-mit-fuss a { color: var(--text); font-size: 15px; text-underline-offset: 3px; }
.geteilt .sf-mit-fuss { display: flex; flex-wrap: wrap; gap: 12px 24px; margin-top: 20px; }
</style>
  <section class="sf-mit" aria-label="Mitmachen">
    <div class="sf-mit-kacheln">
      <div class="sf-mit-kachel">
        <p class="sf-mit-marke">In KiezCoins</p>
        <h2>Bleib bei ${esc(s.name)} auf dem Laufenden</h2>
        <p>Neue Posts und Termine erscheinen in Deinem Feed.</p>
        <div class="sf-mit-zeile">
          ${/* Folgen in der App (Daria, 2026-11-17); ohne Konto geht es übers Onboarding und danach zurück */ ''}<a class="sf-mit-knopf sf-mit-voll" href="https://app.kiezcoins.de/schaufenster/${esc(s.id)}?folgen=1" aria-label="${esc(s.name)} in KiezCoins folgen"><span class="sf-mit-name">${esc(s.name)}</span><span>&nbsp;folgen</span></a>
          ${/* Anfreunden nach dem Scan (Daria, 2026-11-17); ohne Konto über das Onboarding und danach zurück */ s.freunde ? `<a href="https://app.kiezcoins.de/schaufenster/${esc(s.id)}?anfreunden=1" aria-label="Mit ${esc(s.name)} in KiezCoins anfreunden">Anfreunden</a>` : ''}
        </div>
      </div>
      <div class="sf-mit-kachel">
        <div class="sf-mit-sticker"><span>Komplett kostenlos</span><span>Super schnell</span></div>
        <h2>Willst Du auch so eine Seite?</h2>
        <p>Für Vereine, Läden und Cafés im Kiez.</p>
        <div class="sf-mit-zeile"><a class="sf-mit-knopf sf-mit-rand" href="/schaufenster?von=schaufenster">Schaufenster anlegen</a></div>
      </div>
    </div>
    <div class="sf-mit-fuss">
      <a href="/laden?von=schaufenster">KiezCoins runterladen</a>
      <a href="/?von=schaufenster">Mehr über KiezCoins erfahren</a>
    </div>
  </section>`;
}

// Wie shareableMapsUrl in src/lib/places.ts. Auf iPhone und iPad tauscht das Skript unten auf Apple Karten.
const kartenLink = (ort) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ort.trim())}`;

// Anfahrt und Karte über OpenStreetMap (Daria, 2026-11-18).
// Karte als Bild von kiezcoins.de (Daria, 2026-11-28: „Karte gern automatisch laden“, Wahl „Kartenbild über
// kiezcoins.de“): Der Server setzt das Bild aus Kacheln von OpenStreetMap zusammen (/s/<kurzname>/karte.png). Der
// Browser der Besucher:in fragt OpenStreetMap nicht selbst an, deshalb lädt das Bild ohne Tipp. Ein Tipp öffnet die
// große Karte auf openstreetmap.org. Der Punkt steht in der Adresse des Bilds, damit eine neue Adresse sofort ein
// neues Bild bekommt.
function osmKarte(s) {
  if (!hatPunkt(s)) return '';
  const bild = `/s/${encodeURIComponent(s.slug)}/karte.png?p=${s.lat.toFixed(5)},${s.lng.toFixed(5)}`;
  return `<a class="sf-osm" href="${esc(karteGross(s))}" target="_blank" rel="noopener"><img src="${esc(bild)}" width="${KARTE_B}" height="${KARTE_H}" loading="lazy" alt="${esc(`Karte: ${s.name}`)}"></a><p class="sf-osm-quelle">Karte © <a href="https://www.openstreetmap.org/copyright" rel="noopener" target="_blank">OpenStreetMap-Mitwirkende</a> · <a href="${esc(karteGross(s))}" rel="noopener" target="_blank">Größere Karte</a></p>`;
}

function ortKnoepfe(s) {
  return `<span class="sf-ort"><a class="sf-ort-haupt" href="${esc(kartenLink(s.address))}" data-ort="${esc(s.address)}" target="_blank" rel="noopener">In Karten öffnen</a><a class="sf-ort-neben" href="${esc(anfahrtLink(s))}" target="_blank" rel="noopener">Anfahrt</a><button type="button" class="sf-ort-neben" data-ort-teilen="${esc(s.address)}" data-name="${esc(s.name)}">Ort teilen</button><span class="sf-ort-hinweis" role="status"></span></span>`;
}

// Kalender-Abo der Termine (Daria, 2026-11-18). Auf Apple-Geräten öffnet webcal:// die Kalender-App direkt, sonst
// führt der Knopf zum Google Kalender. „Link kopieren“ für Outlook und alle übrigen Kalender.
const aboLink = (slug) => `${SITE}/s/${slug}/termine.ics`;
const googleAbo = (slug) => `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(aboLink(slug).replace(/^https:/, 'webcal:'))}`;
function aboKnoepfe(s) {
  return `Neue Termine erscheinen automatisch in Deinem Kalender.<span class="sf-ort"><a class="sf-ort-haupt" href="${esc(googleAbo(s.slug))}" data-abo="${esc(aboLink(s.slug).replace(/^https:/, 'webcal:'))}" target="_blank" rel="noopener">Kalender abonnieren</a><button type="button" class="sf-ort-neben" data-abo-kopieren="${esc(aboLink(s.slug))}">Link kopieren</button><span class="sf-ort-hinweis" role="status"></span></span>`;
}

// Zahlungslinks des Betriebs (Daria, 2026-11-23, src/data/paymentLinks.mjs): je Link Titel, Betrag und „Bezahlen“.
// Bezahlt wird beim Anbieter (Stripe, SumUp, PayPal), das Geld geht direkt an den Betrieb.
function zahlungen(s) {
  return cleanPaymentLinks(s.payment_links)
    .map(
      (p) =>
        `<span class="sf-zahlung"><b>${esc(p.title)}</b>${p.amount ? ` · ${esc(p.amount)}` : ''}<span class="sf-ort"><a class="sf-ort-haupt" href="${esc(p.url)}" target="_blank" rel="noopener nofollow">Bezahlen</a></span></span>`,
    )
    .join('');
}

// Buchungslink des Betriebs (api/_buchung.mjs), z. B. https://cal.com/kiezblick
function buchungKnopf(s) {
  return `Freie Zeiten sehen und online buchen.<span class="sf-ort"><a class="sf-ort-haupt" href="${esc(buchungsLink(s))}" target="_blank" rel="noopener nofollow">Termin buchen</a></span>`;
}

// Grundstil der Schaufenster-Seite: Farbe des Schaufensters, Logo oben, Abschnitte. Auch für die Visitenkarten-Ansicht.
function seitenStil(s) {
  return `<style>
${
  // Ohne eigene Farbe: neutral, ruhig und etwas elegant statt des blassen Lilas der Website (Daria, 2026-11-12,
  // Vorbild tubikstudio.com). Die Farbe kommt aus den Fotos und der Digitalen Visitenkarte, nicht aus dem Hintergrund.
  s.bg_color ? farbe(s.bg_color) : NEUTRAL
}'
}
/* KiezCoins-Logo oben klein, das Schaufenster steht im Vordergrund (Daria, 2026-11-10) */
/* Klein, ohne Slogan, rechts, mit Abstand darunter (Daria, 2026-11-10) */
.top { justify-content: flex-end; padding: 28px 0 0; margin-bottom: 40px; }
/* Logo an der Inhaltsspalte ausrichten statt am Rand von .wrap (1080 px). Im breiten Fenster stand es sonst weit links
   neben der schmalen Spalte (Daria, 2026-11-28: „Dass das Logo wegrutscht nervt“). */
.top { max-width: 560px; margin-left: auto; margin-right: auto; }
.top .brand { align-items: flex-end; }
/* Daria (2026-11-17): „Zu klein, viel zu klein“. So groß wie auf kiezcoins.de: 31 px, auf schmalen Bildschirmen 26 px */
.top .brand svg { height: 31px; width: auto; }
/* Logo-Fassung B (Daria, 2026-11-17: „Nimm B“): nur der Schriftzug, in der Schriftfarbe der Seite. Der Kater (die
   Gruppe mit dem Kreis) fällt weg, das SVG rückt um seine Breite nach links (22 von 105 Einheiten bei 24 Höhe). */
.top .brand svg g { display: none; }
.top .brand svg path[fill="#5260E0"] { fill: var(--text); }
.top .brand svg { margin-left: calc(31px * -22 / 24); }
@media (max-width: 360px) { .top .brand svg { margin-left: calc(26px * -22 / 24); } }
@media (max-width: 360px) { .top .brand svg { height: 26px; } }
.top .marke { display: none; }
/* Ecken rechteckig, der Übergang zum Ausschnitt ganz leicht abgerundet (Daria, 2026-11-10). Die Maske besteht aus drei
   Teilen: oben alles, unten links ein Streifen, unten rechts eine Kachel mit dem Ausschnitt und 6 px Rundung an den
   Übergängen (Kreis 44 px um die Mitte des Logos, 56 px vom rechten Rand, Unterkante).
   Logo rechts, Name links daneben, probeweise linksbündig und größer (Daria, 2026-11-10). */
.geteilt .sf-cover { display: block; width: 100%; aspect-ratio: 16 / 9; border-radius: 0; object-fit: cover; margin: 0; }
.geteilt .sf-cover.sf-mit-logo {
  -webkit-mask: linear-gradient(#000, #000) left top / 100% calc(100% - 49px) no-repeat,
    linear-gradient(#000, #000) left bottom / calc(100% - 119px) 50px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='50' viewBox='0 0 120 50'%3E%3Cpath d='M0 0H120V50H113.64A6 6 0 0 1 107.68 44.72A44 44 0 0 0 20.32 44.72A6 6 0 0 1 14.36 50H0Z' fill='%23000'/%3E%3C/svg%3E") right bottom / 120px 50px no-repeat;
  mask: linear-gradient(#000, #000) left top / 100% calc(100% - 49px) no-repeat,
    linear-gradient(#000, #000) left bottom / calc(100% - 119px) 50px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='50' viewBox='0 0 120 50'%3E%3Cpath d='M0 0H120V50H113.64A6 6 0 0 1 107.68 44.72A44 44 0 0 0 20.32 44.72A6 6 0 0 1 14.36 50H0Z' fill='%23000'/%3E%3C/svg%3E") right bottom / 120px 50px no-repeat; }
.geteilt .sf-wer { display: flex; align-items: flex-end; gap: 12px; margin: 12px 0; }
.geteilt .sf-cover + .sf-wer { margin-top: 0; }
.geteilt .sf-cover.sf-mit-logo + .sf-wer { margin-top: -36px; padding-right: 20px; flex-direction: row-reverse; }
/* Der Name beginnt unter dem Titelbild; bricht er um, wächst er nach unten statt ins Bild */
.geteilt .sf-cover.sf-mit-logo + .sf-wer .sf-logo { align-self: flex-start; }
.geteilt .sf-cover.sf-mit-logo + .sf-wer h1 { flex: 1; text-align: left; align-self: flex-start; margin-top: 48px; padding-bottom: 0; }
.geteilt .sf-logo { width: 72px; height: 72px; aspect-ratio: 1; border-radius: 50%; object-fit: cover; flex: none; }
/* Name und Abschnitte in der App-Schrift für große Überschriften (Daria, 2026-11-10) */
@font-face { font-family: Unbounded; font-weight: 500; font-display: swap; src: url(/fonts/Unbounded_500Medium.ttf) format('truetype'); }
.geteilt .sf-wer h1 { margin: 0; padding-bottom: 0; font: 500 32px/1.05 Unbounded, var(--display); letter-spacing: 0; min-width: 0;
  overflow-wrap: normal; hyphens: manual; -webkit-hyphens: manual; }
/* Namen werden nicht getrennt (Daria, 2026-11-17: „Namen nicht umbrechen“, Safari machte „Arka-dieff“). Umbruch nur
   zwischen den Wörtern; passt ein Wort nicht, macht das Skript unten die Schrift kleiner. Erst wenn es auch mit
   16 px nicht passt, darf das Wort als Notlösung nach Silben brechen. */
.geteilt .sf-wer h1.sf-zu-lang { overflow-wrap: break-word; hyphens: auto; -webkit-hyphens: auto; }
/* Abschnitte klein in Versalien mit feiner Linie darüber, wie bei Studios (Daria, 2026-11-12) */
.geteilt h2.sf-abschnitt { font: 600 12px/15px 'Inter Tight', Inter, sans-serif; letter-spacing: .03em; text-transform: uppercase; color: var(--text);
  margin: 48px 0 12px; padding-top: 24px; border-top: 1px solid var(--line); }
.geteilt .sf-klappe summary h2.sf-abschnitt { flex: 1; }
/* Kiez unter dem Namen als kleine Zeile in Versalien, dunkel statt grau. Dicht am Namen, mit deutlich Abstand zur
   Beschreibung, damit klar ist, wozu sie gehört (Daria, 2026-11-12) */
.geteilt p.wer { font: 600 12px/15px 'Inter Tight', Inter, sans-serif; letter-spacing: .03em; text-transform: uppercase; color: var(--text); margin: 4px 0 32px; }
/* Fließtext enger gesetzt, vorher 1.55 aus seite.css (Daria, 2026-11-12) */
.geteilt p.text, .geteilt .sf-services, .geteilt .sf-text { line-height: 1.38; }
.geteilt .sf-fakten { display: grid; gap: 28px; margin: 28px 0 8px; }
@media (min-width: 560px) { .geteilt .sf-fakten { grid-template-columns: 1fr 1fr; gap: 28px 32px; } }
.geteilt .sf-fakt dt { font: 600 12px/15px 'Inter Tight', Inter, sans-serif; letter-spacing: .03em; text-transform: uppercase; color: var(--text); margin: 0 0 6px; }
.geteilt .sf-fakt dd { margin: 0; font-size: 16px; line-height: 1.4; white-space: pre-line; }
.geteilt .sf-fakt dd a { text-underline-offset: 3px; }
.geteilt .sf-ort { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; white-space: normal; }
.geteilt .sf-ort .sf-ort-haupt, .geteilt .sf-ort .sf-ort-neben { display: inline-block; border-radius: 999px; padding: 10px 18px;
  font: 500 15px/1 Inter, sans-serif; letter-spacing: .01em; text-decoration: none; cursor: pointer; }
.geteilt .sf-ort .sf-ort-haupt { background: var(--text); color: var(--bg); }
.geteilt .sf-ort .sf-ort-neben { border: 0; background: none; color: var(--text); box-shadow: inset 0 0 0 1.5px var(--text); }
/* Zahlungslinks: je Eintrag Titel und Betrag, darunter „Bezahlen“ (2026-11-23) */
.geteilt .sf-zahlung { display: block; }
.geteilt .sf-zahlung + .sf-zahlung { margin-top: 18px; }
.geteilt .sf-ort-hinweis { font-size: 13px; color: var(--text); }
/* Karte von OpenStreetMap als Bild, lädt sofort; ein Tipp öffnet die große Karte (Daria, 2026-11-28). Das Bild hat die
   Größe als Attribute, deshalb height: auto gegen .geteilt img (Fotos der Posts, 4 : 5) */
.geteilt .sf-osm { display: block; margin-top: 16px; border-radius: 12px; overflow: hidden; background: var(--surface);
  box-shadow: 0 0 0 1px var(--line); }
.geteilt .sf-osm img { display: block; width: 100%; height: auto; aspect-ratio: ${KARTE_B} / ${KARTE_H}; border-radius: 0; object-fit: cover; }
.geteilt .sf-osm-quelle { margin: 6px 0 0; font-size: 12px; color: var(--muted); white-space: normal; }
.geteilt .sf-osm-quelle a { color: inherit; }
.geteilt .sf-services p, .geteilt .sf-services ul { margin: 0 0 12px; }
.geteilt .sf-services ul { padding-left: 20px; }
.geteilt .sf-services li { margin: 0 0 4px; }
/* Zuklappen gibt es nur noch für die AGB. Die Linie liegt auf der ganzen Zeile, auch unter dem Pfeil (2026-11-28) */
.geteilt .sf-klappe summary { list-style: none; cursor: pointer; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.geteilt .sf-klappe summary::-webkit-details-marker { display: none; }
.geteilt .sf-klappe summary { margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--line); }
.geteilt .sf-klappe summary h2.sf-abschnitt { margin-top: 0; padding-top: 0; border-top: 0; }
.geteilt .sf-klappe summary::after { content: '›'; font: 400 28px/24px Inter, sans-serif; margin: 0 0 12px; transition: transform 200ms; }
.geteilt .sf-klappe[open] summary::after { transform: rotate(90deg); }
.geteilt .sf-cover:not(.sf-mit-logo) + .sf-wer { margin-top: 12px; }
.geteilt .sf-klein { font-size: 15px; color: var(--muted); margin: 0 0 4px; }
.geteilt .sf-liste { display: grid; gap: 32px; margin: 24px 0; }
.geteilt .sf-karte { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
.geteilt .sf-bild { display: block; width: 100%; aspect-ratio: 16 / 9; border-radius: 0; object-fit: cover; }
.geteilt .sf-inhalt { padding: 16px; }
.geteilt .sf-inhalt h2 { font: 600 22px/1.2 var(--display); margin: 0 0 6px; }
.geteilt .sf-art { font-size: 13px; font-weight: 500; margin: 0 0 4px; color: var(--purple); }
.geteilt .sf-art.sf-post { color: var(--muted); }
.geteilt .sf-art.sf-abgesagt { color: var(--red); }
.geteilt .sf-durch { text-decoration: line-through; color: var(--muted); }
.geteilt .sf-text { white-space: pre-line; margin: 8px 0 0; }
.geteilt .sf-link { display: inline-block; margin-top: 8px; font-size: 15px; color: var(--muted); }
.geteilt .sf-herz { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; padding: 4px 0; border: 0; background: none;
  font: 500 16px/1 Inter, sans-serif; color: var(--text); cursor: pointer; }
.geteilt .sf-herz[aria-pressed="true"] { color: color-mix(in srgb, var(--pink) 70%, var(--text)); }
.geteilt .sf-herz[aria-pressed="true"] span { color: var(--text); }
.geteilt .sf-herz:disabled { cursor: default; opacity: .6; }
/* Desktop (Daria, 2026-11-28): ab 1040 px zwei Spalten, Hauptspalte 620 px, Abstand 40 px, rechte Spalte 340 px, wie die
   Desktop-Fassung der App. Darunter stehen alle Teile untereinander wie bisher. Die rechte Spalte ist ruhig: Angaben als
   Zeilen mit feiner Linie, Aktionen als Textlinks in zwei Spalten (Daria: „etwas hektisch angeordnet“). */
.sf-nur-breit { display: none; }
@media (min-width: 1040px) {
  .wrap { padding: 0 40px; }
  .top, .geteilt { max-width: 1000px; }
  .sf-nur-breit { display: block; }
  .sf-nur-schmal { display: none; }
  .geteilt .sf-cover { aspect-ratio: 5 / 2; }
  .geteilt .sf-cover.sf-mit-logo + .sf-wer { padding-right: 28px; }
  .sf-spalten { display: grid; grid-template-columns: minmax(0, 620px) 340px; grid-template-rows: auto 1fr; column-gap: 40px;
    grid-template-areas: "start seite" "haupt seite"; }
  .sf-start { grid-area: start; }
  .sf-haupt { grid-area: haupt; }
  .sf-seite { grid-area: seite; align-self: start; position: sticky; top: 28px; }
  .geteilt .sf-start p.text { margin: 0 0 8px; font-size: 19px; line-height: 1.45; }
  .geteilt .sf-seite .sf-fakten { display: block; margin: 0; border-top: 1px solid var(--line); }
  .geteilt .sf-seite .sf-fakt { padding: 16px 0; border-bottom: 1px solid var(--line); }
  .geteilt .sf-seite .sf-fakt dt { margin-bottom: 4px; }
  .geteilt .sf-seite .sf-fakt dd { font-size: 15px; }
  .geteilt .sf-seite .sf-ort { display: grid; grid-template-columns: auto auto; justify-content: start; gap: 6px 24px; margin-top: 10px; }
  .geteilt .sf-seite .sf-ort > * { justify-self: start; text-align: left; }
  .geteilt .sf-seite .sf-ort .sf-ort-haupt, .geteilt .sf-seite .sf-ort .sf-ort-neben { padding: 0; border-radius: 0; background: none;
    color: var(--text); box-shadow: none; font: 500 14px/20px Inter, sans-serif; text-decoration: underline; text-underline-offset: 3px; }
  .geteilt .sf-seite .sf-ort-hinweis:empty { display: none; }
  .geteilt .sf-seite .sf-osm { margin-top: 12px; }
  .geteilt .sf-seite h2.sf-abschnitt { margin-top: 32px; border-top: 0; padding-top: 0; }
  .geteilt .sf-seite .sf-vk { margin-bottom: 0; max-width: none; }
  .geteilt .sf-haupt > h2.sf-abschnitt:first-child { margin-top: 32px; }
  /* Nachbesserung nach Darias Blick auf die Live-Seite (2026-11-28): Titelbild „zu groß“, Porträt „seltsam angeordnet“,
     Services zuzuklappen „unnötig“, Postkarte zu groß mit „grauer Rand richtig dumm“. Titelbild fest 220 px hoch.
     Porträt 112 px links halb im Bild, Name daneben, Kiez darunter, ohne Ausschnitt im Bild. Posts zu zweit
     nebeneinander, ohne Rand, Herz oben rechts. Keine grauen Ränder an Karte und Mitmach-Kacheln. */
  .geteilt .sf-cover { aspect-ratio: auto; height: 220px; }
  .geteilt .sf-cover.sf-mit-logo { -webkit-mask: none; mask: none; }
  .geteilt .sf-cover.sf-mit-logo + .sf-wer { flex-direction: row; align-items: flex-end; gap: 24px; margin-top: -40px; padding: 0 0 0 24px; }
  .geteilt .sf-cover.sf-mit-logo + .sf-wer .sf-logo { width: 112px; height: 112px; align-self: flex-end; box-shadow: 0 0 0 6px var(--bg); }
  .geteilt .sf-cover.sf-mit-logo + .sf-wer h1 { margin-top: 0; align-self: flex-end; }
  .geteilt .sf-cover.sf-mit-logo + .sf-wer + p.wer { margin: 8px 0 48px 160px; }
  .geteilt .sf-liste { grid-template-columns: 1fr 1fr; gap: 20px; }
  .geteilt .sf-karte { border: 0; border-radius: 12px; }
  .geteilt .sf-inhalt { position: relative; padding: 20px; }
  .geteilt .sf-inhalt h2 { font-size: 19px; padding-right: 32px; }
  .geteilt .sf-herz { position: absolute; top: 14px; right: 16px; margin: 0; }
  .geteilt .sf-osm { box-shadow: none; }
  body .geteilt .sf-mit-kachel { border: 0; }
  /* Rechte Spalte ohne Linie oben, beginnt auf Höhe der Beschreibung (Claude-Review, von Daria bestätigt 2026-11-28) */
  .geteilt .sf-seite .sf-fakten { border-top: 0; }
  .geteilt .sf-seite .sf-fakt:first-child { padding-top: 4px; }
  /* Visitenkarte rechts: das Bild ist der Link, darunter ein Textlink statt eines zweiten schwarzen Knopfs neben „Folgen“
     (Claude-Review, von Daria bestätigt 2026-11-28) */
  .geteilt .sf-seite .sf-vk .sf-vk-bild { margin-bottom: 12px; }
  .geteilt .sf-seite .sf-vk a.sf-vk-haupt { display: inline; min-height: 0; padding: 0; border-radius: 0; background: none; color: var(--text);
    font: 500 14px/20px Inter, sans-serif; text-decoration: underline; text-underline-offset: 3px; }
}
/* Standard-Posts als kleine Plakate (Daria, 2026-11-28), siehe standardPosts() */
.geteilt .sf-plakat { display: flex; flex-direction: column; gap: 20px; min-height: 300px; padding: 24px; border-radius: 12px; box-sizing: border-box; }
.geteilt .sf-plakat-tinte { background: #161616; color: #F0FFA6; }
.geteilt .sf-plakat-hell { background: #F0FFA6; color: #161616; }
.geteilt .sf-plakat p.sf-plakat-marke { margin: 0; font: 600 12px/15px 'Inter Tight', Inter, sans-serif; letter-spacing: .03em; text-transform: uppercase; color: inherit; }
.geteilt .sf-plakat h2 { margin: auto 0 0; font: 500 34px/1.08 Unbounded, var(--display); letter-spacing: -.01em; color: inherit; overflow-wrap: anywhere; }
.geteilt .sf-plakat-hell h2 { font-size: 24px; line-height: 1.2; }
.geteilt .sf-plakat p.sf-plakat-fuss { margin: 0; font: 400 15px/1.4 Inter, sans-serif; color: inherit; opacity: .8; }
.geteilt .sf-plakat-liste { list-style: none; margin: auto 0 0; padding: 0; }
.geteilt .sf-plakat-liste li { display: flex; gap: 16px; align-items: baseline; padding: 12px 0; border-top: 1px solid rgba(22,22,22,.25);
  font: 500 18px/1.3 'Inter Tight', Inter, sans-serif; }
.geteilt .sf-plakat-liste li span { flex: none; font: 500 12px/1 Inter, sans-serif; font-variant-numeric: tabular-nums; }
@media (min-width: 1040px) { .geteilt .sf-plakat { aspect-ratio: 4 / 5; min-height: 0; } }
/* Platzhalter (Daria, 2026-11-11) */
.geteilt .sf-verlauf { background: linear-gradient(135deg, #8F90FA 0%, #FFB2E5 55%, #FFAD7E 100%); }
.geteilt .sf-kater { display: flex; align-items: center; justify-content: center; background: #000; }
.geteilt .sf-ende { margin-bottom: 40px; }
</style>`;
}

// Standard-Posts (Daria, 2026-11-28: „Default-Posts, die erscheinen, bevor echte Posts erscheinen. Minimalistisch aber
// modern. À la Grafikdesigner“). Statt des gestrichelten Platzhalters zwei Karten wie kleine Plakate, nur aus Angaben,
// die das Schaufenster schon hat: Willkommen in Tinte mit Schrift in Gelbgrün, daneben in Gelbgrün die Services
// (höchstens drei, nummeriert), ohne Services die Öffnungszeiten, ohne beides die Adresse. Feste Farben wie das Bild
// der Digitalen Visitenkarte, damit sie auf jedem Hintergrund gleich aussehen. Mit dem ersten echten Post fallen sie weg.
function standardPosts(s) {
  const kiez = s.kiez?.trim();
  const willkommen = `<article class="sf-plakat sf-plakat-tinte">
      <p class="sf-plakat-marke">Willkommen</p>
      <h2>${kiez ? `Neu in ${esc(kiez)}.` : 'Neu im Kiez.'}</h2>
      <p class="sf-plakat-fuss">${esc(s.name)} hat jetzt ein Schaufenster. Neues erscheint hier.</p>
    </article>`;
  const services = serviceListe(s.services ?? '').slice(0, 3);
  const zeiten = (s.opening_hours ?? '').split('\n').map((z) => z.trim()).filter(Boolean).slice(0, 4);
  const zweite = services.length
    ? `<article class="sf-plakat sf-plakat-hell">
      <p class="sf-plakat-marke">Was es hier gibt</p>
      <ol class="sf-plakat-liste">${services.map((x, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span>${esc(x)}</li>`).join('')}</ol>
    </article>`
    : zeiten.length
      ? `<article class="sf-plakat sf-plakat-hell">
      <p class="sf-plakat-marke">Geöffnet</p>
      <ol class="sf-plakat-liste sf-plakat-ohne-zahl">${zeiten.map((z) => `<li>${esc(z)}</li>`).join('')}</ol>
    </article>`
      : s.address?.trim()
        ? `<article class="sf-plakat sf-plakat-hell">
      <p class="sf-plakat-marke">Hier zu finden</p>
      <h2>${esc(s.address)}</h2>
    </article>`
        : '';
  return `<h2 class="sf-abschnitt">Neu im Schaufenster</h2><div class="sf-liste sf-plakate">${willkommen}${zweite}</div>`;
}

function inhalt(s, via, team = false) {
  if (!s) {
    return `  <h1>Dieses Schaufenster gibt es nicht, oder es ist nicht öffentlich.</h1>
  <p class="text">Vielleicht ist es nur für Eingeladene. Dann öffnest Du es in der App.</p>`;
  }
  const cover = foto(s.cover_path);
  const logo = foto(s.logo_path);
  // Angaben mit kleinen Überschriften, Zeilenumbrüche bleiben (Daria, 2026-11-12)
  const fakt = (label, html) => `<div class="sf-fakt"><dt>${label}</dt><dd>${html}</dd></div>`;
  // Leere Angaben fallen ganz weg statt „Noch keine …“, wie schon die E-Mail. Eine Einzelperson hat oft dauerhaft
  // keine Adresse und keine Öffnungszeiten (Daria, 2026-11-17: „Ort und Öffnungszeiten verbergen wenn leer“).
  // Reihenfolge (Daria, 2026-11-28): Öffnungszeiten zuerst, das Kalender-Abo der Termine als letzte Angabe nach den
  // Kontaktwegen, direkt vor der Digitalen Visitenkarte. Gleich am Handy und am Desktop.
  const zeiten = s.opening_hours?.trim() ? fakt('Öffnungszeiten', esc(s.opening_hours)) : '';
  const infos = [
    // Adresse an die Karten-App oder ans Teilen-Menü (Daria, 2026-11-17: „in jedem Fall offen teilbar“)
    // Karten-Links, Anfahrt und Karte nur mit Punkt. Ohne Punkt hat die Gründer:in den Ort als Text gespeichert oder die
    // Kartensuche fand ihn nicht; dann steht er nur als Text da (2026-11-23).
    s.address?.trim() ? fakt('Adresse', `${esc(s.address)}${hatPunkt(s) ? ortKnoepfe(s) + osmKarte(s) : ''}`) : '',
    // Termin buchen über Cal.com oder einen anderen Dienst (Daria, 2026-11-18); ohne Link keine Zeile
    buchungsLink(s) ? fakt('Termin buchen', buchungKnopf(s)) : '',
    cleanPaymentLinks(s.payment_links).length ? fakt('Bezahlen', zahlungen(s)) : '',
  ].join('');
  // Abo nur, wenn es Termine gibt (Daria, 2026-11-18: leere Angaben fallen weg)
  // Kalender-Abo nur, wenn der Schalter an ist (calendar_feed, Migration 20261123000200; ohne Spalte an)
  const abo = s.slug && hatTermine(s) && s.calendar_feed !== false ? fakt('Termine', aboKnoepfe(s)) : '';
  // Mehrere Links (Migration 20261110000600); vorher nur die Webseite
  const links = Array.isArray(s.links) && s.links.length ? s.links : s.website ? [s.website] : [];
  // Kontakt, Webseiten und soziale Netzwerke getrennt wie in der App (Daria, 2026-11-23, data/digitalCard.mjs).
  // Ohne Angaben keine Zeile (Daria, 2026-11-17: „Dann bitte Mail einbinden“)
  const kontakt = contactGroups({ email: s.email, phone: s.phone, links });
  const verweis = (l, text) => `<a href="${esc(l)}" rel="noopener nofollow">${esc(text)}</a>`;
  const mail =
    kontakt.email || kontakt.phone
      ? fakt(
          'Kontakt',
          [
            kontakt.email ? `<a href="mailto:${esc(kontakt.email)}">${esc(kontakt.email)}</a>` : '',
            kontakt.phone ? `<a href="${esc(telLink(kontakt.phone))}">${esc(kontakt.phone)}</a>` : '',
          ]
            .filter(Boolean)
            .join('<br>'),
        )
      : '';
  const web = kontakt.websites.length
    ? fakt(kontakt.websites.length > 1 ? 'Webseiten' : 'Webseite', kontakt.websites.map((l) => verweis(l, shortUrl(l))).join('<br>'))
    : '';
  const netze = kontakt.social.length
    ? fakt(
        'Soziale Netzwerke',
        kontakt.social
          .map((l) => {
            const n = socialLink(l);
            return verweis(l, n ? `${n.network} ${n.handle}` : shortUrl(l));
          })
          .join('<br>'),
      )
    : '';
  const eintraege = (s.entries ?? []).map(eintrag).join('\n');
  // Noch nichts gepostet: ein erster Post als Platzhalter. Den leeren Abschnitt „Termine“ gibt es nicht mehr
  // (Daria, 2026-11-18: „Same ausblenden wenn nicht befüllt“)
  const ohneEintraege = standardPosts(s);
  return `${seitenStil(s)}
  ${team ? teamHinweis('So sehen andere Dein Schaufenster im Web. Bearbeiten kannst Du es in der App.') : ''}
  ${cover ? `<img class="sf-cover sf-mit-logo" src="${esc(cover)}" alt="Titelbild von ${esc(s.name)}">` : '<div class="sf-cover sf-mit-logo sf-verlauf" aria-hidden="true"></div>'}
  <div class="sf-wer">${logo ? `<img class="sf-logo" src="${esc(logo)}" alt="Logo von ${esc(s.name)}">` : `<span class="sf-logo sf-kater">${KATER}</span>`}<h1 style="${titelGroesse(s.name)}">${esc(s.name)}</h1></div>
  ${s.kiez ? `<p class="wer">${esc(s.kiez)}</p>` : ''}
  ${
    /* Desktop ab 1040 px (Daria, 2026-11-28): Hauptspalte 620 px und rechts die Angaben in 340 px, 40 px Abstand, wie
       die Desktop-Fassung der App. .sf-start ist die Beschreibung, .sf-seite die rechte Spalte, .sf-haupt der Rest der
       linken Spalte. Am Handy stehen sie in dieser Reihenfolge untereinander, wie bisher. Die Digitale Visitenkarte
       steht am Desktop rechts unter den Angaben und am Handy am Schluss der Seite: zwei Fassungen, je eine verborgen. */ ''
  }<div class="sf-spalten">
  <div class="sf-start">${/* Ohne Beschreibung keine Zeile, wie bei Adresse und Öffnungszeiten (Daria, 2026-11-17) */ s.about?.trim() ? `<p class="text">${esc(s.about)}</p>` : ''}</div>
  <aside class="sf-seite" aria-label="Angaben">
  ${zeiten || infos || mail || web || netze || abo ? `<dl class="sf-fakten">${zeiten}${infos}${mail}${web}${netze}${abo}</dl>` : ''}
  <div class="sf-nur-breit">${visitenkarte(s, via, team, 'breit')}</div>
  </aside>
  <div class="sf-haupt">
  ${s.imprint?.trim() ? '<p class="sf-klein"><a href="#impressum">Impressum</a></p>' : ''}
  ${
    // Leere Abschnitte (Services, AGB, Impressum) fallen ganz weg statt „Noch keine …“ (Daria, 2026-11-18)
    !s.services?.trim()
      ? ''
      : // Immer offen, auch wenn in der App „eingeklappt“ eingestellt ist (Daria, 2026-11-28: „unnötig, zu verbergen“)
        `<h2 class="sf-abschnitt">Services</h2><div class="sf-services">${richHtml(s.services)}</div>`
  }
  ${eintraege ? `<h2 class="sf-abschnitt">Neu im Schaufenster</h2><div class="sf-liste">${eintraege}</div>` : ohneEintraege}
  ${
    s.terms?.trim()
      ? `<details class="sf-klappe"><summary><h2 class="sf-abschnitt">AGB</h2></summary><div class="sf-services">${richHtml(s.terms)}</div></details>`
      : ''
  }
  ${
    s.imprint?.trim()
      ? `<h2 class="sf-abschnitt" id="impressum">Impressum</h2>
  <div class="sf-ende"><p class="sf-klein" style="white-space: pre-line">${esc(s.imprint)}</p></div>`
      : ''
  }
  </div>
  </div>
  ${/* Digitale Visitenkarte am Schluss der Seite (Daria, 2026-11-12), am Desktop in der rechten Spalte */ `<div class="sf-nur-schmal">${visitenkarte(s, via, team, 'schmal')}</div>`}
<script>
(() => {
  // Name: die Schrift so weit verkleinern, dass das längste Wort in die Zeile passt (höchstens bis 16 px)
  const titel = document.querySelector('.sf-wer h1');
  if (titel) {
    const start = titel.style.fontSize;
    const passen = () => {
      titel.style.fontSize = start;
      titel.classList.remove('sf-zu-lang');
      let px = parseFloat(getComputedStyle(titel).fontSize);
      while (titel.scrollWidth > titel.clientWidth + 0.5 && px > 16) titel.style.fontSize = (px = Math.max(16, px - 1)) + 'px';
      if (titel.scrollWidth > titel.clientWidth + 0.5) titel.classList.add('sf-zu-lang');
    };
    passen();
    if (document.fonts) document.fonts.ready.then(passen);
    let warten;
    addEventListener('resize', () => { clearTimeout(warten); warten = setTimeout(passen, 100); });
  }
  // Ort: auf Apple-Geräten Apple Karten, sonst Google Maps; Teilen über das Menü des Geräts, sonst kopieren
  const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (apple) for (const a of document.querySelectorAll('a[data-ort]')) a.href = 'https://maps.apple.com/?q=' + encodeURIComponent(a.dataset.ort);
  for (const b of document.querySelectorAll('[data-ort-teilen]')) {
    b.addEventListener('click', async () => {
      const ort = b.dataset.ortTeilen, link = ${JSON.stringify('https://www.google.com/maps/search/?api=1&query=')} + encodeURIComponent(ort);
      const text = b.dataset.name + '\\n' + ort;
      const hinweis = b.parentElement.querySelector('.sf-ort-hinweis');
      try {
        if (navigator.share) { await navigator.share({ title: b.dataset.name, text, url: link }); return; }
        await navigator.clipboard.writeText(text + '\\n' + link);
        hinweis.textContent = 'Adresse kopiert';
        setTimeout(() => (hinweis.textContent = ''), 2500);
      } catch {}
    });
  }
  // Kalender-Abo: Apple-Geräte (auch der Mac) öffnen webcal:// in der Kalender-App
  if (apple || /Macintosh/.test(navigator.userAgent)) for (const a of document.querySelectorAll('a[data-abo]')) { a.href = a.dataset.abo; a.removeAttribute('target'); }
  for (const b of document.querySelectorAll('[data-abo-kopieren]')) {
    b.addEventListener('click', async () => {
      const hinweis = b.parentElement.querySelector('.sf-ort-hinweis');
      try {
        await navigator.clipboard.writeText(b.dataset.aboKopieren);
        hinweis.textContent = 'Link kopiert';
        setTimeout(() => (hinweis.textContent = ''), 2500);
      } catch {}
    });
  }
  const URL_ = ${JSON.stringify(SUPABASE_URL)}, KEY = ${JSON.stringify(SUPABASE_KEY)}, MERK = 'kc-termin-herzen';
  let gemerkt = [];
  try { gemerkt = JSON.parse(localStorage.getItem(MERK) || '[]'); } catch {}
  const merken = () => { try { localStorage.setItem(MERK, JSON.stringify(gemerkt)); } catch {} };
  for (const b of document.querySelectorAll('.sf-herz')) {
    const id = b.dataset.id;
    const zeigen = (an, n) => {
      b.setAttribute('aria-pressed', String(an));
      b.dataset.n = String(n);
      b.querySelector('span').textContent = n > 0 ? String(n) : '';
      b.setAttribute('aria-label', n > 0 ? 'Gefällt mir, ' + n + ' Likes' : 'Gefällt mir');
    };
    zeigen(gemerkt.includes(id), Number(b.dataset.n));
    b.addEventListener('click', async () => {
      const an = b.getAttribute('aria-pressed') !== 'true';
      const vorher = Number(b.dataset.n);
      zeigen(an, Math.max(0, vorher + (an ? 1 : -1)));
      b.disabled = true;
      try {
        const res = await fetch(URL_ + '/rest/v1/rpc/like_event', {
          method: 'POST',
          headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_event_id: id, p_on: an }),
        });
        if (!res.ok) throw new Error();
        zeigen(an, Number(await res.json()));
        gemerkt = an ? [...new Set([...gemerkt, id])] : gemerkt.filter((x) => x !== id);
        merken();
      } catch {
        zeigen(!an, vorher);
      } finally {
        b.disabled = false;
      }
    });
  }
})();
</script>`;
}

// Visitenkarten-Ansicht: eigener Titel und eigenes Vorschaubild für Messenger (Daria, 2026-11-23: „Der geteilte Link
// wirkt ein wenig erbärmlich“). Das Bild zeigt die Karte selbst, siehe _visitenkarte-bild.mjs.
function kopfVisitenkarte(s) {
  const url = `${SITE}/s/${s.slug}/visitenkarte`;
  const titel = `${s.name} · Digitale Visitenkarte`;
  const text = bildText(s);
  const bild = `${url}.png`;
  return [
    `<title>${esc(`${titel} – KiezCoins`)}</title>`,
    `<meta name="description" content="${esc(text)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    '<meta property="og:site_name" content="KiezCoins">',
    '<meta property="og:type" content="profile">',
    '<meta property="og:locale" content="de_DE">',
    `<meta property="og:title" content="${esc(titel)}">`,
    `<meta property="og:description" content="${esc(text)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(bild)}">`,
    `<meta property="og:image:width" content="${BILD_B}">`,
    `<meta property="og:image:height" content="${BILD_H}">`,
    `<meta property="og:image:alt" content="${esc(`Digitale Visitenkarte von ${s.name}`)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
  ].join('\n');
}

// Schriften für das Vorschaubild, einmal je Instanz geladen (dieselben Dateien wie auf der Seite)
let schriften;
const ladeSchriften = (origin) =>
  (schriften ??= Promise.all(
    ['Unbounded_500Medium', 'Karla_400Regular', 'Karla_500Medium'].map((f) =>
      fetch(`${origin}/fonts/${f}.ttf`).then((r) => {
        if (!r.ok) throw new Error(f);
        return r.arrayBuffer();
      }),
    ),
  ).catch((e) => {
    schriften = undefined;
    throw e;
  }));

// Vorschaubild /s/<kurzname>/visitenkarte.png (vercel.json). @vercel/og erst hier laden, damit die Seite selbst schnell startet.
async function visitenkarteBild(s, origin) {
  if (!s) return new Response('Nicht gefunden', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  const [{ ImageResponse }, [unbounded, karla, karlaMedium]] = await Promise.all([import('@vercel/og'), ladeSchriften(origin)]);
  const bild = new ImageResponse(bildBaum(s, { logo: foto(s.logo_path), kater: `data:image/svg+xml,${encodeURIComponent(KATER)}` }), {
    width: BILD_B,
    height: BILD_H,
    fonts: [
      { name: 'Unbounded', data: unbounded, weight: 500, style: 'normal' },
      { name: 'Karla', data: karla, weight: 400, style: 'normal' },
      { name: 'KarlaMedium', data: karlaMedium, weight: 500, style: 'normal' },
    ],
  });
  // ImageResponse setzt „immutable“ für ein Jahr. Änderungen am Schaufenster sollen aber nach einer Weile im Bild
  // ankommen, darum eigene Angabe; Messenger speichern das Bild ohnehin selbst
  return new Response(bild.body, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400' },
  });
}

// Kartenbild /s/<kurzname>/karte.png (Daria, 2026-11-28): Kacheln von tile.openstreetmap.org, in der Mitte ein Pin in
// Tinte. Die Funktion holt die Kacheln selbst, mit eigener Kennung, wie es die Regeln von OpenStreetMap verlangen
// (operations.osmfoundation.org/policies/tiles). Vercel hält das Bild eine Woche vor; der Punkt steht in der Adresse
// des Bilds, eine neue Adresse holt also ein neues.
const PIN = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56"><path d="M22 54C22 54 41 33.5 41 21C41 10.5 32.5 2 22 2C11.5 2 3 10.5 3 21C3 33.5 22 54 22 54Z" fill="#161616" stroke="#fff" stroke-width="3"/><circle cx="22" cy="21" r="7" fill="#fff"/></svg>`;
async function kartenBild(s) {
  if (!s || !hatPunkt(s)) return new Response('Nicht gefunden', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  const kacheln = kartenKacheln(s);
  const bilder = await Promise.all(
    kacheln.map(async (k) => {
      const res = await fetch(`https://tile.openstreetmap.org/${k.z}/${k.x}/${k.y}.png`, {
        headers: { 'User-Agent': 'KiezCoins-Schaufenster/1.0 (+https://kiezcoins.de)', Referer: SITE },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) throw new Error(`Kachel ${res.status}`);
      return `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
    }),
  ).catch(() => null);
  if (!bilder) return new Response('Karte nicht verfügbar', { status: 502, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  const { ImageResponse } = await import('@vercel/og');
  const img = (src, style) => ({ type: 'img', props: { src, style: { position: 'absolute', ...style } } });
  const baum = {
    type: 'div',
    props: {
      style: { display: 'flex', position: 'relative', width: KARTE_B, height: KARTE_H, backgroundColor: '#F2EFE9', overflow: 'hidden' },
      children: [
        ...kacheln.map((k, i) => img(bilder[i], { left: k.links, top: k.oben, width: 256, height: 256 })),
        img(`data:image/svg+xml,${encodeURIComponent(PIN)}`, { left: KARTE_B / 2 - 22, top: KARTE_H / 2 - 54, width: 44, height: 56 }),
      ],
    },
  };
  const bild = new ImageResponse(baum, { width: KARTE_B, height: KARTE_H });
  return new Response(bild.body, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800' },
  });
}

async function kontaktDatei(s, slug, felder, request) {
  if (!s) return new Response('Nicht gefunden', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  // „In Kontakte speichern“ zählt fürs Team (2026-11-23)
  await zaehlen(slug, 'save', request);
  return new Response(vcard(s, felder), {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.vcf"`,
      // Enthält die eigene Notiz: nirgends zwischenspeichern
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(request) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') ?? '').toLowerCase();
  const s = SLUG.test(slug) ? await ladeSchaufenster(slug) : null;

  // Die Gründer:in hat die Adresse geändert: dauerhaft auf die neue weiterleiten, damit alte Links und QR-Codes
  // funktionieren und Suchmaschinen die neue Adresse übernehmen
  if (!s && SLUG.test(slug)) {
    const neu = await neuerKurzname(slug);
    if (neu) {
      const rest = { ics: '/termine.ics', vcf: '/kontakt.vcf', png: '/visitenkarte.png', karte: '/karte.png' }[url.searchParams.get('format')] ?? (url.searchParams.get('ansicht') === 'visitenkarte' ? '/visitenkarte' : '');
      const weiter = new URLSearchParams();
      if (url.searchParams.get('via') === 'karte') weiter.set('via', 'karte');
      if (url.searchParams.get('von') === 'schaufenster') weiter.set('von', 'schaufenster');
      const query = weiter.toString() ? `?${weiter}` : '';
      return Response.redirect(new URL(`/s/${neu}${rest}${query}`, url.origin), 301);
    }
  }

  // Kalender-Abo der Termine: /s/<kurzname>/termine.ics (vercel.json)
  if (url.searchParams.get('format') === 'ics') {
    // Abo ausgeschaltet: keine neuen Termine mehr für bestehende Abos (2026-11-23)
    if (!s || s.calendar_feed === false) return new Response('Nicht gefunden', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    return new Response(schaufensterKalender(s, `${SITE}/s/${slug}`), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="${slug}.ics"`,
        // Fünf Minuten zwischenspeichern: Kalender-Apps fragen oft, neue Termine kommen trotzdem rasch an
        'Cache-Control': 'public, max-age=0, s-maxage=300',
      },
    });
  }

  // Kontakt als vCard: /s/<kurzname>/kontakt.vcf (Daria, 2026-11-23), ohne Notiz. Die App auf dem Handy öffnet sie; im
  // Browser entsteht die vCard mit Ort und Notiz auf dem Gerät (src/data/vcard.mjs, dieselbe Vorlage).
  if (url.searchParams.get('format') === 'vcf') return kontaktDatei(s, slug, {}, request);
  if (url.searchParams.get('format') === 'png') return visitenkarteBild(s, url.origin);
  if (url.searchParams.get('format') === 'karte') return kartenBild(s);

  const via = url.searchParams.get('via') === 'karte' ? 'karte' : undefined;
  const von = url.searchParams.get('von') === 'schaufenster' ? 'schaufenster' : undefined;
  const ansicht = url.searchParams.get('ansicht') === 'visitenkarte';
  // Die App öffnet die Seite fürs Team mit ?als=team (Daria, 2026-11-23): Vorschau mit Hinweis, ohne Zählung
  const team = url.searchParams.get('als') === 'team';

  // Digitale Visitenkarte: eine Komponente in der App, auch für Gäste (Daria, 2026-11-23). Menschen gehen direkt zur
  // Karte in der Web-App, Linkvorschauen bekommen Titel und Vorschaubild. Gezählt wird in der App.
  if (ansicht && s) {
    const ziel = appVisitenkarte(s.slug, { via, von, team });
    if (!BOT.test(request.headers.get('user-agent') ?? '')) {
      return new Response(null, { status: 302, headers: { Location: ziel, 'Cache-Control': 'no-store' } });
    }
    return new Response(vorschauSeite(s, kopfVisitenkarte(s), ziel), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=60' },
    });
  }
  const vorlage = await fetch(new URL('/teilen-vorlage', url.origin));
  if (!vorlage.ok) return new Response('Vorlage fehlt', { status: 500 });
  const seite = (await vorlage.text())
    // Öffentliche Schaufenster dürfen in Suchmaschinen erscheinen; die Vorlage sperrt das sonst (geteilte Posts, 404)
    .replace('<meta name="robots" content="noindex">', () =>
      // „Bei Google finden lassen“ aus (search_listing, Migration 20261123000200): auch die Seite selbst „noindex“
      s && s.search_listing !== false ? '<meta name="robots" content="index, follow, max-image-preview:large">' : '<meta name="robots" content="noindex">',
    )
    .replace('<!--KOPF-->', () => kopf(s, `${SITE}/s/${slug}`))
    .replace('<!--POST-->', () =>
      inhalt(s, via, team) + (s && !team ? zaehlSkript(s.slug, 'page') : ''),
    )
    .replace(/<div class="card">\s*<h3>Mach mit in Deinem Kiez\.<\/h3>[\s\S]*?<\/div>/, (karte) => (s ? mitmachen(s) : karte))
    // Das Impressum des Schaufensters steht oben verlinkt; die Fußzeile nennt deshalb ausdrücklich das von KiezCoins
    // (Rechtsprüfung 11.11.2026)
    .replace('<a href="/impressum">Impressum</a>', () => (s?.imprint ? '<a href="/impressum">Impressum KiezCoins</a>' : '<a href="/impressum">Impressum</a>'));

  return new Response(seite, {
    status: s ? 200 : 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Kurz zwischenspeichern; Herzen lädt die Seite beim Tippen frisch
      'Cache-Control': 'public, max-age=0, s-maxage=60',
    },
  });
}
