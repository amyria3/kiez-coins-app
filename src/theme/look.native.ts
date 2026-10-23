// Look auf iOS und Android. Die Wahl liegt in einer kleinen Datei, die sich beim Start synchron lesen lässt.
// So stehen die Farben fest, bevor die Screens ihre Styles anlegen.
// Ohne Datei gilt der Look aus dem Build (EXPO_PUBLIC_LOOK, siehe eas.json, Profil `preview-insta`).

import { File, Paths } from 'expo-file-system';

import { defaultLook, isLook, type Look } from './lookTypes';

const file = () => new File(Paths.document, 'look.txt');

function readLook(): Look {
  try {
    const f = file();
    if (f.exists) {
      const value = f.textSync().trim();
      if (isLook(value)) return value;
    }
  } catch {
    // Datei fehlt oder ist nicht lesbar: Look aus dem Build
  }
  return defaultLook();
}

export const look: Look = readLook();

/** Speichert den Look. Er gilt nach dem nächsten Start der App. */
export function saveLook(next: Look): { reloaded: boolean } {
  try {
    const f = file();
    if (!f.exists) f.create();
    f.write(next);
  } catch {
    // Speichern fehlgeschlagen: Look bleibt beim nächsten Start der alte
  }
  return { reloaded: false };
}
