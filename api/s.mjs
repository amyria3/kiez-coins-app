// Öffentliche Seite eines Schaufensters: kiezcoins.de/s/<kurzname> (Daria, 2026-11-10).
//
// vercel.json leitet /s/:slug hierher. Die Funktion holt das Schaufenster über die Datenbankfunktion public_showcase
// (Migration 20261110000500_termin_herzen.sql) und füllt die Vorlage /teilen-vorlage wie die geteilten Posts (api/c.mjs).
// Nur Schaufenster mit Sichtbarkeit „Alle“ haben eine Seite. Termine lassen sich hier ohne Konto liken: einfacher
// Zähler (Daria: „Einfacher Zähler“), das Gerät merkt sich im Browser, welche Termine es geliked hat.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://aqxzxpxrshizlaqyjplw.supabase.co';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_WqrL7Y7Wm0l9cq4tHQpjAQ_iooAaNe0';
const SLUG = /^[a-z0-9][a-z0-9-]{2,39}$/;
// Feste Adresse für Suchmaschinen (canonical, JSON-LD), auch wenn die Seite über kiezcoins.vercel.app aufgerufen wird
const SITE = 'https://kiezcoins.de';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const foto = (path) =>
  path ? `${SUPABASE_URL}/storage/v1/object/public/photos/${path.split('/').map(encodeURIComponent).join('/')}` : null;

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

const leer = (text) => `<p class="sf-klein sf-leer">${text}</p>`;

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
  return res.json();
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
// Öffnungszeiten stehen als freier Text in der App und passen nicht ins Format von schema.org, deshalb fehlen sie hier.
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
      <a class="sf-link" href="/app/challenge/${esc(x.id)}?von=schaufenster">In KiezCoins öffnen</a>
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

// Visitenkarte zum Teilen und Drucken (Daria, 2026-11-12: „kann die Visitenkarte nicht teilen“). Dieselbe Karte wie in
// der App unter Verwalten › Visitenkarte exportieren: website/visitenkarte.js aus src/lib/businessCardCanvas.ts.
// Beim Teilen gehen Name, Adresse und Link als Text mit. Schriften unter den Namen, die die Zeichnung erwartet.
function visitenkarte(s, links) {
  const daten = {
    name: s.name,
    kiez: s.kiez || undefined,
    address: s.address || undefined,
    openingHours: s.opening_hours || undefined,
    services: s.services || undefined,
    links: links.filter((l) => /^https:\/\//i.test(l)),
    url: `${SITE}/s/${s.slug}`,
    logoUri: foto(s.logo_path) ?? undefined,
  };
  return `<style>
@font-face { font-family: Unbounded_500Medium; font-display: block; src: url(/fonts/Unbounded_500Medium.ttf) format('truetype'); }
@font-face { font-family: Karla_400Regular; font-display: block; src: url(/fonts/Karla_400Regular.ttf) format('truetype'); }
@font-face { font-family: Karla_500Medium; font-display: block; src: url(/fonts/Karla_500Medium.ttf) format('truetype'); }
.geteilt .sf-vk { margin: 0 0 56px; }
.geteilt .sf-vk-bild { display: block; width: 100%; max-width: 420px; aspect-ratio: 85 / 55; border-radius: 10px; margin: 0 0 12px; }
.geteilt .sf-vk-knoepfe { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; }
.geteilt .sf-vk button { cursor: pointer; }
.geteilt .sf-vk .sf-vk-haupt { border: 0; border-radius: 999px; padding: 12px 22px; background: var(--text); color: var(--bg); font: 500 15px/1 Inter, sans-serif; letter-spacing: .01em; }
.geteilt .sf-vk .sf-vk-neben { border: 0; background: none; padding: 8px 0; font: inherit; font-size: 15px; color: var(--text); text-decoration: underline; }
.geteilt .sf-vk button:disabled { opacity: .5; cursor: default; }
</style>
  <h2 class="sf-abschnitt">Visitenkarte</h2>
  <section class="sf-vk" aria-label="Visitenkarte">
    <img class="sf-vk-bild" alt="Visitenkarte von ${esc(s.name)}" hidden>
    <div class="sf-vk-knoepfe">
      <button type="button" class="sf-vk-haupt" data-vk="teilen" disabled>Visitenkarte teilen</button>
      <button type="button" class="sf-vk-neben" data-vk="drucken" disabled>Drucken oder als PDF</button>
    </div>
    <p class="sf-klein sf-vk-hinweis" hidden></p>
  </section>
<script src="/visitenkarte.js" defer></script>
<script>
addEventListener('DOMContentLoaded', async () => {
  const VK = window.KiezVisitenkarte;
  const box = document.querySelector('.sf-vk');
  if (!VK || !box) { box && (box.hidden = true); return; }
  const d = ${JSON.stringify(daten).replace(/</g, '\\u003c')};
  const seiten = await VK.drawBusinessCard(d);
  if (!seiten) { box.hidden = true; return; }
  const bild = box.querySelector('.sf-vk-bild');
  bild.src = seiten.front.toDataURL('image/png');
  bild.hidden = false;
  const hinweis = box.querySelector('.sf-vk-hinweis');
  for (const b of box.querySelectorAll('button')) b.disabled = false;
  box.querySelector('[data-vk="teilen"]').addEventListener('click', async () => {
    const r = await VK.shareCard(seiten, d);
    hinweis.hidden = r !== 'downloaded';
    hinweis.textContent = 'Beide Seiten liegen jetzt in Deinen Downloads.';
  });
  box.querySelector('[data-vk="drucken"]').addEventListener('click', () => VK.printCard(seiten, d.name));
});
</script>`;
}

function inhalt(s) {
  if (!s) {
    return `  <h1>Dieses Schaufenster gibt es nicht, oder es ist nicht öffentlich.</h1>
  <p class="text">Vielleicht ist es nur für Eingeladene. Dann öffnest Du es in der App.</p>`;
  }
  const cover = foto(s.cover_path);
  const logo = foto(s.logo_path);
  // Angaben mit kleinen Überschriften, Zeilenumbrüche bleiben (Daria, 2026-11-12)
  const fakt = (label, html) => `<div class="sf-fakt"><dt>${label}</dt><dd>${html}</dd></div>`;
  const infos = [
    fakt('Adresse', s.address ? esc(s.address) : '<span class="sf-leer">Noch keine Adresse</span>'),
    fakt('Öffnungszeiten', s.opening_hours ? esc(s.opening_hours) : '<span class="sf-leer">Noch keine Öffnungszeiten</span>'),
  ].join('');
  // Mehrere Links (Migration 20261110000600); vorher nur die Webseite
  const links = Array.isArray(s.links) && s.links.length ? s.links : s.website ? [s.website] : [];
  const web = fakt(
    links.length > 1 ? 'Links' : 'Link',
    links
      .filter((l) => /^https:\/\//i.test(l))
      .map((l) => `<a href="${esc(l)}" rel="noopener nofollow">${esc(l.replace(/^https:\/\/(www\.)?/i, '').replace(/\/$/, ''))}</a>`)
      .join('<br>') || '<span class="sf-leer">Noch keine Links</span>',
  );
  const eintraege = (s.entries ?? []).map(eintrag).join('\n');
  // Noch nichts gepostet: Abschnitte für Termine und Posts mit einem ersten Post als Platzhalter
  const ohneEintraege = `<h2 class="sf-abschnitt">Termine</h2>${leer('Noch keine Termine')}
  <h2 class="sf-abschnitt">Posts</h2>
  <div class="sf-liste"><article class="sf-karte sf-platzhalter" aria-label="Platzhalter">
    <div class="sf-bild sf-verlauf" aria-hidden="true"></div><div class="sf-inhalt">
      <p class="sf-art sf-post">Post</p>
      <h2>Hier erscheint der erste Post</h2>
      <p class="sf-text">Neuigkeiten, Angebote und Fotos aus dem Schaufenster.</p>
    </div></article></div>`;
  return `<style>
${
  // Ohne eigene Farbe: neutral, ruhig und etwas elegant statt des blassen Lilas der Website (Daria, 2026-11-12,
  // Vorbild tubikstudio.com). Die Farbe kommt aus den Fotos und der Visitenkarte, nicht aus dem Hintergrund.
  s.bg_color ? farbe(s.bg_color) : NEUTRAL
}'
}
/* KiezCoins-Logo oben klein, das Schaufenster steht im Vordergrund (Daria, 2026-11-10) */
/* Klein, ohne Slogan, rechts, mit Abstand darunter (Daria, 2026-11-10) */
.top { justify-content: flex-end; padding: 28px 0 0; margin-bottom: 40px; }
.top .brand { align-items: flex-end; }
.top .brand svg { height: 11px; width: auto; }
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
.geteilt .sf-wer h1 { margin: 0; padding-bottom: 4px; font: 500 32px/33px Unbounded, var(--display); letter-spacing: 0; }
/* Abschnitte klein in Versalien mit feiner Linie darüber, wie bei Studios (Daria, 2026-11-12) */
.geteilt h2.sf-abschnitt { font: 500 12px/16px Inter, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--muted);
  margin: 48px 0 16px; padding-top: 20px; border-top: 1px solid var(--line); }
.geteilt .sf-klappe summary h2.sf-abschnitt { flex: 1; }
.geteilt .sf-fakten { display: grid; gap: 16px; margin: 28px 0 8px; }
@media (min-width: 560px) { .geteilt .sf-fakten { grid-template-columns: 1fr 1fr; gap: 20px 32px; } }
.geteilt .sf-fakt dt { font: 500 12px/16px Inter, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); margin: 0 0 6px; }
.geteilt .sf-fakt dd { margin: 0; font-size: 16px; line-height: 1.5; white-space: pre-line; }
.geteilt .sf-fakt dd a { text-underline-offset: 3px; }
.geteilt .sf-services p, .geteilt .sf-services ul { margin: 0 0 12px; }
.geteilt .sf-services ul { padding-left: 20px; }
.geteilt .sf-services li { margin: 0 0 4px; }
/* Services eingeklappt, wenn die Gründer:in das will (services_collapsed) */
.geteilt .sf-klappe summary { list-style: none; cursor: pointer; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.geteilt .sf-klappe summary::-webkit-details-marker { display: none; }
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
/* Platzhalter (Daria, 2026-11-11) */
.geteilt .sf-verlauf { background: linear-gradient(135deg, #8F90FA 0%, #FFB2E5 55%, #FFAD7E 100%); }
.geteilt .sf-kater { display: flex; align-items: center; justify-content: center; background: #000; }
.geteilt .sf-ende { margin-bottom: 40px; }
.geteilt .sf-leer { font-style: italic; opacity: .8; }
.geteilt .sf-platzhalter { background: none; border: 1px dashed var(--muted); opacity: .75; }
.geteilt .sf-platzhalter .sf-bild { opacity: .5; }
</style>
  ${cover ? `<img class="sf-cover sf-mit-logo" src="${esc(cover)}" alt="Titelbild von ${esc(s.name)}">` : '<div class="sf-cover sf-mit-logo sf-verlauf" aria-hidden="true"></div>'}
  <div class="sf-wer">${logo ? `<img class="sf-logo" src="${esc(logo)}" alt="Logo von ${esc(s.name)}">` : `<span class="sf-logo sf-kater">${KATER}</span>`}<h1>${esc(s.name)}</h1></div>
  ${s.kiez ? `<p class="wer">${esc(s.kiez)}</p>` : ''}
  ${s.about ? `<p class="text">${esc(s.about)}</p>` : leer('Noch keine Beschreibung')}
  <dl class="sf-fakten">${infos}${web}</dl>
  ${s.imprint ? '<p class="sf-klein"><a href="#impressum">Impressum</a></p>' : ''}
  ${
    !s.services
      ? `<h2 class="sf-abschnitt">Services</h2>${leer('Noch keine Services')}`
      : s.services_collapsed
        ? `<details class="sf-klappe"><summary><h2 class="sf-abschnitt">Services</h2></summary><div class="sf-services">${richHtml(s.services)}</div></details>`
        : `<h2 class="sf-abschnitt">Services</h2><div class="sf-services">${richHtml(s.services)}</div>`
  }
  ${eintraege ? `<div class="sf-liste">${eintraege}</div>` : ohneEintraege}
  ${
    s.terms
      ? `<details class="sf-klappe"><summary><h2 class="sf-abschnitt">AGB</h2></summary><div class="sf-services">${richHtml(s.terms)}</div></details>`
      : `<h2 class="sf-abschnitt">AGB</h2>${leer('AGB noch nicht hinterlegt')}`
  }
  <h2 class="sf-abschnitt" id="impressum">Impressum</h2>
  <div class="sf-ende">${s.imprint ? `<p class="sf-klein" style="white-space: pre-line">${esc(s.imprint)}</p>` : leer('Impressum noch nicht hinterlegt')}</div>
  ${/* Visitenkarte am Schluss der Seite (Daria, 2026-11-12) */ visitenkarte(s, links)}
<script>
(() => {
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

export async function GET(request) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') ?? '').toLowerCase();
  const s = SLUG.test(slug) ? await ladeSchaufenster(slug) : null;

  // Die Gründer:in hat die Adresse geändert: dauerhaft auf die neue weiterleiten, damit alte Links und QR-Codes
  // funktionieren und Suchmaschinen die neue Adresse übernehmen
  if (!s && SLUG.test(slug)) {
    const neu = await neuerKurzname(slug);
    if (neu) return Response.redirect(new URL(`/s/${neu}`, url.origin), 301);
  }

  const vorlage = await fetch(new URL('/teilen-vorlage', url.origin));
  if (!vorlage.ok) return new Response('Vorlage fehlt', { status: 500 });
  const seite = (await vorlage.text())
    // Öffentliche Schaufenster dürfen in Suchmaschinen erscheinen; die Vorlage sperrt das sonst (geteilte Posts, 404)
    .replace('<meta name="robots" content="noindex">', () =>
      s ? '<meta name="robots" content="index, follow, max-image-preview:large">' : '<meta name="robots" content="noindex">',
    )
    .replace('<!--KOPF-->', () => kopf(s, `${SITE}/s/${slug}`))
    .replace('<!--POST-->', () => inhalt(s))
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
