import { StyleSheet, View } from 'react-native';

import { t } from '../data/texts';
import { color, font, isFashionable, size, space, text } from '../theme/tokens';
import { Icon } from './icons/Icon';
import { Text } from './T';

/**
 * Wie viele Personen den Post gesehen haben (Daria, 02.11.2026). Steht nur an eigenen Posts:
 * `views` gibt es nur dort (RLS auf `challenge_views`). Angabe in Grau, kein Knopf.
 */
export function ViewCount({ views }: { views?: number }) {
  if (views === undefined) return null;
  const label = `${views} ${t(views === 1 ? 'Ansicht' : 'Ansichten')}`;
  return (
    <View accessible accessibilityLabel={label} style={styles.wrap}>
      <Icon name="eye" size={size.icon} color={color.text.secondary} />
      <Text style={isFashionable ? styles.countFashionable : styles.count}>{views}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    minHeight: size.touchTarget,
    paddingHorizontal: space[6],
  },
  count: { ...text.caption, fontSize: 15, lineHeight: 20, color: color.text.secondary, fontVariant: ['tabular-nums'] },
  countFashionable: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.text.secondary, fontVariant: ['tabular-nums'] },
});
