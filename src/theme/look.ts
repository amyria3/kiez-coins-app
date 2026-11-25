// Look der App, wählbar unter Dein Konto › Look (Daria, 2026-11-25: „als Look-Option in den Einstellungen“).
// „Kiez“ ist das eigene Design: bunte Akzente auf dunklem Grund, Standard für alle.
// „Light-Modus“ (Daria, 2026-11-25: „das cleane Design, gleiche UI“, Name „einfach Light-Modus“): dieselbe Bedienung und
// derselbe Aufbau, heller Grund, die bunten Akzente leicht angepasst. Löst den alten Look „Fashionable“ ab (Git-Tag
// `fashionable-archiv`).
// „Mono“ (Daria, 2026-11-25: „noch cleaner, überwiegend schwarz-weiß mit dem anderen Set an Icons“, „ohne
// handgezeichnete Elemente“): baut auf dem Light-Modus auf, Schwarz als einzige Bedienfarbe, Linien-Icons, glatte Formen.
// Light-Modus vorerst ausgeblendet (Daria, 2026-11-25: „Light theme out for now, doesn't rly work, but don't delete
// the Code“): nicht in der Auswahl, eine gespeicherte Wahl fällt auf Kiez zurück. Der Link `?look=light` zeigt ihn zum
// Testen weiter, aber nur für diesen Aufruf. Wieder anbieten: `offered` in `looks` auf true setzen.
// Die Tokens lesen den Look einmal beim Start, da StyleSheet.create die Farben beim Laden festschreibt. Ein Wechsel
// startet die App deshalb neu. Gespeichert im Web in localStorage (Link `?look=light|mono|kiez` wählt vor), auf iOS
// und Android in SecureStore, das sich beim Start synchron lesen lässt.
import { DevSettings, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';

export type Look = 'kiez' | 'light' | 'mono';

/** Auswahl unter Dein Konto › Look */
const allLooks: { code: Look; name: string; description: string; offered: boolean }[] = [
  { code: 'kiez', name: 'Kiez', description: 'Bunt auf dunklem Grund', offered: true },
  { code: 'light', name: 'Light-Modus', description: 'Hell, mit bunten Akzenten', offered: false },
  { code: 'mono', name: 'Mono', description: 'Schwarz-weiß, schlichte Icons', offered: true },
];
export const looks = allLooks.filter((l) => l.offered);
/** Name des aktiven Looks, auch eines ausgeblendeten, der über den Link offen ist */
export const lookName = (code: Look) => allLooks.find((l) => l.code === code)?.name;
const isOffered = (v: unknown): v is Look => looks.some((l) => l.code === v);

const KEY = 'kiez-look';
const isLook = (v: unknown): v is Look => v === 'kiez' || v === 'light' || v === 'mono';

function readLook(): Look {
  if (Platform.OS !== 'web') {
    try {
      const saved = SecureStore.getItem(KEY);
      if (isOffered(saved)) return saved;
    } catch {}
    return 'kiez';
  }
  if (typeof window === 'undefined') return 'kiez';
  try {
    const fromLink = new URLSearchParams(window.location.search).get('look');
    if (isLook(fromLink)) {
      // Ausgeblendete Looks nur für diesen Aufruf, ohne sie zu speichern
      if (isOffered(fromLink)) window.localStorage.setItem(KEY, fromLink);
      return fromLink;
    }
    const saved = window.localStorage.getItem(KEY);
    if (isOffered(saved)) return saved;
  } catch {}
  return 'kiez';
}

export const look: Look = readLook();

/** Heller Grund: Light-Modus und Mono */
export const isLight = look === 'light' || look === 'mono';
/** Mono: schwarz-weiß mit Linien-Icons */
export const isMono = look === 'mono';
/**
 * Handgezeichnete Formen (Knöpfe, Schalter, Reiter) und schräge Karten. In Mono glatt und gerade (Daria, 2026-11-25:
 * „bitte ohne handgezeichnete Elemente“).
 */
export const handDrawn = !isMono;

/** Glatte Pille für Breite × Höhe, ab `inset` nach innen gerückt: Ersatz für die gezeichneten Formen in Mono */
export function pillPath(width: number, height: number, inset = 0): string {
  const w = Math.max(1, width - 2 * inset);
  const h = Math.max(1, height - 2 * inset);
  const r = Math.min(h, w) / 2;
  const x = inset;
  const y = inset;
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

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

/** Look speichern und die App neu starten. Im Web fällt der Parameter `look` im Link dabei weg. */
export async function setLook(next: Look) {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(KEY, next);
    } catch {}
    const url = new URL(window.location.href);
    url.searchParams.delete('look');
    window.location.replace(url.toString());
    return;
  }
  await SecureStore.setItemAsync(KEY, next);
  try {
    await Updates.reloadAsync();
  } catch {
    // Entwicklung ohne expo-updates
    if (__DEV__) DevSettings.reload();
  }
}
