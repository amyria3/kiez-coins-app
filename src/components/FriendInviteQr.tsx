import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { radius, space } from '../theme/tokens';

/**
 * QR-Code mit dem Einladungslink. Scanner lesen dunkle Module auf hellem Grund am sichersten, deshalb bleibt
 * der Code in beiden Looks schwarz auf weiß.
 */
export function FriendInviteQr({ value, size = 200 }: { value: string; size?: number }) {
  return (
    <View style={styles.tile} accessibilityRole="image" accessibilityLabel="QR-Code mit Deinem Einladungslink">
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
