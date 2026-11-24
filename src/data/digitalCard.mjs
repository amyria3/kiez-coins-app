// Inhalt der Digitalen Visitenkarte, gleich in der App (src/components/showcase/DigitalCard.tsx) und auf
// kiezcoins.de/s/<kurzname>/visitenkarte (api/_visitenkarte.mjs, dort als ortZeile und serviceListe). Reine Logik,
// geprüft in tests/visitenkarteKontakt.test.ts.

/**
 * Ortszeile unter dem Namen: Kiez und Stadt aus der Postleitzahl der Adresse, ohne Doppelung (Daria, 2026-11-23).
 * @param {{ kiez?: string | null; address?: string | null }} s
 * @returns {string}
 */
export function placeLine(s) {
  const kiez = String(s?.kiez ?? '').trim();
  const city = (String(s?.address ?? '').match(/\b\d{5}[ \t]+([^\n,]+)/)?.[1] ?? '').trim();
  if (!city) return kiez;
  if (!kiez || /^\d{5}$/.test(kiez)) return city;
  return kiez.toLowerCase().includes(city.toLowerCase()) ? kiez : `${kiez}, ${city}`;
}

/**
 * Services ohne Auszeichnung, ein Eintrag je Zeile (Aufzählungszeichen, **fett** und *kursiv* fallen weg).
 * @param {unknown} value
 * @returns {string[]}
 */
export function serviceItems(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/^\s*[-•·]\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').trim())
    .filter(Boolean);
}

/**
 * Bekannte soziale Netzwerke: Name und Muster für den Host. Ein Link zu einem davon steht unter „Soziale Netzwerke“,
 * alle anderen unter „Webseite(n)“ (Daria, 2026-11-23: „different cards: other social networks, contact, websites“, gilt
 * für die Schaufenster-Seite in App und Web und für die Digitale Visitenkarte).
 * @type {[RegExp, string][]}
 */
export const SOCIAL_NETWORKS = [
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)facebook\.com$/, 'Facebook'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
  [/(^|\.)linkedin\.com$/, 'LinkedIn'],
  [/(^|\.)(x\.com|twitter\.com)$/, 'X'],
  [/(^|\.)bsky\.app$/, 'Bluesky'],
  [/(^|\.)threads\.net$/, 'Threads'],
  [/(^|\.)mastodon\.social$/, 'Mastodon'],
  [/(^|\.)pinterest\.(com|de)$/, 'Pinterest'],
  [/(^|\.)behance\.net$/, 'Behance'],
  [/(^|\.)dribbble\.com$/, 'Dribbble'],
  [/(^|\.)github\.com$/, 'GitHub'],
  [/(^|\.)xing\.com$/, 'XING'],
];

/**
 * Kurze Adresse ohne https:// und www.
 * @param {string} url
 */
export const shortUrl = (url) => String(url).replace(/^https:\/\/(www\.)?/i, '').replace(/\/$/, '');

/**
 * Netzwerk und @Name eines Links, oder null für eine gewöhnliche Webseite. Bei LinkedIn und Bluesky steht vor dem
 * Namen ein Pfadteil („linkedin.com/in/<name>“), der nicht als Name zählt (Daria, 2026-11-18).
 * @param {string} link
 * @returns {{ network: string; handle: string } | null}
 */
export function socialLink(link) {
  const short = shortUrl(link);
  const [host, ...path] = short.split('/');
  const network = SOCIAL_NETWORKS.find(([re]) => re.test(host.toLowerCase()))?.[1];
  if (!network) return null;
  const name = path.filter(Boolean).find((p) => !/^(in|company|school|showcase|profile|user|pages|channel|c)$/i.test(p));
  return { network, handle: name && network !== 'YouTube' ? `@${name.replace(/^@/, '')}` : short };
}

/**
 * Kontaktangaben in drei Gruppen: Mail, Webseiten, soziale Netzwerke. Nur https-Links.
 * @param {{ email?: string | null; links?: string[] | null }} s
 * @returns {{ email: string; websites: string[]; social: string[] }}
 */
export function contactGroups(s) {
  const email = String(s?.email ?? '').trim();
  const links = (Array.isArray(s?.links) ? s.links : []).filter((l) => /^https:\/\//i.test(String(l)));
  return {
    email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : '',
    websites: links.filter((l) => !socialLink(l)),
    social: links.filter((l) => !!socialLink(l)),
  };
}
