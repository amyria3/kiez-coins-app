import { StyleSheet, View } from 'react-native';

import { badgeTitle, useUserBadges } from '../data/badges';
import { color, font, radius, space } from '../theme/tokens';
import { BadgeIcon } from './BadgeIcon';
import { Text } from './T';

/** Alle eingeblendeten Abzeichen einer Person im Profil (Daria, 2026-10-31). Ohne Abzeichen: nichts. */
export function BadgeStrip({ userId, align = 'center' }: { userId: string; align?: 'center' | 'start' }) {
  const badges = useUserBadges(userId);
  if (!badges.length) return null;
  return (
    <View style={[styles.wrap, align === 'start' && styles.start]}>
      {badges.map((b) => (
        <View key={b.badge} style={styles.chip}>
          <BadgeIcon kind={b.badge} number={b.number} size={24} />
          <Text noTranslate style={styles.name}>
            {badgeTitle(b.badge, b.number)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[8] },
  start: { justifyContent: 'flex-start' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: space[4],
    paddingRight: space[12],
    paddingVertical: space[4],
    borderRadius: radius.full,
    backgroundColor: color.bg.surface,
  },
  name: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.text.primary },
});
