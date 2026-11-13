// Look der App. Seit 2026-11-13 gibt es nur noch „Kiez“ (Daria: Fashionable vorerst ausgeblendet und aus dem
// Der Wert bleibt für Fehlerberichte und Zählungen erhalten.
export type Look = 'kiez';
export const look: Look = 'kiez';

try {
  if (typeof window !== 'undefined') window.localStorage?.removeItem('kiez-look');
} catch {}
