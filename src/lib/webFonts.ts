import { Asset } from 'expo-asset';

/**
 * Schriften im Web (Daria, 2026-11-23: Die Digitale Visitenkarte soll nach dem Scannen schnell erscheinen).
 * Die App meldet jede Schrift nur per @font-face an, mit `font-display: swap`. Der Browser lädt dann nur die
 * Schriften, die auf der Seite wirklich vorkommen, und erst, wenn er sie braucht. Bis dahin steht der Text in der
 * Systemschrift. useFonts aus expo-font lädt dagegen alle elf Dateien (rund 3,7 MB) vorab, die dann mit der Seite
 * um die Leitung konkurrieren.
 */
let registered = false;
export function registerWebFonts(fonts: Record<string, number>): void {
  if (registered || typeof document === 'undefined') return;
  registered = true;
  const css = Object.entries(fonts)
    .map(([family, mod]) => `@font-face{font-family:${JSON.stringify(family)};src:url(${JSON.stringify(Asset.fromModule(mod).uri)});font-display:swap}`)
    .join('\n');
  const style = document.createElement('style');
  style.id = 'kiez-fonts';
  style.textContent = css;
  document.head.appendChild(style);
}
