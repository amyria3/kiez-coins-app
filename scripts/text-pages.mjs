// Ordnet jeden Text der App einer Seite zu (für den Texte-Editor, Route `texts`).
//   node scripts/text-pages.mjs   schreibt src/data/textSeiten.json
// Steht ein Text auf mehreren Seiten, kommt er in die Gruppe „mehrere“. Bitte nach größeren Änderungen neu erzeugen.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { collectKeys } from './text-keys.mjs';

const root = new URL('..', import.meta.url).pathname;
const RULES = [
  ['recht', /data\/legal\.ts|app\/legal/],
  ['start', /app\/onboarding|app\/index/],
  ['freunde', /app\/chat|app\/account\/friends|app\/friends|app\/user|data\/chat/],
  ['moderation', /app\/moderation|app\/texts|app\/account\/survey/],
  ['erstellen', /app\/challenge\/create|components\/compose/],
  ['detail', /app\/challenge\/\[id\]|components\/(Comments|Badges)/],
  ['feed', /app\/feed|components\/(FeedHeader|ChallengePost|GroupBar|FeedStateMessage|TabBar|SurveyOverlay)/],
  ['verwalten', /app\/manage/],
  ['gruppen', /app\/groups|data\/groups|components\/GroupCard/],
  ['reise', /app\/me\.tsx|data\/reise/],
  ['kater', /app\/tour|app\/cat\.tsx|data\/(kater|tour)|components\/KaterStage/],
  ['konto', /app\/account/],
];
const pageOf = (file) => RULES.find(([, re]) => re.test(file))?.[0] ?? 'allgemein';

const keys = await collectKeys();
const out = {};
for (const [text, files] of keys.all) {
  const pages = [...new Set([...files].map(pageOf))];
  out[text] = pages.length > 1 ? 'mehrere' : pages[0];
}
writeFileSync(join(root, 'src/data/textSeiten.json'), JSON.stringify(out) + '\n');
const count = {};
for (const p of Object.values(out)) count[p] = (count[p] ?? 0) + 1;
console.log(count);
