// Wählbarer Look der App (Daria, 23.10.2026): „Kiez“ ist das eigene Design, „Fashionable“ (Code: instagram) lehnt sich an Instagram an. Name seit 24.10.2026.
// Die Tokens lesen den Look einmal beim Start, da StyleSheet.create die Farben beim Laden festschreibt.
// Ein Wechsel lädt die App deshalb neu.
// Im Web wählt der Link `/app/?look=instagram` den Look vor. Der Browser merkt sich die Wahl.
// iOS und Android bleiben vorerst beim Kiez-Look. Sie bräuchten einen Speicher, der beim Start synchron liest.
import { Platform } from 'react-native';

export type Look = 'kiez' | 'instagram';
export const looks: { code: Look; name: string; description: string }[] = [
  { code: 'kiez', name: 'Kiez', description: 'Lila, rund, Kiez Coins pur' },
  { code: 'instagram', name: 'Fashionable', description: 'Hell, blau, Fotos über die ganze Breite' },
];

const KEY = 'kiez-look';
const isLook = (v: unknown): v is Look => v === 'kiez' || v === 'instagram';

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
    if (isLook(saved)) return saved;
  } catch {}
  return 'kiez';
}

export const look: Look = readLook();

// Seite hinter der App und Statusleiste der PWA im selben Weiß (public/index.html setzt das Kiez-Grau)
if (look === 'instagram' && typeof document !== 'undefined') {
  document.documentElement.style.backgroundColor = '#FFFFFF';
  document.documentElement.style.colorScheme = 'light';
  document.documentElement.style.setProperty('accent-color', '#0095F6');
  if (document.body) document.body.style.backgroundColor = '#FFFFFF';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#FFFFFF');
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
