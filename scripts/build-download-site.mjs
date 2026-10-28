// Baut die Download-Seite in den Ordner `website/`: Startseite mit Formular für den Einladungscode plus
// Impressum, Datenschutz, Nutzungsbedingungen und Community-Regeln aus `src/data/legal.ts` (dieselben Texte wie in der App).
// Aufruf: `npm run build:website` baut zuerst die Web-App nach `website/app/` und danach diese Seiten.
// Nur die Seiten ohne Web-App: node scripts/build-download-site.mjs
// Die Startseite zeigt einen klickbaren Prototyp der App (scripts/site/prototyp.js) und Illustrationen
// (scripts/site/kunst.mjs). Icons, Kater und Coins kommen aus denselben SVGs wie die App.
// Vercel baut und veröffentlicht `website/` bei jedem Push (vercel.json). Ablauf: Documentation,
// kiez-coins/app/Stand_App.md, Abschnitt „Website kiezcoins.de“.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'website');
// TypeScript-Dateien ohne Importe (legal.ts, Icons) nach JS übersetzen und laden
const ts = (await import('typescript')).default;
async function loadTs(rel) {
  const js = ts.transpileModule(readFileSync(join(root, rel), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const tmp = join(root, `scripts/.${rel.replace(/\W+/g, '-')}.tmp.mjs`);
  writeFileSync(tmp, js);
  try {
    return await import(tmp);
  } finally {
    rmSync(tmp);
  }
}
const { LEGAL_STAND, legalDocIds, legalDocs } = await loadTs('src/data/legal.ts');
// Dateinamen der Seiten
const fileOf = { impressum: 'impressum', datenschutz: 'datenschutz', bedingungen: 'nutzungsbedingungen', regeln: 'community-regeln' };
const config = JSON.parse(readFileSync(join(root, 'scripts/download-site.config.json'), 'utf8'));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const open = JSON.stringify(legalDocs).match(/\[offen:[^\]]*\]/g);
if (open) console.warn(`Achtung, noch offen: ${[...new Set(open)].join(', ')}`);

const css = `
:root { --bg:#FAFBEF; --surface:#FFFFFF; --text:#26233A; --muted:#4A465E; --accent:#5260E0; --error:#D6334A; --line:rgba(38,35,58,.10); }
* { box-sizing:border-box; }
html { background:var(--bg); color:var(--text); }
body { margin:0; font:300 16px/1.5 Inter, system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width:560px; margin:0 auto; padding:48px 16px 32px; }
h1 { font-size:40px; line-height:1.1; letter-spacing:-.02em; margin:24px 0 12px; font-weight:600; }
h2 { font-size:20px; margin:32px 0 8px; font-weight:500; }
p { color:var(--muted); margin:0 0 12px; }
a { color:var(--text); }
.logo { width:96px; height:96px; border-radius:28px; background:var(--surface); border:1px solid var(--line); display:grid; place-items:center; }
.logo img { width:48px; height:56px; }
.card { background:var(--surface); border-radius:20px; padding:20px; margin:24px 0; }
label { display:block; font-size:14px; color:var(--muted); margin-bottom:6px; }
input { width:100%; font:inherit; color:var(--text); background:var(--bg); border:1px solid var(--line); border-radius:12px; padding:12px 14px; }
button, .button { display:block; text-align:center; text-decoration:none; box-sizing:border-box; width:100%; margin-top:12px; font:500 16px/1 Inter, system-ui, sans-serif; color:#FFFFFF; background:var(--accent); border:0; border-radius:999px; padding:16px; cursor:pointer; }
.error { color:var(--error); font-size:14px; margin:8px 0 0; }
.steps { padding-left:20px; color:var(--muted); margin:0; }
.steps li { margin-bottom:6px; }
footer { display:flex; flex-wrap:wrap; gap:16px; font-size:13px; margin-top:40px; padding-top:16px; border-top:1px solid var(--line); }
footer a { color:var(--muted); }
.updated { font-size:13px; }
`;

const footer = `<footer>
  <a href="./">Start</a>
  <a href="impressum.html">Impressum</a>
  <a href="datenschutz.html">Datenschutz</a>
  <a href="nutzungsbedingungen.html">Nutzungsbedingungen</a>
  <a href="community-regeln.html">Community-Regeln</a>
</footer>`;

const page = (title, body) => `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<link rel="icon" href="favicon.png">
<style>${css}</style>
</head>
<body>
<main>
${body}
${footer}
</main>
</body>
</html>
`;

// ---------- Startseite mit Prototyp ----------
const { iconSvgs } = await loadTs('src/components/icons/svgs.ts');
const brand = await loadTs('src/components/icons/brandSvgs.ts');
const { crownSvg } = await loadTs('src/components/icons/crownSvg.ts');
const { diamondSvgs } = await loadTs('src/components/icons/diamondSvgs.ts');
const { brandArt } = await loadTs('src/components/icons/brandArt.ts');
const art = (name) => ({ w: brandArt[name].width, h: brandArt[name].height, svg: brandArt[name].svg });
const { figuren, kartenbilder, filterDefs } = await import('./site/kunst.mjs');
const C = { text: '#F0F0F0', muted: '#A0A0A0', purple: '#7E94FF', pink: '#FFB2E5', green: '#93F4A7', dark: '#1F2123' };
const icon = (name, c) => ({ w: iconSvgs[name].width, h: iconSvgs[name].height, svg: iconSvgs[name].svg(c) });
const kcSvg = {
  heart: icon('heart', C.muted),
  heartOn: icon('heart', C.pink),
  gear: icon('settings', C.muted),
  clock: icon('clock', C.text),
  comment: icon('comment', C.muted),
  send: icon('send', C.muted),
  camera: icon('camera', C.text),
  pin: icon('map-pin', C.text),
  // Doppelherz = Feed (Daria, 26.10.2026), in Pink für die Herz-Animation nach dem Posten
  feed: icon('feed', C.text),
  feedOn: icon('feed', C.pink),
  burger: icon('burger', C.muted),
  close: icon('close', C.text),
  check: icon('check', C.dark),
  hands: icon('wir-schaffen-das', C.dark),
  checkGreen: icon('check', C.green),
  wordmark: { w: 132, h: 25, svg: brand.wordmarkSvg(C.purple) },
  // Kater und Logo von Daria (assets/brand/, übernommen mit scripts/brand-import.mjs)
  cat: art('kater-normal'),
  catHigh: art('kater-high'),
  catMoney: art('kater-money'),
  logo: art('logo'),
  coins: { w: 30, h: 35, svg: brand.coinsSvg },
  crown: { w: crownSvg.width, h: crownSvg.height, svg: crownSvg.svg(C.text) },
  diamond: { w: diamondSvgs[1].width, h: diamondSvgs[1].height, svg: diamondSvgs[1].svg(C.text) },
  diamond2: { w: diamondSvgs[2].width, h: diamondSvgs[2].height, svg: diamondSvgs[2].svg(C.text) },
  diamond3: { w: diamondSvgs[3].width, h: diamondSvgs[3].height, svg: diamondSvgs[3].svg(C.text) },
  cameraDark: icon('camera', C.dark),
};
// Logo für den Seitenkopf: Schriftzug wie in der App, die Katze vorne ersetzt durch Darias FatCat (scripts/site/fatcat.svg, 26.10.2026).
// Die ersten acht Pfade im Logo sind die alte Katze. Die FatCat bekommt die Logo-Farbe, damit seite.css sie mit umfärbt.
const logoSeite = (() => {
  const pfade = kcSvg.logo.svg.match(/<path[\s\S]*?\/>/g);
  const fat = readFileSync(join(root, 'scripts/site/fatcat.svg'), 'utf8').match(/<path[\s\S]*?\/>/)[0].replace(/fill="[^"]*"/, 'fill="#7E94FF"');
  const katze = `<g transform="translate(0.5 1.5) scale(${(24 / 35).toFixed(4)})">${fat}</g>`;
  let svg = kcSvg.logo.svg.replace(pfade[0], katze);
  for (const alt of pfade.slice(1, 8)) svg = svg.replace(alt, '');
  return { ...kcSvg.logo, svg };
})();
const sized = (d, h) => d.svg.replace(/width="[^"]*" height="[^"]*"/, `width="${Math.round((d.w / d.h) * h)}" height="${h}" aria-hidden="true"`);
// Dateien mit Prüfsumme im Namen-Parameter, damit Browser nach einem Update die neue Fassung laden
const version = (text) => createHash('sha1').update(text).digest('hex').slice(0, 8);
const siteDir = join(root, 'scripts/site');
// Fotos für die Karten (Quellen und Lizenz: scripts/site/fotos/QUELLEN.md). Fehlt ein Foto, zeigt der Prototyp die Zeichnung.
const fotoDir = join(siteDir, 'fotos');
const fotos = existsSync(fotoDir) ? readdirSync(fotoDir).filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4)) : [];
const datenJs = `window.KC = ${JSON.stringify({ svg: kcSvg, art: kartenbilder, fotos })};\n`;
const appJs = readFileSync(join(siteDir, 'prototyp.js'), 'utf8');
const seiteCss = readFileSync(join(siteDir, 'seite.css'), 'utf8');

// ---------- Sprachen der Startseite (Daria, 26.10.2026) ----------
// Deutsch unter /, alle anderen unter /<code>/. Im Code steht je Text Deutsch und Englisch: t('Deutsch', 'English').
// Die übrigen Sprachen liegen in scripts/site/sprachen/<code>.json, Schlüssel ist der deutsche Text.
// Fehlt dort ein Text (etwa weil er gerade neu ist), zeigt die Seite die englische Fassung.
// Reihenfolge im Menü nach Alter der Sprache, die älteste zuerst (Daria, 26.10.2026)
const sprachen = [
  { code: 'he', name: 'עברית', rtl: true },
  { code: 'ar', name: 'العربية', rtl: true },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'uk', name: 'Українська' },
  { code: 'ru', name: 'Русский' },
];
const sprachDir = join(root, 'scripts/site/sprachen');
const normText = (s) => s.replace(/\s+/g, ' ').trim();
const woerter = Object.fromEntries(
  sprachen
    .filter((l) => existsSync(join(sprachDir, `${l.code}.json`)))
    .map((l) => {
      const dict = JSON.parse(readFileSync(join(sprachDir, `${l.code}.json`), 'utf8'));
      // Gerades Apostroph würde die JS-Strings auf der Seite beenden, daher typografisch
      return [l.code, Object.fromEntries(Object.entries(dict).map(([k, v]) => [normText(k), v.replace(/'/g, '’')]))];
    }),
);
const fehlend = new Map();
const uebersetzer = (L) => (de, en) => {
  if (L === 'de') return de;
  if (L === 'en') return en;
  const v = woerter[L]?.[normText(de)];
  if (v == null) {
    if (!fehlend.has(L)) fehlend.set(L, new Set());
    fehlend.get(L).add(de);
  }
  return v ?? en;
};
const pfad = (L) => (L === 'de' ? '/' : `/${L}/`);

const ios = (L) => {
  const t = uebersetzer(L);
  const P = L === 'de' ? '' : '/';
  return config.testflightUrl
  ? `<div class="card" id="iphone">
  <h3>iPhone</h3>
  <p>${t('Auf dem iPhone läuft Kiez Coins über TestFlight, Apples App für Testversionen.', 'On the iPhone, Kiez Coins runs via TestFlight, Apple’s app for beta versions.')}</p>
  <a class="button" href="${esc(config.testflightUrl)}">${t('Kiez Coins in TestFlight öffnen', 'Open Kiez Coins in TestFlight')}</a>
</div>`
  : `<div class="card" id="iphone">
  <h3>iPhone</h3>
  <p>${t('Auf dem iPhone läuft Kiez Coins als Web-App in Safari. Auf dem Home-Bildschirm startet sie wie eine App.', 'On the iPhone, Kiez Coins runs as a web app in Safari. From the home screen it starts like an app.')}</p>
  <a class="button" href="${P}app/">${t('Kiez Coins öffnen', 'Open Kiez Coins')}</a>
  <ol class="steps">
    <li>${t('Diese Seite in <strong>Safari</strong> öffnen und „Kiez Coins öffnen“ tippen.', 'Open this page in <strong>Safari</strong> and tap “Open Kiez Coins”.')}</li>
    <li>${t('Unten in der Leiste auf das Teilen-Symbol tippen (Quadrat mit Pfeil nach oben).', 'Tap the share icon in the bottom bar (square with an arrow pointing up).')}</li>
    <li>${t('„Zum Home-Bildschirm“ wählen und „Hinzufügen“ tippen.', 'Choose “Add to Home Screen” and tap “Add”.')}</li>
    <li>${t('Kiez Coins ab jetzt über das neue Symbol starten und einmal anmelden.', 'From now on, start Kiez Coins from the new icon and sign in once.')}</li>
  </ol>
  <p class="klein">${t('Kamera, Fotos und Standort fragt Safari beim ersten Mal ab. Push-Benachrichtigungen gibt es in der Web-App nicht. Updates kommen automatisch beim nächsten Start.', 'Safari asks for camera, photos and location the first time. The web app has no push notifications. Updates arrive automatically on the next start.')}</p>
</div>`;
};
// Sprachauswahl oben rechts: kleines Menü mit Kürzel, darin die Sprachen in ihrer eigenen Schrift.
// <details> klappt auch ohne JavaScript auf.
const sprachwahl = (L) => {
  const t = uebersetzer(L);
  return `<details class="sprachwahl"><summary aria-label="${t('Sprache', 'Language')}: ${sprachen.find((l) => l.code === L).name}">${L.toUpperCase()}</summary><ul>${sprachen
    .map((l) => `<li><a href="${pfad(l.code)}" hreflang="${l.code}" lang="${l.code}"${l.rtl ? ' dir="rtl"' : ''}${l.code === L ? ' aria-current="true"' : ''}>${l.name}</a></li>`)
    .join('')}</ul></details>`;
};

// ---------- Spendenaktion der Testphase (Daria, 2026-10-23) ----------
// Als Testperson zählt, wer die Umfrage in der App abgeschickt hat (Funktion `tester_count`, Migration 20261023000200).
// Ziel und Betrag stehen in scripts/download-site.config.json (`testerGoal`, `donationEuro`). Blumen: scripts/site/blumen/,
// zerlegt aus scripts/site/blumen.webp mit scripts/blumen-zerlegen.py.
// Jede Pflanze ist ein eigenes Bild. Sie gleitet beim ersten Sichtkontakt von unten aufs Blatt, als schöbe eine Hand
// sie hin; die Reihenfolge läuft locker von links nach rechts.
const blumenDir = join(siteDir, 'blumen');
const blumen = JSON.parse(readFileSync(join(blumenDir, 'teile.json'), 'utf8'));
const blumenTeile = blumen.teile
  .map((t, i) => {
    const mitte = t.x + t.b / 2;
    const dx = Math.round((50 - mitte) / -6); // links von links, rechts von rechts
    const dreh = ((i % 2 ? 1 : -1) * (2 + (i % 3))).toFixed(1);
    const verzug = i * 85 + (i % 3) * 45;
    return `    <img src="/blumen/${t.datei}?v=${version(readFileSync(join(blumenDir, t.datei)))}" alt="" loading="lazy" decoding="async" style="left:${t.x}%;top:${t.y}%;width:${t.b}%;--dx:${dx}%;--dreh:${dreh}deg;--verzug:${verzug}ms">`;
  })
  .join('\n');
const goal = config.testerGoal ?? 15;
const donation = config.donationEuro ?? 100;
const spenden = `<section class="spenden" id="spenden" aria-labelledby="spenden-titel">
  <div class="spenden-blumen" id="spenden-blumen" role="img" aria-label="Wildblumen: Akelei, Kornblume, Mohn, Nachtkerze, Wiesenknopf und andere">
${blumenTeile}
  </div>
  <div class="spenden-text">
    <h2 id="spenden-titel">Magst Du Blumen? Ich auch!</h2>
    <p>Damit Leipzig blüht, spende ich ${donation}&nbsp;€ an den Ökolöwen, wenn ${goal} Menschen meine App testen und bewerten.</p>
    <p class="spenden-claim"><b>KiezCoins:</b> Von hier. Für den Kiez. Modern.</p>
    <p>Teste die App und hilf uns, das Spendenziel zu erreichen.</p>
    <div class="zaehler" aria-live="polite"><b id="tester-zahl">0</b><span>von ${goal} haben getestet und bewertet</span></div>
    <div class="balken" id="tester-balken" role="progressbar" aria-label="Testpersonen" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="0"><span></span></div>
    <a class="button" href="/#download">Jetzt testen</a>
  </div>
</section>`;

const leute = [
  // Foto statt Zeichnung, freigestellt mit schmalem Rand (Daria, 28.10.2026)
  { foto: 'frau3.webp', w: 446, h: 572, alt: 'Lachende Frau mit Brille', altEn: 'Laughing woman with glasses', text: 'Viel besser als Doomscrolling', en: 'Way better than doomscrolling' },
  { foto: 'mann.webp', w: 558, h: 489, alt: 'Lachender Mann mit Brille', altEn: 'Laughing man with glasses', text: 'Wie GitHub für den Alltag', en: 'Like GitHub for everyday life' },
  { foto: 'frau.webp', w: 484, h: 590, alt: 'Junge Frau in Jacke', altEn: 'Young woman in a jacket', text: 'Schon praktisch', en: 'Pretty handy' },
  { foto: 'mann2.webp', w: 600, h: 430, alt: 'Lachender Mann mit Brille und Anzug', altEn: 'Laughing man with glasses and a suit', text: 'I like the idea', en: 'I like the idea' },
  { foto: 'mann3.webp', w: 652, h: 486, alt: 'Lachender älterer Mann im Jeanshemd', altEn: 'Laughing older man in a denim shirt', text: 'Gemeinsam statt einsam', en: 'Together, not alone' },
  { foto: 'frau4.webp', w: 551, h: 496, alt: 'Lachende Frau mit grauen Locken', altEn: 'Laughing woman with grey curls', text: 'Gut investierte Zeit', en: 'Time well spent' },
  { foto: 'frau5.webp', w: 584, h: 492, alt: 'Junge Frau mit Baskenmütze und Kaffeebecher', altEn: 'Young woman with a beret and a coffee cup', text: 'Ganz fresh auf dem Markt und fast schon Avantgarde', en: 'Fresh on the market and almost avant-garde' },
  { foto: 'frau6.webp', w: 575, h: 483, alt: 'Lachende junge Frau im gelben Pullover', altEn: 'Laughing young woman in a yellow sweater', text: 'Weniger Bullshit, mehr Leben', en: 'Less bullshit, more life' },
];

const startseite = (L) => {
  const t = uebersetzer(L);
  const P = L === 'de' ? '' : '/';
  const rtl = sprachen.find((l) => l.code === L).rtl;
  return `<!doctype html>
<html lang="${L}"${rtl ? ' dir="rtl"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#DCE1FF">
<title>Kiez Coins – ${t('Kleine Challenges für mehr echte Gemeinschaft', 'Small challenges for more real community')}</title>
<meta name="description" content="${t('Kennst Du das? Irgendwas muss erledigt werden, doch wer in Gottes Namen soll das machen? KiezCoins bietet ein Interface, um Arbeit besser zu verteilen - zu Hause oder im Kiez. Zusammen sind wir stärker, gesünder, glücklicher, wohlhabender und bekommen sogar mehr gebacken!', 'Sound familiar? Something needs doing, but who on earth is going to do it? KiezCoins gives you an interface to share work better – at home or in your neighborhood. Together we’re stronger, healthier, happier, wealthier and we even get more done!')}">
<link rel="icon" href="${P}favicon.png">
${sprachen.map((l) => `<link rel="alternate" hreflang="${l.code}" href="${pfad(l.code)}">`).join('\n')}
<link rel="preload" href="${P}fonts/InterTight_600SemiBold.ttf" as="font" type="font/ttf" crossorigin>
<link rel="stylesheet" href="${P}seite.css?v=${version(seiteCss)}">
<script>document.documentElement.classList.add('js')</script>
</head>
<body>
${filterDefs}
<div class="fx-spur" aria-hidden="true"></div>
<div class="wrap">
<header class="top">
  <a class="brand" href="${L === 'de' ? './' : pfad(L)}" aria-label="${t('Kiez Coins, Startseite', 'Kiez Coins, home')}">${sized(logoSeite, 34)}<span class="marke" lang="en">The actually pro-social App</span></a>
  <nav class="top-links"><a class="top-link" href="#download"><span class="lang">${t('Testversion laden', 'Get the beta')}</span><span class="kurz">${t('Testen', 'Try it')}</span></a>${sprachwahl(L)}</nav>
</header>

<main>
<section class="hero" id="prototyp-bereich">
  <div class="hero-text">
    <h1>${t('Kleine Challenges für mehr echte Gemeinschaft', 'Small challenges for more real community')}</h1>
    <p class="lede">${t('Kennst Du den Spruch „Tue Gutes und rede darüber“? Und hier ist Space dafür, weil wir alle so ein bisschen voneinander lernen. Angeben und freundschaftlicher Wettbewerb sind Teil des Games!', 'Know the saying “Do good and talk about it”? This is the space for it, because we all learn a little from each other. Showing off and friendly competition are part of the game!')}</p>
  </div>
  <div class="steuerung">
  <div class="rolle" id="rolle" role="radiogroup" aria-label="${t('Ort im Prototyp', 'Place in the prototype')}">
    <span class="szenario-mark" aria-hidden="true"></span>
    <button type="button" role="radio" aria-checked="false" data-rolle="ich" aria-controls="prototyp">${t('Nur ich', 'Just me')}</button>
    <button type="button" role="radio" aria-checked="false" data-rolle="gruppe" aria-controls="prototyp">${t('Meine Gruppen', 'My groups')}</button>
    <button type="button" role="radio" aria-checked="true" data-rolle="kiez" aria-controls="prototyp">${t('Mein Kiez', 'My neighborhood')}</button>
  </div>
  <div class="szenarien" id="szenarien" aria-label="${t('Prototyp steuern', 'Control the prototype')}">
    <span class="szenario-mark" aria-hidden="true"></span>
    <button type="button" data-szenario="me" aria-pressed="false" aria-controls="prototyp"><b>Me-Challenge</b><i>Me-Challenge</i><span>${t('How do you feel today? Teile einen Life-Hack oder ein besonders kinder- und budgetfreundliches Rezept. Oder fordere Dich selbst heraus und tue etwas richtig Nettes für Mensch oder Tier. Angeben und freundschaftlicher Wettbewerb sind gewollt!', 'How do you feel today? Share a life hack or an especially kid- and budget-friendly recipe. Or challenge yourself and do something really nice for people or animals. Showing off and friendly competition are welcome!')}</span></button>
    <button type="button" data-szenario="we" aria-pressed="false" aria-controls="prototyp"><b>We-Challenge</b><i>We-Challenge</i><span>${t('Dir ist etwas aufgefallen, was getan werden müsste, was Du aber nicht selbst tun kannst? Poste eine We-Challenge in Deinem Kiez, setze eine Belohnung aus und lehn Dich erst mal zurück. Wir sind gespannt, was sich so alles bewegen lässt!', 'Noticed something that needs doing, but you can’t do it yourself? Post a We-Challenge in your neighborhood, set a reward and sit back for a while. We’re curious how much we can get moving!')}</span></button>
    <button type="button" data-szenario="bild" aria-pressed="false" aria-controls="prototyp"><b>${t('Nur ein Bild', 'Just a photo')}</b><i>${t('Bild', 'Photo')}</i><span>${t('Teile mit Deinen Nachbar:innen besondere Momente, Orte oder Buchempfehlungen.', 'Share special moments, places or book tips with your neighbors.')}</span></button>
    <button type="button" data-szenario="feed" aria-pressed="false" aria-controls="prototyp"><b>Feed</b><i>Feed</i><span>${t('Wie in jedem sozialen Netzwerk: sehen, was andere Menschen so posten. Hol Dir Inspiration, Tipps, Life Hacks & Satisfaction über erledigte Challenges.', 'Like any social network: see what other people post. Get inspiration, tips, life hacks & satisfaction from completed challenges.')}</span></button>
  </div>
  <p class="szenario-text" id="szenario-text" aria-hidden="true">${t('How do you feel today? Teile einen Life-Hack oder ein besonders kinder- und budgetfreundliches Rezept. Oder fordere Dich selbst heraus und tue etwas richtig Nettes für Mensch oder Tier. Angeben und freundschaftlicher Wettbewerb sind gewollt!', 'How do you feel today? Share a life hack or an especially kid- and budget-friendly recipe. Or challenge yourself and do something really nice for people or animals. Showing off and friendly competition are welcome!')}</p>
  </div>
  <div class="phone-spalte">
  <div class="phone" id="prototyp" role="region" aria-label="${t('Klickbarer Prototyp der App Kiez Coins', 'Clickable prototype of the Kiez Coins app')}">
    <div class="p-screen"></div>
  </div>
  <p class="hinweis">${t('Das Telefon ist klickbar. Alle Daten darin sind Beispiele.', 'The phone is clickable. All data in it are examples.')}</p>
  </div>
</section>
</main>
</div>

<section class="mehr" aria-labelledby="mehr-titel">
  <div class="wrap">
    <h2 id="mehr-titel">${t('Kann die App noch mehr?', 'Can the app do more?')}</h2>
    <p>${t('Klar. Tipp auf eine Karte und probier es aus.', 'Sure. Tap a card and try it out.')}</p>
    <div class="mehr-karten">
      <div class="mehr-karte mehr-karte-fest" data-mehr="rangliste" style="--c:${C.pink}">
        <span class="mehr-icon">${sized({ ...kcSvg.crown, svg: crownSvg.svg(C.dark) }, 26)}</span>
        <b>${t('Rangliste in der Gruppe', 'Leaderboard in your group')}</b>
        <ol class="mehr-buehne mehr-rang" aria-hidden="true">
          <li data-rang="peter" style="--a:#FFAD7E"><span class="mehr-avatar">P</span><span>Peter</span><b>18</b></li>
          <li data-rang="lena" style="--a:#FFB2E5"><span class="mehr-avatar">L</span><span>Lena</span><b>14</b></li>
          <li data-rang="du" class="is-ich" style="--a:#7E94FF"><span class="mehr-avatar">${t('D', 'Y')}</span><span>${t('Du', 'You')}</span><b>12</b></li>
        </ol>
        <button type="button" class="mehr-aktion">${t('Aufgabe erledigt?', 'Task done?')}</button>
        <span class="mehr-status" aria-live="polite">${t('Du magst es kompetitiv? Jede erledigte Aufgabe bringt Dich nach oben.', 'Like it competitive? Every task you get done moves you up.')}</span>
      </div>
      <button type="button" class="mehr-karte" data-mehr="freunde" style="--c:${C.green}">
        <span class="mehr-icon">${sized(icon('friends', C.dark), 30)}</span>
        <b>${t('Freunde hinzufügen', 'Add friends')}</b>
        <span class="mehr-buehne mehr-freunde" aria-hidden="true">
          <span class="mehr-avatar" style="--a:#FFB2E5">L</span><span class="mehr-avatar" style="--a:#FFAD7E">P</span><span class="mehr-avatar" style="--a:#93F4A7">M</span>
        </span>
        <span class="mehr-status" aria-live="polite">${t('Tipp und füg Lena hinzu.', 'Tap to add Lena.')}</span>
      </button>
      <button type="button" class="mehr-karte" data-mehr="nachrichten" style="--c:${C.purple}">
        <span class="mehr-icon">${sized(icon('message', C.dark), 30)}</span>
        <b>${t('Nachrichten an Freunde schicken', 'Send messages to friends')}</b>
        <span class="mehr-buehne mehr-chat" aria-hidden="true"></span>
        <span class="mehr-status" aria-live="polite">${t('Tipp und schreib Lena.', 'Tap to text Lena.')}</span>
      </button>
    </div>
  </div>
</section>

<section class="leute" aria-labelledby="leute-titel">
  <div class="wrap">
    <h2 id="leute-titel">${t('Kiez Coins passt zwischen Briefkasten und Fahrradkeller.', 'Kiez Coins fits between the mailbox and the bike cellar.')}</h2>
    <p>${t('Aufgaben, die sonst liegen bleiben, erledigt jemand safe - als wäre es ein Spiel', 'Tasks that would otherwise pile up get done for sure – as if it were a game')}</p>
    <div class="szene">
${leute.map((l) => `      <div class="person" tabindex="0"><svg class="ruf" viewBox="0 0 40 40" aria-hidden="true"><path d="M14 14a10 10 0 0 1 12 0"/><path d="M9 8a17 17 0 0 1 22 0"/><path d="M22 22l8 -3"/><path d="M20 26l9 2"/></svg><p class="blase">${esc(t(l.text, l.en))}</p>${l.foto ? `<img class="figur figur-foto" src="${P}leute/${l.foto}?v=${version(readFileSync(join(siteDir, 'leute', l.foto)))}" alt="${esc(t(l.alt, l.altEn))}" width="${l.w}" height="${l.h}" loading="lazy" decoding="async">` : l.figur}</div>`).join('\n')}
    </div>
  </div>
</section>

<section class="download" id="download" aria-labelledby="download-titel">
  <div class="wrap">
    <h2 id="download-titel">${t('So installierst Du die Testversion.', 'How to install the beta.')}</h2>
    <p>${t('Kiez Coins ist in der Testphase. Android lädt die App mit Einladungscode, das iPhone nutzt die Web-App.', 'Kiez Coins is in beta. Android downloads the app with an invitation code, the iPhone uses the web app.')}</p>
    <div class="karten">
      <div class="card" id="android">
        <h3>Android</h3>
        <form method="post" action="${esc(config.functionUrl)}">
          <label for="passwort">${t('Einladungscode', 'Invitation code')}</label>
          <input id="passwort" name="passwort" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" required>
          <p class="error" id="fehler" hidden></p>
          <button type="submit">${t('App herunterladen', 'Download the app')}</button>
        </form>
        <a class="button button-zweit" href="${P}app/">${t('Direkt im Browser anmelden und ausprobieren', 'Sign in and try it right in the browser')}</a>
        <ol class="steps">
          <li>${t('Einladungscode eingeben und „App herunterladen“ tippen.', 'Enter the invitation code and tap “Download the app”.')}</li>
          <li>${t('Die Datei <em>kiez-coins.apk</em> öffnen, wenn der Download fertig ist.', 'Open the file <em>kiez-coins.apk</em> when the download is finished.')}</li>
          <li>${t('Android fragt, ob Dein Browser Apps installieren darf. Erlauben und „Installieren“ tippen.', 'Android asks whether your browser may install apps. Allow it and tap “Install”.')}</li>
          <li>${t('Für ein Update lädst Du die neue Datei hier herunter und installierst sie genauso. Deine Daten bleiben erhalten.', 'To update, download the new file here and install it the same way. Your data stays.')}</li>
        </ol>
      </div>
      ${ios(L)}
    </div>
    <footer>
      <a href="${P}impressum.html">${t('Impressum', 'Legal notice')}</a>
      <a href="${P}datenschutz.html">${t('Datenschutz', 'Privacy')}</a>
      <a href="${P}nutzungsbedingungen.html">${t('Nutzungsbedingungen', 'Terms of use')}</a>
      <a href="${P}community-regeln.html">${t('Community-Regeln', 'Community rules')}</a>
      <a href="https://waldentdeckenberlin.org/voll-der-mist/" rel="noopener">${t('Bildquellen', 'Photo credits')}</a>
    </footer>
  </div>
</section>

<button type="button" class="kater-kopf" id="kater-kopf" aria-haspopup="dialog" aria-controls="kater" aria-label="Cat The Käptn">
  <img src="${P}kater/kopf.png?v=${version(readFileSync(join(siteDir, 'kater', 'kopf.png')))}" alt="" width="240" height="162">
</button>
<div class="kater" id="kater" role="dialog" aria-modal="true" aria-label="Cat The Käptn" hidden>
  <div class="kater-buehne">
    <p class="blase kater-blase">Love to get stuff done.</p>
    <img class="kater-bild" src="${P}kater/kater.png" alt="${t('Cat The Käptn mit Sonnenbrille, Schürze und Besen', 'Cat The Käptn with sunglasses, apron and broom')}" width="560" height="698">
    <div class="kater-wege">
      <button type="button" data-kater="oben">${t('Nach oben', 'Back to top')}</button>
      <button type="button" data-kater="download">${t('Zum Download', 'To the download')}</button>
      <a class="kater-hallo-link" href="/kater">${t('Hallo sagen', 'Say hi')}</a>
    </div>
  </div>
</div>

<script src="${P}prototyp/daten.js?v=${version(datenJs)}"></script>
${woerter[L] ? `<script>window.KC_T = ${JSON.stringify(woerter[L]).replace(/</g, '\\u003c')};</script>` : ''}
<script src="${P}prototyp/app.js?v=${version(appJs)}"></script>
<script>
  // Sprachmenü schließt beim Tipp daneben und mit Escape
  var sprache = document.querySelector('.sprachwahl');
  document.addEventListener('click', function (e) { if (sprache.open && !sprache.contains(e.target)) sprache.open = false; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sprache.open) { sprache.open = false; sprache.querySelector('summary').focus(); } });
  // Fehler vom Download zeigen
  var f = new URLSearchParams(location.search).get('fehler');
  var t = { passwort: '${t('Der Einladungscode stimmt nicht.', 'The invitation code is not correct.')}', datei: '${t('Die App-Datei fehlt gerade. Versuche es später noch mal.', 'The app file is missing right now. Please try again later.')}', technik: '${t('Der Download ist gerade nicht eingerichtet.', 'The download is not set up right now.')}' }[f];
  if (t) { var e = document.getElementById('fehler'); e.textContent = t; e.hidden = false; document.getElementById('download').scrollIntoView(); }
  // Sprechblasen erscheinen, sobald die Leute im Bild sind. Tipp auf eine Figur lässt sie wackeln.
  var leute = document.querySelector('.leute');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { leute.classList.add('is-seen'); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(leute);
  } else leute.classList.add('is-seen');
  // Kater: Kopf schaut links herein, Klick zeigt den ganzen Kater mit zwei Wegen
  var kopf = document.getElementById('kater-kopf');
  var kater = document.getElementById('kater');
  function katerZu(weiter) {
    kater.classList.remove('is-open');
    kopf.classList.remove('is-weg');
    setTimeout(function () { kater.hidden = true; if (weiter) weiter(); else kopf.focus(); }, 380);
  }
  kopf.addEventListener('click', function () {
    kater.hidden = false;
    kopf.classList.add('is-weg');
    void kater.offsetWidth;
    kater.classList.add('is-open');
    kater.querySelector('[data-kater]').focus({ preventScroll: true });
  });
  kater.addEventListener('click', function (e) {
    var b = e.target.closest('[data-kater]');
    if (b) {
      var ziel = b.dataset.kater === 'oben' ? document.body : document.getElementById('download');
      return katerZu(function () { ziel.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
    }
    if (!e.target.closest('.kater-bild, .kater-blase')) katerZu();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !kater.hidden) katerZu(); });
  // Die Leute sagen nur etwas bei Hover, Fokus oder Tipp. Ab und zu ruft eine Person, damit man mit der Maus hingeht (Daria, 28.10.2026).
  var personen = [].slice.call(leute.querySelectorAll('.person'));
  leute.addEventListener('click', function (e) {
    var p = e.target.closest('.person');
    if (!p) return;
    var an = !p.classList.contains('is-on');
    personen.forEach(function (x) { x.classList.remove('is-on'); });
    if (an) p.classList.add('is-on');
    var fig = p.querySelector('.figur');
    fig.classList.remove('is-wave'); void fig.getBoundingClientRect(); fig.classList.add('is-wave');
  });
  leute.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('person')) { e.preventDefault(); e.target.click(); }
  });
  var rufTimer = null, letzte = -1;
  function rufen() {
    var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var frei = personen.filter(function (x, i) { return i !== letzte && !x.matches(':hover') && !x.classList.contains('is-on'); });
    if (frei.length && !document.hidden && leute.classList.contains('is-seen') && !still) {
      var p = frei[Math.floor(Math.random() * frei.length)];
      letzte = personen.indexOf(p);
      p.classList.remove('is-ruft'); void p.offsetWidth; p.classList.add('is-ruft');
      setTimeout(function () { p.classList.remove('is-ruft'); }, 1600);
    }
    rufTimer = setTimeout(rufen, 2600 + Math.random() * 2600);
  }
  rufTimer = setTimeout(rufen, 1200);
  // Kann die App noch mehr? Jede Karte spielt bei jedem Tipp einen kleinen Schritt vor.
  var mehr = { rangliste: 0, freunde: 0, nachrichten: 0 };
  var freunde = ['Lena', 'Peter', 'Mo'];
  var chat = [
    ['${t('Kommst Du Samstag mit in den Garten?', 'Coming to the garden on Saturday?')}', '${t('Klar! Ich bring Kaffee mit.', 'Sure! I’ll bring coffee.')}'],
    ['${t('Hast Du den Igel gesehen?', 'Have you seen the hedgehog?')}', '${t('OMG, ja, wie süß!', 'OMG, yes, so cute!')}'],
    ['${t('Danke fürs Gießen!', 'Thanks for watering!')}', '${t('Gern, die Kanne steht wieder unter der Treppe.', 'Sure, the can is back under the stairs.')}'],
  ];
  function blase(buehne, text, mein) {
    var b = document.createElement('span');
    b.className = 'mehr-blase' + (mein ? ' is-mein' : '');
    b.textContent = text;
    buehne.appendChild(b);
    while (buehne.children.length > 3) buehne.removeChild(buehne.firstChild);
  }
  document.querySelector('.mehr-karten').addEventListener('click', function (e) {
    var k = e.target.closest('[data-mehr]');
    if (!k) return;
    if (k.dataset.mehr === 'rangliste' && !e.target.closest('.mehr-aktion')) return;
    var art = k.dataset.mehr, n = ++mehr[art], buehne = k.querySelector('.mehr-buehne'), status = k.querySelector('.mehr-status');
    if (art === 'rangliste') {
      // Jeder Tipp bringt Dir Edensteine; die Liste ordnet sich neu (FLIP). Nach Platz 1 startet sie neu.
      var liste = buehne, du = liste.querySelector('[data-rang="du"]'), punkte = du.querySelector('b');
      var reihen = Array.prototype.slice.call(liste.children);
      var vorher = {};
      reihen.forEach(function (li) { vorher[li.dataset.rang] = li.getBoundingClientRect().top; });
      if (n > 3) { mehr.rangliste = 0; punkte.textContent = '12'; } else punkte.textContent = String(+punkte.textContent + [1, 3, 3][n - 1]);
      reihen.sort(function (a, b) { return +b.querySelector('b').textContent - +a.querySelector('b').textContent; }).forEach(function (li) { liste.appendChild(li); });
      reihen.forEach(function (li) {
        var dy = vorher[li.dataset.rang] - li.getBoundingClientRect().top;
        if (!dy) return;
        li.style.transition = 'none'; li.style.transform = 'translateY(' + dy + 'px)';
        li.offsetWidth; li.style.transition = ''; li.style.transform = '';
      });
      var platz = Array.prototype.indexOf.call(liste.children, du);
      status.textContent = n > 3 ? '${t('Neue Woche, neues Glück.', 'New week, new luck.')}'
        : platz === 0 ? '${t('Du führst! May the best win.', 'You’re in the lead! May the best win.')}'
        : n === 1 ? '${t('1 Edenstein. Noch 2 bis Lena.', '1 Eden stone. 2 more to Lena.')}'
        : '${t('Du überholst Lena.', 'You overtake Lena.')}';
    } else if (art === 'freunde') {
      var av = buehne.querySelectorAll('.mehr-avatar');
      if (n > av.length) { mehr.freunde = 0; av.forEach(function (a) { a.classList.remove('is-freund'); }); status.textContent = '${t('Tipp und füg Lena hinzu.', 'Tap to add Lena.')}'; return; }
      av[n - 1].classList.add('is-freund');
      status.textContent = n < av.length ? '${t('{a} ist jetzt dabei. Tipp für {b}.', '{a} is in. Tap for {b}.')}'.replace('{a}', freunde[n - 1]).replace('{b}', freunde[n]) : '${t('Einfach vernetzen mit QR-Code oder Link.', 'Connect easily with a QR code or link.')}';
    } else {
      var paar = chat[(n - 1) % chat.length];
      blase(buehne, paar[0], true);
      status.textContent = '${t('Lena schreibt …', 'Lena is typing …')}';
      setTimeout(function () { blase(buehne, paar[1], false); status.textContent = '${t('Tipp für die nächste Nachricht.', 'Tap for the next message.')}'; }, 900);
    }
  });
</script>
<script>
  // Scrolleffekte: A Abschnitte blenden ein, B Kater und Telefon bewegen sich leicht mit, C Fortschrittsbalken oben,
  // D Abschnitte stapeln sich wie Karten (Daria, 26.10.2026). Bei „Bewegung reduzieren“ bleibt alles still.
  (function () {
    var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var root = document.documentElement;
    if (!still) root.classList.add('fx-a', 'fx-b', 'fx-c', 'fx-d');
    if (still) return;
    // A: Abschnitte gleiten beim Erreichen von unten herein, Karten nacheinander
    if (root.classList.contains('fx-a') && 'IntersectionObserver' in window) {
      var els = document.querySelectorAll('.mehr h2, .mehr > .wrap > p, .mehr-karte, .leute h2, .leute > .wrap > p, .download h2, .download > .wrap > p, .download .card');
      var seh = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-da'); seh.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -12% 0px' });
      els.forEach(function (el) {
        var i = [].indexOf.call(el.parentNode.children, el);
        if (el.matches('.mehr-karte, .card')) el.style.setProperty('--i', i);
        el.classList.add('fx-zeigen');
        seh.observe(el);
      });
    }
    // D: Jeder Abschnitt bleibt stehen, sobald sein Ende im Bild ist, der nächste schiebt sich darüber.
    // Dafür braucht jeder Abschnitt seine Höhe als --h (top: min(0, 100vh - Höhe) in seite.css).
    if (root.classList.contains('fx-d')) {
      var stapel = document.querySelectorAll('body > .wrap, .mehr, .leute');
      var messen = function () { stapel.forEach(function (el) { el.style.setProperty('--h', el.offsetHeight + 'px'); }); };
      if ('ResizeObserver' in window) { var ro = new ResizeObserver(messen); stapel.forEach(function (el) { ro.observe(el); }); }
      addEventListener('resize', messen);
      messen();
      // Eine neue Karte steigt erst sehr langsam auf und holt dann zur Scrollposition auf (Daria, 28.10.2026)
      var karten = document.querySelectorAll('.mehr, .leute, .download');
      var tick = false;
      var heben = function () {
        tick = false;
        var vh = innerHeight;
        karten.forEach(function (el) {
          el.style.transform = '';
          var t = el.getBoundingClientRect().top;
          // Deckkraft steigt beim Aufsteigen von 0,3 auf 0,6, der Blur bleibt gleich (Daria, 28.10.2026)
          var x0 = Math.min(1, Math.max(0, t / vh));
          el.style.setProperty('--a', (0.6 - 0.3 * x0).toFixed(3));
          if (t <= 0 || t >= vh) return;
          var x = t / vh;
          var v = vh * (1 - Math.pow(1 - x, 3));
          el.style.transform = 'translateY(' + (v - t).toFixed(1) + 'px)';
        });
      };
      addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(heben); } }, { passive: true });
      heben();
    }
    // B und C hängen an der Scrollposition, ein Frame pro Bild
    var kopf = document.getElementById('kater-kopf'), tel = document.querySelector('.phone-spalte'), spur = document.querySelector('.fx-spur');
    var letzt = scrollY, kipp = 0, wartet = false;
    function frame() {
      wartet = false;
      var y = scrollY, max = Math.max(1, document.documentElement.scrollHeight - innerHeight), p = Math.min(1, y / max);
      if (root.classList.contains('fx-b')) {
        // Kater wandert gemächlich mit und neigt den Kopf in Scrollrichtung
        kipp += (Math.max(-14, Math.min(14, (y - letzt) * .6)) - kipp) * .25;
        kopf.style.setProperty('--ky', ((.5 - p) * 140).toFixed(1) + 'px');
        kopf.style.setProperty('--kr', kipp.toFixed(2) + 'deg');
        if (y < innerHeight * 1.2) tel.style.setProperty('--ty', (y * -.12).toFixed(1) + 'px');
        if (Math.abs(kipp) > .05) planen();
      }
      if (root.classList.contains('fx-c')) spur.style.setProperty('--p', p.toFixed(4));
      letzt = y;
    }
    function planen() { if (!wartet) { wartet = true; requestAnimationFrame(frame); } }
    addEventListener('scroll', planen, { passive: true });
    addEventListener('resize', planen);
    frame();
  })();
</script>
</body>
</html>
`
};

// ---------- Einladung: /einladung/<code> trägt den Einladungscode schon ein ----------
// Vercel leitet /einladung/:code auf diese Seite (vercel.json unten). Das Skript liest den Code aus der Adresse
// und setzt ihn ins versteckte Feld. Der Download startet erst nach dem Tipp (Daria, 22.10.2026).
// Pfade sind absolut, weil die Seite unter /einladung/<code> liegt.
const einladung = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#FAFBEF">
<title>Einladung – Kiez Coins</title>
<link rel="icon" href="/favicon.png">
<link rel="stylesheet" href="/seite.css?v=${version(seiteCss)}">
</head>
<body>
<div class="wrap">
<header class="top">
  <a class="brand" href="/" aria-label="Kiez Coins, Startseite">${sized(logoSeite, 34)}<span class="marke" lang="en">The actually pro-social App</span></a>
</header>
<main>
<section class="download einladung" id="download" aria-labelledby="einladung-titel">
  <h2 id="einladung-titel">Du bist eingeladen.</h2>
  <p>Kiez Coins ist in der Testphase. Dein Einladungscode steckt schon im Link, Du musst nichts eintippen.</p>
  <p class="error" id="ohne-code" hidden>In diesem Link fehlt der Einladungscode. Frage bei der Person nach, die ihn Dir geschickt hat.</p>
  <div class="karten">
    <div class="card" id="android">
      <h3>Android</h3>
      <form method="post" action="${esc(config.functionUrl)}">
        <input type="hidden" name="passwort" id="code">
        <p class="error" id="fehler" hidden></p>
        <button type="submit">App herunterladen</button>
      </form>
      <a class="button button-zweit" href="/app/">Direkt im Browser anmelden und ausprobieren</a>
      <ol class="steps">
        <li>„App herunterladen“ tippen.</li>
        <li>Die Datei <em>kiez-coins.apk</em> öffnen, wenn der Download fertig ist.</li>
        <li>Android fragt, ob Dein Browser Apps installieren darf. Erlauben und „Installieren“ tippen.</li>
      </ol>
    </div>
    ${ios('de').replace(/href="app\/"/g, 'href="/app/"')}
  </div>
  <footer>
    <a href="/impressum">Impressum</a>
    <a href="/datenschutz">Datenschutz</a>
    <a href="/nutzungsbedingungen">Nutzungsbedingungen</a>
    <a href="/community-regeln">Community-Regeln</a>
  </footer>
</section>
</main>
</div>
<script>
  // Code aus /einladung/<code>, ersatzweise ?code=… oder #…
  var teile = location.pathname.split('/').filter(Boolean);
  var code = teile[0] === 'einladung' && teile[1] ? decodeURIComponent(teile[1]) : '';
  code = code || new URLSearchParams(location.search).get('code') || decodeURIComponent(location.hash.slice(1));
  document.getElementById('code').value = code;
  if (!code) {
    document.getElementById('ohne-code').hidden = false;
    document.querySelector('#android button').disabled = true;
  }
</script>
</body>
</html>
`;

// ---------- Kater: /kater, dem Kater Hallo sagen ----------
// Darias Kater als SVG (assets/illustrations/kater.svg). Die Gruppen Besen, Brille und Stiefel (IDs aus Affinity) bewegen sich per CSS
// (einzelne Eigenschaften rotate/translate, damit die Matrizen aus Affinity erhalten bleiben). Die Sprüche stehen in
// src/data/kater-sprueche.json (gemeinsam mit der App): einer oder beliebig viele, jeweils mit Aktion fegen, brille, stampfen oder winken.
// ---------- Unterseite /spenden: Spendenaktion der Testphase ----------
const spendenSeite = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#FAFBEF">
<title>Spendenaktion – Kiez Coins</title>
<meta name="description" content="Damit Leipzig blüht, spende ich ${donation} € an den Ökolöwen, wenn ${goal} Menschen Kiez Coins testen und bewerten.">
<link rel="icon" href="/favicon.png">
<link rel="preload" href="/fonts/InterTight_600SemiBold.ttf" as="font" type="font/ttf" crossorigin>
<link rel="stylesheet" href="/seite.css?v=${version(seiteCss)}">
</head>
<body>
<div class="wrap">
<header class="top">
  <a class="brand" href="/" aria-label="Kiez Coins, Startseite">${sized(logoSeite, 34)}<span class="marke" lang="en">The actually pro-social App</span></a>
  <a class="top-link" href="/#download">Testversion laden</a>
</header>
<main>
${spenden}
</main>
${footer}
</div>
<script>
  // Zähler der Spendenaktion
  (function () {
    var ziel = ${goal};
    fetch(${JSON.stringify(config.supabaseUrl + '/rest/v1/rpc/tester_count')}, {
      method: 'POST',
      headers: { apikey: ${JSON.stringify(config.publishableKey)}, 'Content-Type': 'application/json' },
      body: '{}',
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (n) {
        if (typeof n !== 'number') return;
        document.getElementById('tester-zahl').textContent = n;
        var b = document.getElementById('tester-balken');
        b.setAttribute('aria-valuenow', String(Math.min(n, ziel)));
        b.firstElementChild.style.width = Math.min(100, (n / ziel) * 100) + '%';
        if (n >= ziel) document.getElementById('spenden').classList.add('is-geschafft');
      })
      .catch(function () {});
  })();
  // Blumen schieben sich ins Bild, sobald die Karte zu sehen ist (ohne JS stehen sie einfach da)
  (function () {
    var b = document.getElementById('spenden-blumen');
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    b.classList.add('is-bereit');
    var bio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { b.classList.add('is-da'); bio.disconnect(); } }, { threshold: 0.3 });
    bio.observe(b);
  })();
</script>
</body>
</html>
`;

const katerSvg = existsSync(join(root, 'assets/illustrations/kater.svg'))
  ? readFileSync(join(root, 'assets/illustrations/kater.svg'), 'utf8')
      .replace(/<\?xml[^>]*>\s*/, '')
      .replace(/<!DOCTYPE[^>]*>\s*/, '')
      .replace('width="100%" height="100%"', 'class="kater-svg" role="img" aria-label="Cat The Käptn mit Sonnenbrille, Schürze und Besen"')
  : '';
const sprueche = JSON.parse(readFileSync(join(root, 'src/data/kater-sprueche.json'), 'utf8'));
const katerSeite = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#FAFBEF">
<title>Hallo, Cat The Käptn – Kiez Coins</title>
<link rel="icon" href="/favicon.png">
<link rel="stylesheet" href="/seite.css?v=${version(seiteCss)}">
</head>
<body class="kater-seite">
<div class="wrap">
<header class="top">
  <a class="brand" href="/" aria-label="Kiez Coins, Startseite">${sized(logoSeite, 34)}<span class="marke" lang="en">The actually pro-social App</span></a>
  <a class="top-link" href="/#download">Testversion laden</a>
</header>
<main class="kater-buehne-seite">
  <p class="blase kater-spruch" id="spruch" aria-live="polite">Psst. Sage mal Hallo.</p>
  <button type="button" class="kater-figur" id="figur" aria-label="Cat The Käptn antippen: noch ein Spruch">${katerSvg}<span class="staub" id="staub" aria-hidden="true"></span></button>
  <div class="kater-knoepfe">
    <button type="button" class="kater-hallo" id="hallo">Hallo sagen</button>
    <button type="button" class="kater-noch" id="noch">Noch ein Spruch</button>
  </div>
</main>
</div>
<script>
(function () {
  var S = ${JSON.stringify({ hallo: sprueche.hallo, sprueche: sprueche.sprueche })};
  var figur = document.getElementById('figur');
  var blase = document.getElementById('spruch');
  var staub = document.getElementById('staub');
  var ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var zuletzt = {};
  var timer, idle;
  // Aus einer Liste ziehen, möglichst nicht zweimal hintereinander dasselbe
  function ziehe(name) {
    var liste = (S[name] || []).map(function (e) { return typeof e === 'string' ? { text: e } : e; });
    if (!liste.length) return null;
    var i = Math.floor(Math.random() * liste.length);
    if (liste.length > 1 && i === zuletzt[name]) i = (i + 1) % liste.length;
    zuletzt[name] = i;
    return liste[i];
  }
  function sag(e) {
    if (!e) return;
    blase.classList.remove('is-neu');
    void blase.offsetWidth;
    blase.textContent = e.text;
    blase.classList.add('is-neu');
    var a = e.aktion || 'fegen';
    figur.classList.remove('fegen', 'brille', 'stampfen', 'winken');
    void figur.offsetWidth;
    if (!ruhig) figur.classList.add(a);
    if (a === 'fegen' && !ruhig) puste();
    clearTimeout(timer);
    timer = setTimeout(function () { figur.classList.remove(a); }, 2600);
    warte();
  }
  // Staubwölkchen am Besen
  function puste() {
    for (var i = 0; i < 7; i++) {
      var w = document.createElement('i');
      w.style.setProperty('--x', (Math.random() * 120 - 30) + 'px');
      w.style.setProperty('--y', (-20 - Math.random() * 50) + 'px');
      w.style.setProperty('--s', (0.6 + Math.random()) + '');
      w.style.animationDelay = (300 + i * 220) + 'ms';
      staub.appendChild(w);
      setTimeout(w.remove.bind(w), 2600);
    }
  }
  // Von selbst etwas sagen, wenn eine Weile nichts passiert
  function warte() {
    clearTimeout(idle);
    idle = setTimeout(function () { sag(ziehe('sprueche')); }, 9000 + Math.random() * 6000);
  }
  document.getElementById('hallo').addEventListener('click', function () { sag(ziehe('hallo') || ziehe('sprueche')); });
  document.getElementById('noch').addEventListener('click', function () { sag(ziehe('sprueche')); });
  figur.addEventListener('click', function () { sag(ziehe('sprueche')); });
  warte();
})();
</script>
</body>
</html>
`;

// data-t: Originaltext als Schlüssel für das Texte-CMS. Das Skript am Seitenende holt Darias Fassungen aus `app_texts`.
const tag = (name, s, attrs = '') => `<${name}${attrs} data-t="${esc(s)}">${esc(s).replace(/\n/g, '<br>')}</${name}>`;
const paragraphs = (ps) => ps.map((p) => tag('p', p)).join('\n');
const cmsScript = `<script>
(function () {
  var norm = function (s) { return s.replace(/\\s+/g, ' ').trim(); };
  var esc = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  fetch(${JSON.stringify(config.supabaseUrl + '/rest/v1/app_texts?select=original,text&text=neq.')}, {
    headers: { apikey: ${JSON.stringify(config.publishableKey)} },
  })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (rows) {
      var map = {};
      rows.forEach(function (row) { if (row.text && norm(row.text) !== norm(row.original)) map[norm(row.original)] = row.text.trim(); });
      document.querySelectorAll('[data-t]').forEach(function (el) {
        var t = map[norm(el.getAttribute('data-t'))];
        if (t) el.innerHTML = esc(t).replace(/\\n/g, '<br>');
      });
      var h = document.querySelector('h1[data-t]');
      if (h) document.title = h.textContent + ' – Kiez Coins';
    })
    .catch(function () {});
})();
</script>`;
const legal = (id) => {
  const doc = legalDocs[id];
  const intro = doc.intro ? paragraphs([doc.intro]) : '';
  const sections = doc.sections
    .map((s) => `${s.heading ? `${tag('h2', s.heading)}\n` : ''}${paragraphs(s.paragraphs)}`)
    .join('\n');
  return page(`${doc.title} – Kiez Coins`, `${tag('h1', doc.title)}\n${tag('p', `Stand ${LEGAL_STAND}`, ' class="updated"')}\n${intro}\n${sections}\n${cmsScript}`);
};

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.html'), startseite('de'));
for (const { code } of sprachen.filter((l) => l.code !== 'de')) {
  mkdirSync(join(out, code), { recursive: true });
  writeFileSync(join(out, code, 'index.html'), startseite(code));
}
for (const [L, texte] of fehlend) console.warn(`Startseite ${L}: ${texte.size} Texte ohne Übersetzung, dort steht Englisch (scripts/site/sprachen/${L}.json)`);
writeFileSync(join(out, 'einladung.html'), einladung);
writeFileSync(join(out, 'spenden.html'), spendenSeite);
if (katerSvg) writeFileSync(join(out, 'kater.html'), katerSeite);
// Eigene 404-Seite für unbekannte Adressen.
writeFileSync(
  join(out, '404.html'),
  page('Nicht gefunden – Kiez Coins', `<h1>Seite nicht gefunden</h1>\n<p><a href="/">Zur Startseite</a></p>`),
);
// Web-App: Vercel leitet unbekannte Adressen unter /app/ auf die App-Startseite um (vercel.json unten).
// Eine Kopie der App-Startseite sorgt dafür, dass Neuladen auf einer Unterseite (/app/challenge/…) die App öffnet.
const app = join(out, 'app');
if (existsSync(join(app, 'index.html'))) copyFileSync(join(app, 'index.html'), join(app, '404.html'));
else console.warn('Achtung: website/app/ fehlt. Die Web-App fürs iPhone baut `npm run build:website`.');
for (const id of legalDocIds) writeFileSync(join(out, `${fileOf[id]}.html`), legal(id));
copyFileSync(join(root, 'assets/favicon.png'), join(out, 'favicon.png'));
// Startseite: Stil, Prototyp, Beispielfoto und Schriften (lokal, ohne Google-Server)
writeFileSync(join(out, 'seite.css'), seiteCss);
mkdirSync(join(out, 'prototyp'), { recursive: true });
writeFileSync(join(out, 'prototyp/daten.js'), datenJs);
writeFileSync(join(out, 'prototyp/app.js'), appJs);
mkdirSync(join(out, 'prototyp/fotos'), { recursive: true });
for (const f of fotos) copyFileSync(join(fotoDir, `${f}.jpg`), join(out, `prototyp/fotos/${f}.jpg`));
// Kater (freigestellt aus Darias Illustration, scripts/site/kater/)
mkdirSync(join(out, 'kater'), { recursive: true });
rmSync(join(out, 'blumen.webp'), { force: true });
rmSync(join(out, 'blumen'), { recursive: true, force: true });
mkdirSync(join(out, 'blumen'), { recursive: true });
for (const t of blumen.teile) copyFileSync(join(blumenDir, t.datei), join(out, 'blumen', t.datei));
for (const f of ['kater.png', 'kopf.png']) copyFileSync(join(siteDir, 'kater', f), join(out, 'kater', f));
mkdirSync(join(out, 'leute'), { recursive: true });
for (const f of readdirSync(join(siteDir, 'leute'))) copyFileSync(join(siteDir, 'leute', f), join(out, 'leute', f));
mkdirSync(join(out, 'fonts'), { recursive: true });
for (const [pkg, file] of [
  ['inter/300Light', 'Inter_300Light'],
  ['inter/400Regular', 'Inter_400Regular'],
  ['inter/500Medium', 'Inter_500Medium'],
  ['inter-tight/600SemiBold', 'InterTight_600SemiBold'],
])
  copyFileSync(join(root, `node_modules/@expo-google-fonts/${pkg}/${file}.ttf`), join(out, `fonts/${file}.ttf`));
// Hosting bei Vercel: Unterseiten der Web-App öffnen die App, Rechtstexte auch ohne .html.
// Mit cleanUrls bekommt Vercel keine Ziele mit .html, sonst endet jede Umleitung auf der 404-Seite.
writeFileSync(
  join(out, 'vercel.json'),
  JSON.stringify(
    {
      cleanUrls: true,
      rewrites: [
        { source: '/app/:path*', destination: '/app/index' },
        { source: '/einladung/:code', destination: '/einladung' },
      ],
    },
    null,
    2,
  ) + '\n',
);
// Logo: die bunten Coins aus der App (src/components/icons/brandSvgs.ts)
const coins = readFileSync(join(root, 'src/components/icons/brandSvgs.ts'), 'utf8').match(/coinsSvg = `([^`]+)`/);
writeFileSync(join(out, 'logo.svg'), coins[1]);
console.log(`Fertig: ${out}`);
