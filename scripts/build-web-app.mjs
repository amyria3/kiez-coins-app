// Baut die Web-App für app.kiezcoins.de (Vercel-Projekt mit Root Directory `web-app`, siehe web-app/vercel.json).
// Aufruf vom Repo-Ordner aus: `npm run build:web-app`. Ergebnis: web-app/dist/.
// Die App liegt an der Wurzel der Domain. Deshalb läuft der Export ohne EXPO_WEB_BASE_URL.
import { execSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';

const out = 'web-app/dist';
const env = { ...process.env };
delete env.EXPO_WEB_BASE_URL;

rmSync(out, { recursive: true, force: true });
execSync(`npx expo export -p web --output-dir ${out}`, { stdio: 'inherit', env });

if (/["']\/app\//.test(readFileSync(`${out}/index.html`, 'utf8'))) {
  console.error('web-app/dist/index.html enthält Pfade mit /app/. Die Web-App liegt an der Wurzel von app.kiezcoins.de.');
  process.exit(1);
}
console.log('Web-App für app.kiezcoins.de gebaut: web-app/dist/');
