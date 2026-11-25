// Look der App. „Kiez“ ist das eigene Design: bunte Akzente auf dunklem Grund. „Fashionable“ ist seit 2026-11-25 die
// ruhige, helle Alternative mit derselben Bedienung und demselben Aufbau, nur mit anderem Farbkonzept (Daria, 2026-11-25:
// „das cleane Design, gleiche UI“). Entwurf: vorerst nur im Web über den Link `?look=fashionable` wählbar.
// Die Tokens lesen den Look einmal beim Start, da StyleSheet.create die Farben beim Laden festschreibt.
// Ein Wechsel lädt die App deshalb neu. Der Browser merkt sich die Wahl.
import { Platform } from 'react-native';

export type Look = 'kiez' | 'fashionable';

const KEY = 'kiez-look';
const isLook = (v: unknown): v is Look => v === 'kiez' || v === 'fashionable';

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

/** Ruhiger, heller Look „Fashionable“ */
export const isCalm = look === 'fashionable';

// Seite hinter der App und Statusleiste der PWA im Papierweiß des ruhigen Looks (public/index.html setzt das Kiez-Grau)
if (isCalm && typeof document !== 'undefined') {
  const paper = '#F6F4F0';
  const ink = '#24221F';
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
