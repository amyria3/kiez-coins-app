import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './T';

import { myEdensteine } from '../data/groups';
import { useStore } from '../data/store';
import type { Group } from '../data/types';
import { t } from '../data/texts';
import { color, radius, size, space, stroke, text } from '../theme/tokens';
import { LivingCrystal } from './icons/Brand';
import { Icon } from './icons/Icon';

type GroupCardProps = {
  group: Group;
  /** Zeile unter dem Namen; ohne Angabe Mitglieder und, ob Du sie gegründet hast */
  meta?: string;
  onFeed: () => void;
  onManage: () => void;
};

/**
 * Eine Gruppe, überall gleich (Daria, 22.10.2026): oben Name, Zeile darunter und rechts der eigene Edenstein-Stand,
 * unten zwei Wege: Feed (Haus) und Verwalten (Zahnrad).
 */
export function GroupCard({ group, meta, onFeed, onManage }: GroupCardProps) {
  const { challenges, currentUserId } = useStore();
  const members = group.members.length === 1 ? t('1 Mitglied') : t('{members} Mitglieder', { members: group.members.length });
  const line = meta ?? (group.founderId === currentUserId ? `${members} · ${t('Du hast sie gegründet')}` : members);
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <Text noTranslate style={styles.name} numberOfLines={1}>
            {group.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {line}
          </Text>
        </View>
        <View style={styles.eden} accessible accessibilityLabel={t('Du, {edensteine} Edensteine', { edensteine: myEdensteine(group, challenges, currentUserId) })}>
          <View style={styles.crystal}>
            <View style={styles.crystalFloat}>
              <LivingCrystal height={52} seed={group.id} />
            </View>
          </View>
          <Text style={styles.edenValue}>{myEdensteine(group, challenges, currentUserId)}</Text>
        </View>
      </View>
      <View style={styles.links}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Feed von {name}', { name: group.name })}
          onPress={onFeed}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <Icon name="behausung" size={size.icon} color={color.text.primary} />
          <Text style={styles.linkText}>Feed</Text>
        </Pressable>
        <View style={styles.divider} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('{name} verwalten', { name: group.name })}
          onPress={onManage}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <Icon name="settings" size={size.icon} color={color.text.primary} />
          <Text style={styles.linkText}>Verwalten</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, backgroundColor: color.bg.surface },
  top: { flexDirection: 'row', alignItems: 'center', gap: space[12], padding: space[16] },
  flex: { flex: 1, gap: space[4] },
  name: { ...text.cardTitle, color: color.text.primary },
  meta: { ...text.caption, color: color.text.secondary },
  eden: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  crystal: { width: 30, height: 24, alignItems: 'center' },
  crystalFloat: { position: 'absolute', top: (24 - 52) / 2 },
  edenValue: { ...text.metric, fontSize: 18, color: color.accent.confirmation },
  links: { flexDirection: 'row', borderTopWidth: stroke.ultraThin, borderTopColor: color.line.hairline },
  link: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[8], minHeight: 52 },
  linkText: { ...text.body, color: color.text.primary },
  divider: { width: stroke.ultraThin, backgroundColor: color.line.hairline, marginVertical: space[12] },
  pressed: { opacity: 0.7 },
});
