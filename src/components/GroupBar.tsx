import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './T';

import { useStore } from '../data/store';
import { myEdensteine } from '../data/groups';
import type { Group } from '../data/types';
import { color, font, radius, size, space, text } from '../theme/tokens';
import { Button } from './Button';
import { KaterCard } from './Content';
import { IconButton } from './IconButton';
import { LivingCrystal } from './icons/Brand';
import { Icon } from './icons/Icon';
import { t } from '../data/texts';

type GroupBarProps = {
  groups: Group[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onAll: () => void;
};

/**
 * Leiste im Reiter „Gruppen“: Gruppe wählen (bei mehreren), darunter eigener Bestand und Weg zur Gruppenseite.
 */
export function GroupBar({ groups, selectedId, onSelect, onOpen, onAll }: GroupBarProps) {
  const { challenges, currentUserId } = useStore();
  const selected = groups.find((g) => g.id === selectedId);
  return (
    <View style={styles.wrap}>
      {groups.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {groups.map((g) => {
            const active = g.id === selectedId;
            return (
              <Pressable
                key={g.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => onSelect(g.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                  {g.name}
                </Text>
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" accessibilityLabel={t('Alle Gruppen')} onPress={onAll} style={styles.chip}>
            <Icon name="plus" size={14} color={color.text.secondary} />
          </Pressable>
        </ScrollView>
      ) : null}
      {selected ? (
        // Hier bist Du gerade: Gruppenname als Überschrift ohne Fläche, nicht wie ein Knopf (Daria, 22.10.2026).
        // Nur das kleine Zahnrad führt zur Gruppenseite.
        <View style={styles.here}>
          <View style={styles.flex}>
            <Text style={styles.hereName} numberOfLines={1} accessibilityRole="header">
              {selected.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {t('{members} Mitglieder', { members: selected.members.length })}
            </Text>
          </View>
          <View style={styles.hereEden} accessible accessibilityLabel={t('Du, {edensteine} Edensteine', { edensteine: myEdensteine(selected, challenges, currentUserId) })}>
            <View style={styles.hereCrystal}>
              <View style={styles.hereCrystalFloat}>
                <LivingCrystal height={44} seed={selected.id} />
              </View>
            </View>
            <Text style={styles.eden}>{myEdensteine(selected, challenges, currentUserId)}</Text>
          </View>
          <IconButton
            icon="settings"
            iconSize={18}
            iconColor={color.text.secondary}
            accessibilityLabel={t('{name} verwalten', { name: selected.name })}
            onPress={() => onOpen(selected.id)}
          />
        </View>
      ) : null}
    </View>
  );
}

/** Reiter „Gruppen“ ohne Gruppe oder ohne Aufgaben */
export function GroupsEmpty({
  title = 'Gruppen',
  message = 'Verteilt Aufgaben in Eurer WG, Familie oder im Verein. Statt Euro gibt es Edensteine, die nur in Eurer Gruppe gelten.',
  onCreate,
  onJoin,
}: {
  title?: string;
  message?: string;
  onCreate?: () => void;
  onJoin?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <KaterCard title={title}>{message}</KaterCard>
      {onCreate ? <Button label="Gruppe gründen" onPress={onCreate} /> : null}
      {onJoin ? <Button label="Mit Code beitreten" variant="secondary" onPress={onJoin} /> : null}
    </View>
  );
}

const CRYSTAL = 88;

const styles = StyleSheet.create({
  here: { flexDirection: 'row', alignItems: 'center', gap: space[8], paddingTop: space[4], paddingBottom: space[4] },
  hereName: { ...text.title, fontSize: 22, lineHeight: 28, color: color.text.primary },
  hereEden: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  hereCrystal: { width: 26, height: 22, alignItems: 'center' },
  hereCrystalFloat: { position: 'absolute', top: (22 - 44) / 2 },
  wrap: { gap: space[8], paddingHorizontal: space[16] },
  chips: { gap: space[8] },
  chip: {
    minHeight: 36,
    paddingHorizontal: space[12],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.line.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: color.accent.confirmation, borderColor: color.accent.confirmation },
  chipText: { ...text.caption, fontSize: 13, color: color.text.primary },
  chipTextActive: { fontFamily: font.medium, color: color.bg.screen },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    padding: space[12],
    borderRadius: radius.xl,
    backgroundColor: color.bg.surface,
  },
  pressed: { opacity: 0.7 },
  flex: { flex: 1, gap: space[2] },
  name: { ...text.cardTitle, color: color.text.primary },
  meta: { ...text.caption, color: color.text.secondary },
  eden: { fontFamily: font.display, fontSize: 18, lineHeight: 22, color: color.accent.confirmation },
  crystal: { width: CRYSTAL * 0.6, height: 40, alignItems: 'center' },
  crystalFloat: { position: 'absolute', top: (40 - CRYSTAL) / 2 },
  groupText: { marginLeft: space[8] },
  empty: { gap: space[12], paddingHorizontal: space[16] },
});
