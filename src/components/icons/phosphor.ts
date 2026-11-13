import { phosphorFill, phosphorRegular, type PhosphorName } from './phosphorSvgs';

/**
 * Phosphor-Icons (MIT, phosphoricons.com) für Stellen ohne eigenes Icon von Daria, z. B. die Lupe im Suchfeld
 * (2026-11-13). `filled` nimmt die gefüllte Fassung, wo es sie gibt.
 */
export function phXml(name: PhosphorName, c: string, filled = false) {
  const d = (filled && (phosphorFill as Partial<Record<PhosphorName, readonly string[]>>)[name]) || phosphorRegular[name];
  const paths = d.map((p) => `<path d="${p}"/>`).join('');
  return `<svg width="24" height="24" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" fill="${c}">${paths}</svg>`;
}
