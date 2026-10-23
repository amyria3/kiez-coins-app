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
    Alert.alert('Kopiert', 'Der Text liegt in der Zwischenablage. Füg ihn ein, wo Du ihn teilen willst.');
  } catch {
    Alert.alert('Teilen geht hier nicht', 'Dein Browser kann weder teilen noch kopieren.');
  }
}
