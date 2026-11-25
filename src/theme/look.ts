// Look der App. „Kiez“ ist das eigene Design: bunte Akzente auf dunklem Grund. Der „Light-Modus“ (Daria, 2026-11-25:
// „das cleane Design, gleiche UI“, Name „einfach Light-Modus“) hat dieselbe Bedienung und denselben Aufbau, nur hellen
// Grund. Er löst den alten Look „Fashionable“ ab (Git-Tag `fashionable-archiv`). Entwurf: vorerst nur im Web über den
// Link `?look=light` wählbar. „Mono“ (Daria, 2026-11-25: „noch cleaner, überwiegend schwarz-weiß mit dem anderen Set an
// Icons“) baut auf dem Light-Modus auf: weißer Grund, Schwarz als einzige Bedienfarbe, Linien-Icons (Phosphor).
// Im Web über `?look=mono`.
// Die Tokens lesen den Look einmal beim Start, da StyleSheet.create die Farben beim Laden festschreibt.
// Ein Wechsel lädt die App deshalb neu. Der Browser merkt sich die Wahl.
import { Platform } from 'react-native';

export type Look = 'kiez' | 'light' | 'mono';

const KEY = 'kiez-look';
const isLook = (v: unknown): v is Look => v === 'kiez' || v === 'light' || v === 'mono';

function readLook(): Look {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 'kiez';
  try {
    const fromLink = new URLSearchParams(window.location.search).get('look');
    if (isLook(fromLink)) {
      window.localStorage.setItem(KEY, fromLink);
      return fromLink;
    }
    const saved = window.localStorage.getItem(KEY);
    if (isLook(saved)) return saved;
  } catch {}
  return 'kiez';
}

export const look: Look = readLook();

/** Heller Grund: Light-Modus und Mono */
export const isLight = look === 'light' || look === 'mono';
/** Mono: schwarz-weiß mit Linien-Icons */
export const isMono = look === 'mono';

// Seite hinter der App und Statusleiste der PWA im Papierweiß des Light-Modus (public/index.html setzt das Kiez-Grau)
if (isLight && typeof document !== 'undefined') {
  const paper = isMono ? '#FFFFFF' : '#F6F4F0';
  const ink = isMono ? '#111111' : '#24221F';
  document.documentElement.style.backgroundColor = paper;
  document.documentElement.style.colorScheme = 'light';
  document.documentElement.style.setProperty('accent-color', ink);
  if (document.body) document.body.style.backgroundColor = paper;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', paper);
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.setAttribute('content', 'default');
}

/** Look speichern und die App neu laden. Der Parameter `look` im Link fällt dabei weg. */
export function setLook(next: Look) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, next);
  } catch {}
  const url = new URL(window.location.href);
  url.searchParams.delete('look');
  window.location.replace(url.toString());
}
