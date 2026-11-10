import { StyleSheet, View } from 'react-native';

import { Icon } from './icons/Icon';
import { Text } from './T';
import { color, font, isFashionable, radius, space } from '../theme/tokens';

/**
 * Markierung eines Posts aus einer Erinnerung (Daria, 2026-11-10): Pille mit Zeichen, Text und Fortschritt,
 * z. B. „⏱ joggen gehen 1/4“. Hebt sich von #vorher und @Erwähnungen ab.
 */
export function RoutinePill({ label }: { label: string }) {
  return (
    <View style={styles.pill} accessible accessibilityLabel={label}>
      <Icon name="clock-filled" size={14} color={isFashionable ? color.text.primary : TINT} />
      <Text noTranslate style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const TINT = '#C9CAFF';

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    minHeight: 28,
    paddingHorizontal: space[12],
    borderRadius: radius.full,
    backgroundColor: isFashionable ? color.bg.surface : 'rgba(143, 144, 250, 0.18)',
  },
  text: { fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: isFashionable ? color.text.primary : TINT },
});
