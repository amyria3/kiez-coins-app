import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from './T';

import { useStore } from '../data/store';
import { myEdensteine } from '../data/groups';
import type { Group } from '../data/types';
import { color, font, isInstagram, radius, size, space, text } from '../theme/tokens';
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
  const router = useRouter();
  // Nächste offene Aufgabe der Gruppe, zuerst die von anderen
  const open = challenges.filter((c) => c.groupId === selected?.id && c.status === 'open' && !c.assigneeId);
  const openTask = open.find((c) => c.authorId !== currentUserId) ?? open[0];
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
                <Text noTranslate style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
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
            <View style={styles.titleRow}>
              <Text noTranslate style={styles.hereName} numberOfLines={1} accessibilityRole="header">
                {selected.name}
              </Text>
              <IconButton
                icon="settings"
                iconSize={16}
                iconColor={color.text.secondary}
                accessibilityLabel={t('{name} verwalten', { name: selected.name })}
                onPress={() => onOpen(selected.id)}
              />
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {t('{members} Mitglieder', { members: selected.members.length })}
            </Text>
          </View>
          {/* Stein: lebt, wenn es offene Aufgaben gibt, und führt zur nächsten. Sonst klein, blass und still. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              openTask
                ? t('Offene Aufgabe öffnen: {title}', { title: openTask.title })
                : t('In dieser Gruppe gibt es nichts zu holen!')
            }
            onPress={() =>
              openTask ? router.push(`/challenge/${openTask.id}`) : Alert.alert(t('In dieser Gruppe gibt es nichts zu holen!'))
            }
            hitSlop={8}
            style={({ pressed }) => [styles.hereEden, !openTask && styles.hereEdenCalm, pressed && styles.pressed]}
          >
            <View style={styles.hereCrystal}>
              <View style={[styles.hereCrystalFloat, !openTask && styles.hereCrystalFloatCalm]}>
                <LivingCrystal height={isInstagram ? 34 : openTask ? 44 : 35} seed={selected.id} calm={!openTask} />
              </View>
            </View>
            <Text style={styles.eden}>{myEdensteine(selected, challenges, currentUserId)}</Text>
          </Pressable>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  hereEden: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  hereEdenCalm: { opacity: 0.4 },
  hereCrystalFloatCalm: { top: (22 - 35) / 2 },
  hereCrystal: { width: 26, height: 22, alignItems: 'center' },
  hereCrystalFloat: { position: 'absolute', top: (22 - (isInstagram ? 34 : 44)) / 2 },
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
  eden: isInstagram
    ? { fontFamily: font.semiBold, fontSize: 16, lineHeight: 20, color: color.text.primary, fontVariant: ['tabular-nums'] }
    : { fontFamily: font.display, fontSize: 18, lineHeight: 22, color: color.accent.confirmation },
  crystal: { width: CRYSTAL * 0.6, height: 40, alignItems: 'center' },
  crystalFloat: { position: 'absolute', top: (40 - CRYSTAL) / 2 },
  groupText: { marginLeft: space[8] },
  empty: { gap: space[12], paddingHorizontal: space[16] },
});
