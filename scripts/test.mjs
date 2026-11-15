// Tests für reine App-Logik (ohne React Native): `node scripts/test.mjs`.
// Bewusst kein Eintrag unter `scripts` in package.json: Die Skripte dort zählen zum Fingerprint von expo-updates.
// Ein neues Skript dort hieße, dass vorhandene APKs keine Updates mehr bekommen.
// esbuild bündelt jede Datei tests/*.test.ts für Node, danach läuft der eingebaute Test-Runner von Node.
// Getestet werden nur Module ohne App-Abhängigkeiten (Datum, Dringlichkeit, Text, @-Namen). So braucht es kein Jest
// und keine neue Abhängigkeit, die den Fingerprint der App ändern würde.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const tests = readdirSync(join(root, 'tests')).filter((f) => f.endsWith('.test.ts'));
const out = mkdtempSync(join(tmpdir(), 'kiez-tests-'));
try {
  await build({
    entryPoints: tests.map((f) => join(root, 'tests', f)),
    outdir: out,
    bundle: true,
    platform: 'node',
    format: 'esm',
    outExtension: { '.js': '.mjs' },
    logLevel: 'warning',
  });
  // Feste Zeitzone, damit Datumsrechnungen überall gleich ausfallen
  execFileSync(process.execPath, ['--test', ...readdirSync(out).map((f) => join(out, f))], {
    stdio: 'inherit',
    env: { ...process.env, TZ: 'Europe/Berlin' },
  });
} finally {
  rmSync(out, { recursive: true, force: true });
}
