import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { radius, space } from '../theme/tokens';
import { t } from '../data/texts';

/**
 * QR-Code mit einem Einladungslink (Freundschaft oder Gruppe). In der App heißt er immer „Instant-…“ (Instant-Verbindung,
 * Instant-Einladung, Instant-Download; Daria, 08.11.2026), nie „QR-Code“. Scanner lesen dunkle Module auf hellem Grund
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
