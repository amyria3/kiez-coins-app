// Erzeugt src/components/icons/phosphorSvgs.ts aus @phosphor-icons/core (MIT-Lizenz).
// Neues Icon: Namen unten eintragen, dann `node scripts/phosphor-icons.mjs` ausführen.
import { readFileSync, writeFileSync } from 'node:fs';

const regular = [
  'house', 'camera', 'chats', 'chat-circle', 'paper-plane-tilt', 'map-pin', 'list', 'link', 'gear',
  'caret-left', 'caret-right', 'x', 'check', 'plus', 'minus', 'dots-three', 'clock', 'info', 'flag',
  'copy', 'eye', 'squares-four', 'check-circle', 'users-three', 'handshake', 'translate', 'palette',
  'gift', 'thumbs-up', 'heart', 'coins', 'toggle-right', 'text-aa',
  'hand-waving', 'arrow-right',
];
const fill = ['heart'];

const path = (weight, name) => {
  const file = `node_modules/@phosphor-icons/core/assets/${weight}/${name}${weight === 'regular' ? '' : '-' + weight}.svg`;
  const svg = readFileSync(file, 'utf8');
  return [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
};
const entries = (weight, names) => names.map((n) => `  '${n}': ${JSON.stringify(path(weight, n))},`).join('\n');

writeFileSync(
  'src/components/icons/phosphorSvgs.ts',
  `// Erzeugt mit scripts/phosphor-icons.mjs aus @phosphor-icons/core. Nicht von Hand ändern.
// Phosphor Icons, MIT-Lizenz (phosphoricons.com). Pfade im viewBox 0 0 256 256.
export const phosphorRegular = {
${entries('regular', regular)}
} as const;

export const phosphorFill = {
${entries('fill', fill)}
} as const;

export type PhosphorName = keyof typeof phosphorRegular;
`,
);
