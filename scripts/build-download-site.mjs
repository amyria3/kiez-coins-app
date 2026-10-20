// Baut die Download-Seite in den Ordner `website/`: Startseite mit Passwort-Formular plus
// Impressum, Datenschutz und Nutzungsbedingungen aus `src/data/legal.ts` (dieselben Texte wie in der App).
// Aufruf: node scripts/build-download-site.mjs
// Den Ordner `website/` lädt Daria danach beim Webhoster hoch (siehe Übergabe/2026-10-21_download-seite.md).
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'website');
// legal.ts mit TypeScript nach JS übersetzen und laden
const ts = (await import('typescript')).default;
const legalJs = ts.transpileModule(readFileSync(join(root, 'src/data/legal.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const tmp = join(root, 'scripts/.legal.tmp.mjs');
writeFileSync(tmp, legalJs);
const { LEGAL_STAND, legalDocIds, legalDocs } = await import(tmp);
rmSync(tmp);
// Dateinamen der Seiten
const fileOf = { impressum: 'impressum', datenschutz: 'datenschutz', bedingungen: 'nutzungsbedingungen' };
const config = JSON.parse(readFileSync(join(root, 'scripts/download-site.config.json'), 'utf8'));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const open = JSON.stringify(legalDocs).match(/\[offen:[^\]]*\]/g);
if (open) console.warn(`Achtung, noch offen: ${[...new Set(open)].join(', ')}`);

const css = `
:root { --bg:#1F2123; --surface:#2B2D31; --text:#F0F0F0; --muted:#A0A0A0; --accent:#7E94FF; --error:#FF7E8B; --line:rgba(240,240,240,.12); }
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
button { width:100%; margin-top:12px; font:500 16px/1 Inter, system-ui, sans-serif; color:var(--bg); background:var(--accent); border:0; border-radius:999px; padding:16px; cursor:pointer; }
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

const ios = config.testflightUrl
  ? `<p>Auf dem iPhone läuft Kiez Coins über TestFlight, Apples App für Testversionen.</p>
  <p><a href="${esc(config.testflightUrl)}">Kiez Coins in TestFlight öffnen</a></p>`
  : `<p>Die iPhone-Version ist in Vorbereitung. Sie kommt über TestFlight, Apples App für Testversionen.</p>`;

const index = page(
  'Kiez Coins – Testversion',
  `<div class="logo"><img src="logo.svg" alt=""></div>
<h1>Kiez Coins</h1>
<p>Nachbarschaft organized. Kleine Challenges für Deinen Kiez. Das hier ist die Testversion.</p>

<div class="card" id="download">
  <h2 style="margin-top:0">Android</h2>
  <form method="post" action="${esc(config.functionUrl)}">
    <label for="passwort">Passwort</label>
    <input id="passwort" name="passwort" type="password" autocomplete="current-password" required>
    <p class="error" id="fehler" hidden></p>
    <button type="submit">App herunterladen</button>
  </form>
</div>

<h2>So installierst Du die App auf Android</h2>
<ol class="steps">
  <li>Passwort eingeben und „App herunterladen“ tippen.</li>
  <li>Die Datei <em>kiez-coins.apk</em> öffnen, wenn der Download fertig ist.</li>
  <li>Android fragt, ob Dein Browser Apps installieren darf. Erlauben und „Installieren“ tippen.</li>
  <li>Für ein Update lädst Du die neue Datei hier herunter und installierst sie genauso. Deine Daten bleiben erhalten.</li>
</ol>

<h2>iPhone</h2>
${ios}

<script>
  var f = new URLSearchParams(location.search).get('fehler');
  var t = { passwort: 'Das Passwort stimmt nicht.', datei: 'Die App-Datei fehlt gerade. Versuch es später noch mal.', technik: 'Der Download ist gerade nicht eingerichtet.' }[f];
  if (t) { var e = document.getElementById('fehler'); e.textContent = t; e.hidden = false; }
</script>`,
);

const paragraphs = (ps) => ps.map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('\n');
const legal = (id) => {
  const doc = legalDocs[id];
  const intro = doc.intro ? paragraphs([doc.intro]) : '';
  const sections = doc.sections
    .map((s) => `${s.heading ? `<h2>${esc(s.heading)}</h2>\n` : ''}${paragraphs(s.paragraphs)}`)
    .join('\n');
  return page(`${doc.title} – Kiez Coins`, `<h1>${esc(doc.title)}</h1>\n<p class="updated">Stand: ${esc(LEGAL_STAND)}</p>\n${intro}\n${sections}`);
};

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.html'), index);
for (const id of legalDocIds) writeFileSync(join(out, `${fileOf[id]}.html`), legal(id));
copyFileSync(join(root, 'assets/favicon.png'), join(out, 'favicon.png'));
// Logo: die bunten Coins aus der App (src/components/icons/brandSvgs.ts)
const coins = readFileSync(join(root, 'src/components/icons/brandSvgs.ts'), 'utf8').match(/coinsSvg = `([^`]+)`/);
writeFileSync(join(out, 'logo.svg'), coins[1]);
console.log(`Fertig: ${out}`);
