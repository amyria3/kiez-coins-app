import { Alert, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/**
 * Teilen über das Teilen-Menü des Systems. Browser ohne Teilen-Menü (Firefox, manche Desktop-Browser) kennen
 * `navigator.share` nicht. Dort kopiert der Knopf den Text in die Zwischenablage und sagt Bescheid.
 */
export async function shareText(message: string): Promise<void> {
  const canShare = Platform.OS !== 'web' || (typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  if (canShare) {
    try {
      await Share.share({ message });
      return;
    } catch {
      if (Platform.OS !== 'web') return;
    }
  }
  try {
    await Clipboard.setStringAsync(message);
    Alert.alert('Kopiert', 'Der Text liegt in der Zwischenablage. Füge ihn ein, wo Du ihn teilen willst.');
  } catch {
    Alert.alert('Teilen geht hier nicht', 'Dein Browser kann weder teilen noch kopieren.');
  }
}

/**
 * Link teilen mit Titel und kurzem Text (2026-11-23: auf Telegram kam die Visitenkarte als nackter Link ohne Text und
 * ohne Vorschau an). Im Browser geht der Link als eigenes Feld `url` an das Teilen-Menü; so erkennen Messenger ihn als
 * Link und holen die Vorschau (og:image). In der Android-App steht er unter dem Text. Abbrechen im Menü kopiert nichts.
 */
export async function shareLink({ title, text, url }: { title?: string; text?: string; url: string }): Promise<void> {
  const message = text ? `${text}\n${url}` : url;
  if (Platform.OS !== 'web') {
    try {
      await Share.share({ title, message });
    } catch {
      // Menü geschlossen oder nicht verfügbar: nichts weiter
    }
    return;
  }
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return;
    }
  }
  try {
    await Clipboard.setStringAsync(message);
    Alert.alert('Kopiert', 'Der Link liegt in der Zwischenablage. Füge ihn ein, wo Du ihn teilen willst.');
  } catch {
    Alert.alert('Teilen geht hier nicht', 'Dein Browser kann weder teilen noch kopieren.');
  }
}
