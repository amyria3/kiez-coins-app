import { StyleSheet, View } from 'react-native';

import { badgeTitle, useUserBadges } from '../data/badges';
import { color, font, space } from '../theme/tokens';
import { BadgeIcon } from './BadgeIcon';
import { Text } from './T';

/**
 * Eingeblendete Abzeichen einer Person im Profil (Daria, 2026-11-01): Kacheln nebeneinander, Name klein darunter,
 * ohne Fläche dahinter, damit nichts wie ein Knopf aussieht. Ohne Abzeichen: nichts.
 */
export function BadgeStrip({ userId, align = 'center' }: { userId: string; align?: 'center' | 'start' }) {
  const badges = useUserBadges(userId);
  if (!badges.length) return null;
  return (
    <View style={[styles.wrap, align === 'start' && styles.start]}>
      {badges.map((b) => (
        <View key={b.badge} style={styles.item}>
          <BadgeIcon kind={b.badge} number={b.number} size={40} />
          <Text noTranslate style={styles.name} numberOfLines={2}>
            {badgeTitle(b.badge, b.number)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[16] },
  start: { justifyContent: 'flex-start' },
  item: { width: 72, alignItems: 'center', gap: space[4] },
  name: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: color.text.secondary, textAlign: 'center' },
});
