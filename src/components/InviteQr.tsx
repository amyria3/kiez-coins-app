import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { radius, space } from '../theme/tokens';
import { t } from '../data/texts';

/**
 * QR-Code mit einem Einladungslink (Freundschaft oder Gruppe). Für Einladungen heißt er in der App „Instant-…“
 * (Instant-Verbindung, Instant-Einladung, Instant-Download; Daria, 08.11.2026). Die Visitenkarte des Schaufensters
 * sagt überall „QR-Code“ (2026-11-23), wie auf der gedruckten Karte und der Webseite. Scanner lesen dunkle Module auf hellem Grund
 * am sichersten, deshalb bleibt der Code in beiden Looks schwarz auf weiß.
 */
export function InviteQr({ value, label = t('Instant-Verbindung zum Scannen'), size = 200 }: { value: string; label?: string; size?: number }) {
  return (
    <View style={styles.tile} accessibilityRole="image" accessibilityLabel={label}>
      <QRCode value={value} size={size} color="#000000" backgroundColor="#FFFFFF" ecl="M" />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignSelf: 'center',
    padding: space[16],
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
  },
});
