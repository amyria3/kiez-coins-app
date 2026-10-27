// Wählbarer Look der App (Daria, 23.10.2026): „Kiez“ ist das eigene Design, „Fashionable“ ist hell, mit Fotos über die ganze Breite.
// Die Tokens lesen den Look einmal beim Start, da StyleSheet.create die Farben beim Laden festschreibt.
// Ein Wechsel lädt die App deshalb neu.
// Im Web wählt der Link `/app/?look=fashionable` den Look vor. Der Browser merkt sich die Wahl.
// iOS und Android bleiben vorerst beim Kiez-Look. Sie bräuchten einen Speicher, der beim Start synchron liest.
import { Platform } from 'react-native';

export type Look = 'kiez' | 'fashionable' | 'kaminabend' | 'flohmarkt' | 'brause' | 'laube' | 'pausenhof';
// Entwürfe vom 27.10.2026 (kaminabend bis laube): Farben im Kiez-Layout, rund und warm. Daria wählt aus.
export const looks: { code: Look; name: string; description: string; bg: string; accent: string; scheme: 'dark' | 'light' }[] = [
  { code: 'kiez', name: 'Kiez', description: 'Lila, rund, Kiez Coins pur', bg: '#1F2123', accent: '#7E94FF', scheme: 'dark' },
  { code: 'fashionable', name: 'Fashionable', description: 'Hell, blau, Fotos über die ganze Breite', bg: '#FFFFFF', accent: '#0095F6', scheme: 'light' },
  { code: 'kaminabend', name: 'Kaminabend', description: 'Dunkel, Bernstein, warm wie Holzfeuer', bg: '#241A1E', accent: '#FFB547', scheme: 'dark' },
  { code: 'flohmarkt', name: 'Flohmarkt', description: 'Creme, Tomatenrot, Senf und Petrol', bg: '#FBF3E4', accent: '#E0482E', scheme: 'light' },
  { code: 'brause', name: 'Brause', description: 'Lila Pastell, Violett und Pink', bg: '#F3EEFF', accent: '#6A4CFF', scheme: 'light' },
  { code: 'pausenhof', name: 'Pausenhof', description: 'Warmweiß, Lila, runde Überschriften, Knöpfe zum Draufdrücken', bg: '#FFFCF7', accent: '#5B6CF0', scheme: 'light' },
  { code: 'laube', name: 'Laube', description: 'Salbeigrün, Tannengrün und Kürbis', bg: '#EDF2E3', accent: '#1F7A5A', scheme: 'light' },
];

const KEY = 'kiez-look';
const isLook = (v: unknown): v is Look => looks.some((l) => l.code === v);

/** Look im Web wählbar, auf iOS und Android noch nicht */
export const lookSelectable = Platform.OS === 'web';

function readLook(): Look {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 'kiez';
  const fromLink = new URLSearchParams(window.location.search).get('look');
  if (isLook(fromLink)) {
    try {
      window.localStorage.setItem(KEY, fromLink);
    } catch {}
    return fromLink;
  }
  try {
    const saved = window.localStorage.getItem(KEY);
    if (isLook(saved)) {
      window.localStorage.setItem(KEY, saved);
      return saved;
    }
  } catch {}
  return 'kiez';
}

export const look: Look = readLook();

// Seite hinter der App und Statusleiste der PWA in der Grundfarbe des Looks (public/index.html setzt das Kiez-Grau)
const lookMeta = looks.find((l) => l.code === look)!;
if (look !== 'kiez' && typeof document !== 'undefined') {
  document.documentElement.style.backgroundColor = lookMeta.bg;
  document.documentElement.style.colorScheme = lookMeta.scheme;
  document.documentElement.style.setProperty('accent-color', lookMeta.accent);
  if (document.body) document.body.style.backgroundColor = lookMeta.bg;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', lookMeta.bg);
  document
    .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute('content', lookMeta.scheme === 'light' ? 'default' : 'black-translucent');
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
