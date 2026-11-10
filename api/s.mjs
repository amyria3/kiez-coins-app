// Öffentliche Seite eines Schaufensters: kiezcoins.de/s/<kurzname> (Daria, 2026-11-10).
//
// vercel.json leitet /s/:slug hierher. Die Funktion holt das Schaufenster über die Datenbankfunktion public_showcase
// (Migration 20261110000500_termin_herzen.sql) und füllt die Vorlage /teilen-vorlage wie die geteilten Posts (api/c.mjs).
// Nur Schaufenster mit Sichtbarkeit „Alle“ haben eine Seite. Termine lassen sich hier ohne Konto liken: einfacher
// Zähler (Daria: „Einfacher Zähler“), das Gerät merkt sich im Browser, welche Termine es geliked hat.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://aqxzxpxrshizlaqyjplw.supabase.co';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_WqrL7Y7Wm0l9cq4tHQpjAQ_iooAaNe0';
const SLUG = /^[a-z0-9][a-z0-9-]{2,39}$/;

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const foto = (path) =>
  path ? `${SUPABASE_URL}/storage/v1/object/public/photos/${path.split('/').map(encodeURIComponent).join('/')}` : null;

const kurz = (text, max) => {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
};

// Darias Herz aus der App (src/components/icons/svgs.ts)
const HERZ = '<svg width="22" height="22" aria-hidden="true" viewBox="0 0 35 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.13 19.80C4.69 17.98 4.69 17.99 4.65 17.83C3.49 14.30 3.44 13.36 3.30 11.33C3.04 7.67 2.67 7.39 3.59 4.23C3.92 3.08 4.60 2.44 4.72 2.32C5.96 1.15 6.98 -0.30 9.13 0.05C10.96 0.36 12.37 0.31 14.39 4.99C15.25 7.07 15.19 7.09 15.83 9.28C15.89 9.33 16.46 9.93 16.66 9.83C16.90 9.70 18.20 7.62 19.14 6.42C19.97 5.46 20.05 5.58 20.82 4.54C22.05 3.22 22.69 2.64 24.45 1.85C26.70 0.85 28.13 1.21 28.18 1.22C31.63 1.91 31.76 4.45 32.00 6.19C32.04 9.58 31.44 11.07 30.64 13.39C30.07 15.02 29.92 14.91 29.21 16.45C28.12 18.81 28.02 18.73 26.22 21.23C23.40 25.09 23.40 25.08 23.16 25.43C21.83 27.32 20.67 28.37 20.20 28.98C18.92 30.63 18.79 30.67 17.36 32.14C16.65 32.77 16.24 33.16 16.15 33.25C11.83 37.38 10.06 33.12 9.41 31.48C7.05 26.17 7.44 25.98 5.13 19.80Z M 19.91,20.47 C 18.90,19.97 18.22,20.78 19.16,21.92 C 19.56,22.40 20.56,23.58 21.84,23.72 C 22.47,23.78 22.41,23.13 22.37,23.03 C 22.34,22.94 22.32,22.89 21.59,22.01 C 21.48,21.87 20.61,20.82 19.91,20.47 M 17.38,22.29 C 17.05,22.52 16.36,23.45 17.95,24.71 C 17.97,24.74 17.98,24.72 18.29,24.95 C 18.58,25.18 18.56,25.19 18.82,25.44 C 18.90,25.51 18.94,25.59 19.02,25.67 C 20.09,26.68 21.24,25.72 20.23,24.35 C 19.85,23.83 18.82,22.62 18.39,22.40 C 17.86,22.11 17.42,22.25 17.38,22.29 M 20.97,17.81 C 20.20,18.15 21.16,19.04 21.17,19.06 C 22.09,20.04 22.26,20.16 22.38,20.22 C 23.72,21.10 24.26,20.67 23.97,20.03 C 23.53,19.10 23.47,19.13 23.37,19.03 C 22.74,18.48 22.78,18.44 22.14,17.90 C 21.69,17.51 21.05,17.78 20.97,17.81 M 14.44,25.29 C 14.11,25.88 15.07,26.21 16.07,27.58 C 16.13,27.68 16.47,28.14 17.20,28.41 C 17.81,28.63 18.45,27.85 18.12,26.91 C 17.78,25.91 17.09,25.72 16.94,25.45 C 16.84,25.25 16.82,25.06 16.71,24.87 C 16.66,24.81 16.54,24.80 16.51,24.74 C 16.45,24.88 16.42,24.86 16.37,24.99 C 16.31,25.17 16.35,25.19 16.34,25.19 C 16.28,25.21 16.23,25.09 16.16,25.06 C 16.09,25.02 16.01,25.04 15.94,25.02 C 15.88,24.99 15.83,24.94 15.76,24.91 C 14.85,24.58 14.50,25.20 14.44,25.29 M 23.08,15.69 C 22.20,15.15 21.70,15.48 22.15,16.28 C 22.63,17.10 22.93,18.11 24.17,18.03 C 24.66,18.00 24.90,17.90 24.69,17.31 C 24.35,16.42 23.80,16.20 23.31,15.84 C 23.23,15.80 23.16,15.74 23.08,15.69" fill-rule="evenodd" clip-rule="evenodd" fill="currentColor"/></svg>';

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

function kopf(s, url) {
  if (!s) return '<title>Schaufenster nicht gefunden – KiezCoins</title>';
  const titel = `${s.name} – KiezCoins`;
  const beschreibung = kurz(s.about, 200) || `${s.name} im Kiez, bei KiezCoins.`;
  const bild = foto(s.cover_path) ?? foto(s.logo_path);
  return [
    `<title>${esc(titel)}</title>`,
    `<meta name="description" content="${esc(beschreibung)}">`,
    '<meta property="og:site_name" content="KiezCoins">',
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="de_DE">',
    `<meta property="og:title" content="${esc(titel)}">`,
    `<meta property="og:description" content="${esc(beschreibung)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    bild ? `<meta property="og:image" content="${esc(bild)}">` : '',
    `<meta name="twitter:card" content="${bild ? 'summary_large_image' : 'summary'}">`,
  ]
    .filter(Boolean)
    .join('\n');
}

function eintrag(x) {
  const bild = foto(x.image_path);
  const img = bild ? `<img class="sf-bild" src="${esc(bild)}" alt="">` : '';
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

function inhalt(s) {
  if (!s) {
    return `  <h1>Dieses Schaufenster gibt es nicht, oder es ist nicht öffentlich.</h1>
  <p class="text">Vielleicht ist es nur für Eingeladene. Dann öffnest Du es in der App.</p>`;
  }
  const cover = foto(s.cover_path);
  const logo = foto(s.logo_path);
  const infos = [s.address, s.opening_hours].filter(Boolean).map((t) => `<p class="sf-klein">${esc(t)}</p>`).join('');
  const web = s.website
    ? `<p class="sf-klein"><a href="${esc(s.website)}" rel="noopener nofollow">${esc(s.website.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a></p>`
    : '';
  const eintraege = (s.entries ?? []).map(eintrag).join('\n');
  return `<style>
.geteilt .sf-cover { display: block; width: 100%; aspect-ratio: 16 / 9; border-radius: 20px; object-fit: cover; margin: 0 0 12px; }
.geteilt .sf-wer { display: flex; align-items: center; gap: 12px; margin: 0 0 12px; }
.geteilt .sf-logo { width: 64px; height: 64px; aspect-ratio: 1; border-radius: 50%; object-fit: cover; }
.geteilt .sf-wer h1 { margin: 0; }
.geteilt .sf-klein { font-size: 15px; color: var(--muted); margin: 0 0 4px; }
.geteilt .sf-liste { display: grid; gap: 32px; margin: 24px 0; }
.geteilt .sf-karte { background: var(--surface); border-radius: 20px; overflow: hidden; }
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
</style>
  ${cover ? `<img class="sf-cover" src="${esc(cover)}" alt="">` : ''}
  <div class="sf-wer">${logo ? `<img class="sf-logo" src="${esc(logo)}" alt="">` : ''}<h1>${esc(s.name)}</h1></div>
  ${s.kiez ? `<p class="wer">${esc(s.kiez)}</p>` : ''}
  ${s.about ? `<p class="text">${esc(s.about)}</p>` : ''}
  ${infos}${web}
  <div class="sf-liste">${eintraege || '<p class="sf-klein">Hier ist noch nichts los.</p>'}</div>
  ${s.imprint ? `<h2>Impressum</h2><p class="sf-klein" style="white-space: pre-line">${esc(s.imprint)}</p>` : ''}
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

  const vorlage = await fetch(new URL('/teilen-vorlage', url.origin));
  if (!vorlage.ok) return new Response('Vorlage fehlt', { status: 500 });
  const seite = (await vorlage.text())
    .replace('<!--KOPF-->', () => kopf(s, `${url.origin}/s/${slug}`))
    .replace('<!--POST-->', () => inhalt(s));

  return new Response(seite, {
    status: s ? 200 : 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Kurz zwischenspeichern; Herzen lädt die Seite beim Tippen frisch
      'Cache-Control': 'public, max-age=0, s-maxage=60',
    },
  });
}
