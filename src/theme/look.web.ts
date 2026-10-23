// Look in der Web-App. `?look=insta` in der Adresse wählt den Look und merkt ihn sich im Browser.
// So öffnet der Link kiezcoins.de/app/?look=insta die App direkt im Insta-Look.

import { defaultLook, isLook, type Look } from './lookTypes';

const KEY = 'kiezcoins.look';

function readLook(): Look {
  try {
    const param = new URLSearchParams(window.location.search).get('look');
    if (param && isLook(param)) {
      window.localStorage.setItem(KEY, param);
      return param;
    }
    const stored = window.localStorage.getItem(KEY);
    if (stored && isLook(stored)) return stored;
  } catch {
    // Kein Zugriff auf Adresse oder Speicher (z. B. beim Vorab-Rendern)
  }
  return defaultLook();
}

export const look: Look = readLook();

// Auf dem iPhone-Home-Bildschirm startet die Web-App mit der Adresse aus dem Manifest.
// Im Insta-Look zeigt der Link deshalb auf ein Manifest, das `?look=insta` mitgibt.
try {
  if (look === 'insta') {
    const link = document.querySelector('link[rel="manifest"]');
    if (link) link.setAttribute('href', link.getAttribute('href')!.replace('manifest.json', 'manifest-insta.json'));
  }
} catch {
  // ohne DOM nichts zu tun
}

/** Speichert den Look und lädt die Web-App neu. */
export function saveLook(next: Look): { reloaded: boolean } {
  try {
    window.localStorage.setItem(KEY, next);
    const url = new URL(window.location.href);
    url.searchParams.delete('look');
    window.location.replace(url.toString());
    return { reloaded: true };
  } catch {
    return { reloaded: false };
  }
}
