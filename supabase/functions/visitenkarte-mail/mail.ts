// Mail mit der Visitenkarte eines Schaufensters (Daria, 2026-11-17: „ne Mail von KiezCoins mit dem Link und der
// Visitenkarte (nicht als pdf als Code)“).
//
// Reine Funktionen ohne Deno- oder Netzwerkzugriff, damit tests/visitenkarteMail.test.ts sie mit Node prüft.
// Die Karte entspricht src/lib/businessCardCanvas.ts: vorne Gelbgrün mit Name, Kiez und Instant-Code, hinten
// dunkel mit Adresse, Öffnungszeiten, Services, Mail und Links.
//
// Mail-HTML: Layout aus Tabellen, Stile inline, Farben zusätzlich als bgcolor für Outlook. Der Instant-Code besteht
// aus Tabellenzellen und erscheint deshalb auch, wenn das Mailprogramm Bilder blockiert. Unbounded und Karla lädt
// nur, wer Webfonts zulässt (Apple Mail, iOS); Gmail und Outlook zeigen Arial.

export type CardMailData = {
  name: string;
  kiez?: string;
  address?: string;
  email?: string;
  openingHours?: string;
  services?: string;
  links: string[];
  /** https://kiezcoins.de/s/<kurzname>, Ziel des Instant-Codes und des Knopfs */
  url: string;
  /** Öffentliche Adresse des Logos; ohne Logo der Kater-Kopf */
  logoUrl?: string;
  /** Schaufenster in der App mit „Folgen“: https://app.kiezcoins.de/schaufenster/<id>?folgen=1 */
  appUrl?: string;
};

/** Instant-Code als Matrix: true = dunkles Modul */
export type QrMatrix = boolean[][];

const INK = '#000027';
const YELLOW = '#F0FFA6';
const BACK = '#2B2B57';
const WHITE = '#FFFFFF';
const PAGE = '#F4F4F0';
const MUTED = '#5C5C70';
const SITE = 'https://kiezcoins.de';
const KATER = `${SITE}/kater/kopf.png`;

const TITLE = "Unbounded, 'Arial Black', Arial, Helvetica, sans-serif";
const BODY = 'Karla, Arial, Helvetica, sans-serif';

export const esc = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const shortLink = (url: string) => url.replace(/^https:\/\/(www\.)?/i, '').replace(/\/$/, '');
const lines = (value?: string) =>
  (value ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
const br = (value?: string) => lines(value).map(esc).join('<br>');

/** Services ohne Auszeichnung wie servicesPlain in businessCardCanvas.ts: **fett** und *kursiv* fallen weg, „- “ wird „· “ */
export function servicesPlain(value?: string): string[] {
  return lines(value).map((l) => l.replace(/^[-•]\s+/, '· ').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1'));
}

/**
 * Vorname der Absender:in: nur Buchstaben, Leerzeichen, Bindestrich und Apostroph (kein Punkt, also keine Webadresse), höchstens 30 Zeichen.
 * Kein Freitext, damit niemand das Formular für Werbung oder Links nutzt. null = ungültig, '' = ohne Namen.
 */
export function cleanSenderName(input: unknown): string | null {
  if (input === undefined || input === null) return '';
  if (typeof input !== 'string') return null;
  const name = input.replace(/\s+/g, ' ').trim();
  if (!name) return '';
  if (name.length > 30 || !/^[\p{L}][\p{L} '’-]*$/u.test(name)) return null;
  return name;
}

export const isEmail = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * Instant-Code aus Tabellenzellen. Gleichfarbige Module einer Zeile werden zu einer Zelle mit colspan zusammengefasst,
 * so bleibt die Mail klein (Gmail kürzt Mails über 102 KB).
 */
export function qrTable(qr: QrMatrix, cell = 4): string {
  const n = qr.length;
  const rows = qr
    .map((row) => {
      const cells: string[] = [];
      let c = 0;
      while (c < n) {
        const dark = row[c];
        let run = 1;
        while (c + run < n && row[c + run] === dark) run++;
        const color = dark ? INK : WHITE;
        // Nur Attribute, keine Stile je Zelle: hält die Mail klein; Schriftgröße 0 steht an der Tabelle
        cells.push(`<td${run > 1 ? ` colspan="${run}"` : ''} width="${run * cell}" height="${cell}" bgcolor="${color}"></td>`);
        c += run;
      }
      return `<tr>${cells.join('')}</tr>`;
    })
    .join('');
  // Leere erste Zeile legt die Spaltenbreiten fest, sonst verteilt Outlook die colspans ungleich
  const grid = `<tr>${Array.from({ length: n }, () => `<td width="${cell}" height="0"></td>`).join('')}</tr>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;table-layout:fixed;width:${n * cell}px;font-size:0;line-height:0">${grid}${rows}</table>`;
}

const label = (text: string) =>
  `<div style="font-family:${TITLE};font-size:11px;line-height:14px;letter-spacing:.06em;text-transform:uppercase;color:${YELLOW};margin:0 0 6px">${esc(text)}</div>`;
const value = (html: string) =>
  `<div style="font-family:${BODY};font-size:15px;line-height:21px;color:${WHITE};margin:0 0 18px">${html}</div>`;

function backColumn(items: { title: string; html: string }[]): string {
  return items
    .filter((i) => i.html)
    .map((i) => label(i.title) + value(i.html))
    .join('');
}

/** Zwei Spalten, die auf schmalen Bildschirmen untereinander rutschen (inline-block), mit Geistertabelle für Outlook */
function columns(left: string, right: string): string {
  const col = (html: string, width: number) =>
    `<div style="display:inline-block;width:100%;max-width:${width}px;vertical-align:top">${html}</div>`;
  return `<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="200" valign="top"><![endif]-->${col(left, 200)}<!--[if mso]></td><td width="20"></td><td width="268" valign="top"><![endif]-->${col(right, 268)}<!--[if mso]></td></tr></table><![endif]-->`;
}

export function frontHtml(d: CardMailData, qr: QrMatrix): string {
  const mark = d.logoUrl ?? KATER;
  const nameSize = d.name.length > 28 ? 20 : d.name.length > 16 ? 24 : 28;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${YELLOW}" style="background:${YELLOW};border-radius:14px">
  <tr>
    <td valign="top" style="padding:20px 12px 20px 22px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="44" valign="middle"><img src="${esc(mark)}" width="44" height="44" alt="" style="display:block;width:44px;height:44px;border-radius:22px;border:2px solid ${INK};background:${WHITE}"></td>
        <td valign="middle" style="padding-left:10px;font-family:${TITLE};font-size:10px;letter-spacing:.06em;color:${INK}">SCHAUFENSTER</td>
      </tr></table>
      <div style="height:28px;line-height:28px;font-size:0">&nbsp;</div>
      <div style="font-family:${TITLE};font-weight:500;font-size:${nameSize}px;line-height:1.18;color:${INK};word-break:break-word">${esc(d.name)}</div>
      ${d.kiez ? `<div style="font-family:${BODY};font-size:15px;line-height:20px;color:${INK};margin-top:6px">${esc(d.kiez)}</div>` : ''}
    </td>
    <td width="148" valign="top" align="center" style="width:148px;padding:20px 22px 20px 0">
      <a href="${esc(d.url)}" style="text-decoration:none"><table role="presentation" cellpadding="8" cellspacing="0" border="0" bgcolor="${WHITE}" style="background:${WHITE};border:2px solid ${INK};border-radius:10px"><tr><td>${qrTable(qr)}</td></tr></table></a>
      <div style="font-family:${BODY};font-size:12px;line-height:16px;color:${INK};margin-top:8px"><a href="${esc(d.url)}" style="color:${INK};text-decoration:none">${shortLink(d.url).split('/').map(esc).join('/<wbr>')}</a></div>
    </td>
  </tr>
</table>`;
}

export function backHtml(d: CardMailData): string {
  const links = d.links
    .filter((l) => /^https:\/\//i.test(l))
    .map((l) => `<a href="${esc(l)}" style="color:${WHITE};text-decoration:underline">${esc(shortLink(l))}</a>`)
    .join('<br>');
  const left = backColumn([
    { title: 'Adresse', html: br(d.address) },
    { title: 'Öffnungszeiten', html: br(d.openingHours) },
  ]);
  const right = backColumn([
    { title: 'Services', html: servicesPlain(d.services).map(esc).join('<br>') },
    {
      title: 'E-Mail',
      html: d.email && isEmail(d.email) ? `<a href="mailto:${esc(d.email)}" style="color:${WHITE};text-decoration:underline">${esc(d.email)}</a>` : '',
    },
    { title: d.links.length > 1 ? 'Links' : 'Link', html: links },
  ]);
  if (!left && !right) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BACK}" style="background:${BACK};border-radius:14px">
  <tr><td style="padding:22px 22px 4px">${left && right ? columns(left, right) : left || right}</td></tr>
</table>`;
}

/** Betreff, HTML und Textfassung der Mail */
export function cardMail(d: CardMailData, qr: QrMatrix, sender: string): { subject: string; html: string; text: string } {
  // Eine Mail mit beiden Links (Daria, 2026-11-18): „Tritt der Community bei und abonniere das Schaufenster von …“
  // (App) und „Hier sind das Schaufenster und die Digitale Visitenkarte von …“ (Web, darunter die Karte)
  const subject = `Schaufenster und Digitale Visitenkarte von ${d.name}`;
  const name = `<strong>${esc(d.name)}</strong>`;
  const intro = sender ? `<br>${esc(sender)} schickt Dir die Links zum Schaufenster von ${name}.` : '';
  const join = d.appUrl
    ? `<tr><td style="font-family:${BODY};font-size:17px;line-height:25px;color:${INK};padding:0 4px 14px">Tritt der Community bei und abonniere das Schaufenster von ${name}.</td></tr>
  <tr><td style="padding:0 4px 28px">
    <a href="${esc(d.appUrl)}" style="display:inline-block;background:${INK};color:${YELLOW};font-family:${BODY};font-size:16px;line-height:20px;font-weight:bold;text-decoration:none;padding:13px 26px;border-radius:999px">In KiezKoins abonnieren</a>
  </td></tr>`
    : '';
  const web = `<a href="${esc(d.url)}" style="color:${INK}">Schaufenster</a>`;
  const back = backHtml(d);
  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
<style>
@font-face { font-family: Unbounded; font-weight: 500; src: url(${SITE}/fonts/Unbounded_500Medium.ttf) format('truetype'); }
@font-face { font-family: Karla; font-weight: 400; src: url(${SITE}/fonts/Karla_400Regular.ttf) format('truetype'); }
</style></head>
<body style="margin:0;padding:0;background:${PAGE}">
<div style="display:none;max-height:0;overflow:hidden">${esc(subject)}: ${esc(shortLink(d.url))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAGE}" style="background:${PAGE}">
<tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">
  <tr><td style="font-family:${BODY};font-size:17px;line-height:25px;color:${INK};padding:0 4px 20px">Ahoi!${intro}</td></tr>
  ${join}
  <tr><td style="font-family:${BODY};font-size:17px;line-height:25px;color:${INK};padding:0 4px 14px">Hier sind das ${web} und die Digitale Visitenkarte von ${name}.</td></tr>
  <tr><td>${frontHtml(d, qr)}</td></tr>
  ${back ? `<tr><td style="height:12px;line-height:12px;font-size:0">&nbsp;</td></tr><tr><td>${back}</td></tr>` : ''}
  <tr><td align="center" style="padding:28px 0 8px">
    <a href="${esc(d.url)}" style="display:inline-block;background:${INK};color:${YELLOW};font-family:${BODY};font-size:16px;line-height:20px;font-weight:bold;text-decoration:none;padding:13px 26px;border-radius:999px">Schaufenster ansehen</a>
  </td></tr>
  <tr><td style="font-family:${BODY};font-size:12px;line-height:18px;color:${MUTED};padding:24px 4px 0;text-align:center">
    Jemand hat diese Mail über <a href="${esc(d.url)}" style="color:${MUTED}">${esc(shortLink(d.url))}</a> an Dich geschickt.
    Deine Adresse haben wir nur für diese Mail genutzt und nicht gespeichert. Weitere Mails bekommst Du nicht.<br>
    <a href="${SITE}" style="color:${MUTED}">KiezKoins</a> · <a href="${SITE}/impressum" style="color:${MUTED}">Impressum</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const back2 = [
    ['Adresse', lines(d.address).join(', ')],
    ['Öffnungszeiten', lines(d.openingHours).join(', ')],
    ['Services', servicesPlain(d.services).join('\n')],
    ['E-Mail', d.email ?? ''],
    [d.links.length > 1 ? 'Links' : 'Link', d.links.filter((l) => /^https:\/\//i.test(l)).join('\n')],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}:\n${v}`);
  const text = [
    'Ahoi!',
    ...(sender ? [`${sender} schickt Dir die Links zum Schaufenster von ${d.name}.`] : []),
    '',
    ...(d.appUrl ? [`Tritt der Community bei und abonniere das Schaufenster von ${d.name}:`, d.appUrl, ''] : []),
    `Hier sind das Schaufenster und die Digitale Visitenkarte von ${d.name}:`,
    d.url,
    '',
    d.name,
    ...(d.kiez ? [d.kiez] : []),
    '',
    ...back2.flatMap((b) => [b, '']),
    `Schaufenster ansehen: ${d.url}`,
    '',
    `Jemand hat diese Mail über ${shortLink(d.url)} an Dich geschickt. Deine Adresse haben wir nur für diese Mail genutzt und nicht gespeichert.`,
  ].join('\n');
  return { subject, html, text };
}

export type ContactData = {
  name: string;
  email: string;
  phone?: string;
  place?: string;
  message?: string;
  /** Hat die Person die Visitenkarte im selben Schritt per Mail bekommen? (Kontakte tauschen) */
  cardSent: boolean;
};

/**
 * Mail an das Team, wenn jemand über die Visitenkarte den eigenen Kontakt schickt (Daria, 2026-11-23). Geht an die
 * Kontakt-Mail des Schaufensters; „Antworten“ geht an die Person. Die Angaben stehen nur in dieser Mail, KiezCoins
 * speichert sie nicht.
 */
export function contactMail(showcase: string, url: string, c: ContactData, date: string): { subject: string; html: string; text: string } {
  const subject = `Neuer Kontakt über Deine Digitale Visitenkarte: ${c.name}`;
  const rows: [string, string][] = [
    ['Name', c.name],
    ['Mail', c.email],
    ...(c.phone ? [['Telefon', c.phone] as [string, string]] : []),
    ['Kennengelernt', c.place ? `am ${date} bei ${c.place}` : `am ${date}`],
    ...(c.message ? [['Nachricht', c.message] as [string, string]] : []),
  ];
  const note = c.cardSent
    ? `${c.name} hat im selben Schritt Eure Digitale Visitenkarte per Mail bekommen.`
    : `${c.name} hat Euch die Kontaktdaten geschickt, ohne Eure Digitale Visitenkarte per Mail.`;
  const row = ([k, v]: [string, string]) =>
    `<tr><td style="font-family:${BODY};font-size:13px;line-height:20px;color:${MUTED};padding:6px 12px 6px 0;vertical-align:top;white-space:nowrap">${esc(k)}</td>
    <td style="font-family:${BODY};font-size:16px;line-height:22px;color:${INK};padding:6px 0;vertical-align:top">${br(v)}</td></tr>`;
  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${PAGE}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAGE}" style="background:${PAGE}">
<tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">
  <tr><td style="font-family:${BODY};font-size:17px;line-height:25px;color:${INK};padding:0 4px 18px">
    Über die Digitale Visitenkarte von <strong>${esc(showcase)}</strong> hat Dir jemand den eigenen Kontakt geschickt.
  </td></tr>
  <tr><td style="background:${WHITE};border-radius:14px;padding:16px 20px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">${rows.map(row).join('')}</table>
  </td></tr>
  <tr><td style="font-family:${BODY};font-size:15px;line-height:22px;color:${INK};padding:18px 4px 0">${esc(note)} Mit „Antworten“ schreibst Du direkt an ${esc(c.email)}.</td></tr>
  <tr><td style="font-family:${BODY};font-size:12px;line-height:18px;color:${MUTED};padding:24px 4px 0;text-align:center">
    Die Person hat eingewilligt, dass ${esc(showcase)} diese Angaben erhält. KiezCoins hat sie nur weitergeleitet und nicht gespeichert.<br>
    <a href="${esc(url)}" style="color:${MUTED}">${esc(shortLink(url))}</a> · <a href="${SITE}/datenschutz" style="color:${MUTED}">Datenschutz</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
  const text = [
    `Über die Digitale Visitenkarte von ${showcase} hat Dir jemand den eigenen Kontakt geschickt.`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    `${note} Mit „Antworten“ schreibst Du direkt an ${c.email}.`,
    '',
    `Die Person hat eingewilligt, dass ${showcase} diese Angaben erhält. KiezCoins hat sie nur weitergeleitet und nicht gespeichert.`,
  ].join('\n');
  return { subject, html, text };
}
