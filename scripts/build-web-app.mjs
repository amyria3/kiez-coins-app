// Baut die Web-App für app.kiezcoins.de (Vercel-Projekt mit Root Directory `web-app`, siehe web-app/vercel.json).
// Aufruf vom Repo-Ordner aus: `node scripts/build-web-app.mjs`. Ergebnis: web-app/dist/.
//
// Die App liegt dort an der Wurzel der Domain, ohne /app davor. Deshalb läuft der Export ohne EXPO_WEB_BASE_URL.
// Übergang: public/ enthält noch Pfade mit /app/ für kiezcoins.de/app. Das Skript ersetzt sie im Ergebnis durch /.
// Sobald kiezcoins.de/app nur noch weiterleitet, stehen in public/ die Pfade ohne /app/ und der Ersatz entfällt.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const out = 'web-app/dist';
const env = { ...process.env };
delete env.EXPO_WEB_BASE_URL;

rmSync(out, { recursive: true, force: true });
execSync(`npx expo export -p web --output-dir ${out}`, { stdio: 'inherit', env });

for (const file of ['index.html', 'manifest.json', 'start.js']) {
  const path = `${out}/${file}`;
  if (!existsSync(path)) continue;
  const before = readFileSync(path, 'utf8');
  const after = before.replace(/(["'(])\/app\//g, '$1/');
  if (after !== before) writeFileSync(path, after);
}

const html = readFileSync(`${out}/index.html`, 'utf8');
if (/["']\/app\//.test(html)) {
  console.error('web-app/dist/index.html enthält noch Pfade mit /app/.');
  process.exit(1);
}
console.log('Web-App für app.kiezcoins.de gebaut: web-app/dist/');
