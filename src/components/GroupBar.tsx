import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './T';

import { MAX_GROUPS } from '../data/groups';
import type { Group } from '../data/types';
import { color, font, radius, size, space, stroke, text } from '../theme/tokens';
import { Button } from './Button';
import { KaterCard } from './Content';
import { IconButton } from './IconButton';
import { Icon } from './icons/Icon';
import { isRtl, t } from '../data/texts';

type GroupBarProps = {
  groups: Group[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Zahnrad: Gruppenseite mit Einstellungen */
  onOpen: (id: string) => void;
  /** Letzter Eintrag im Auswahlmenü */
  onCreate: () => void;
};

/**
 * Gruppenauswahl unter dem Umschalter „Im Kiez / In Gruppen“, im Feed und in „Was Du so machst“ (UX-Audit, Daria, 27.10.2026):
 * Der Name der gewählten Gruppe öffnet das Auswahlmenü mit allen Gruppen, unmittelbar darunter „Neue Gruppe erstellen“.
 * Das Zahnrad führt zur Gruppenseite. Edensteine und Anzahl der Mitglieder stehen hier nicht.
 */
export function GroupBar({ groups, selectedId, onSelect, onOpen, onCreate }: GroupBarProps) {
  const [open, setOpen] = useState(false);
  const selected = groups.find((g) => g.id === selectedId) ?? groups[0];
  if (!selected) return null;
  // Pfeil zeigt nach unten, offen nach oben; in Arabisch und Hebräisch ist chevron-right gespiegelt
  const turn = (open ? -90 : 90) * (isRtl() ? -1 : 1);
  const toggle = () => setOpen((o) => !o);
  const create = () => {
    setOpen(false);
    if (groups.length >= MAX_GROUPS) {
      Alert.alert(
        t('Gruppen voll'),
        t('Du bist bereits in {MAX_GROUPS} Gruppen. Verlasse eine Gruppe, um einer neuen beizutreten oder eine neue zu gründen.', { MAX_GROUPS }),
      );
      return;
    }
    onCreate();
  };
  return (
    <View style={styles.wrap}>
      <View style={styles.here}>
        {/* Name bündig links, Zahnrad direkt rechts daneben, Pfeil bündig rechts (Daria, 27.10.2026).
            Name, Freiraum und Pfeil öffnen das Menü. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Gruppe wählen, gewählt: {name}', { name: selected.name })}
          accessibilityState={{ expanded: open }}
          onPress={toggle}
          style={({ pressed }) => [styles.name, pressed && styles.pressed]}
        >
          <Text noTranslate style={styles.hereName} numberOfLines={1} accessibilityRole="header">
            {selected.name}
          </Text>
        </Pressable>
        <IconButton
          icon="settings"
          iconSize={16}
          iconColor={color.text.secondary}
          accessibilityLabel={t('{name} verwalten', { name: selected.name })}
          onPress={() => onOpen(selected.id)}
        />
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          onPress={toggle}
          style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
        >
          <View style={[styles.caret, { transform: [{ rotate: `${turn}deg` }] }]}>
            <Icon name="chevron-right" size={size.icon} color={color.text.primary} />
          </View>
        </Pressable>
      </View>
      {open ? (
        <View style={styles.menu} accessibilityRole="menu">
          {groups.map((g, i) => {
            const active = g.id === selected.id;
            return (
              <Pressable
                key={g.id}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setOpen(false);
                  onSelect(g.id);
                }}
                style={({ pressed }) => [styles.option, i > 0 && styles.optionDivider, pressed && styles.pressed]}
              >
                <Text noTranslate style={[styles.optionName, styles.flex, active && styles.optionNameActive]} numberOfLines={1}>
                  {g.name}
                </Text>
                {active ? <Icon name="check" size={size.icon} color={color.accent.confirmation} /> : null}
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="menuitem"
            onPress={create}
            style={({ pressed }) => [styles.option, styles.optionDivider, pressed && styles.pressed]}
          >
            {/* Regelwerk: Plus heißt nur „Hinzufügen“ */}
            <Icon name="plus" size={16} color={color.text.primary} />
            <Text style={styles.optionName}>Neue Gruppe erstellen</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/** Reiter „Gruppen“ ohne Gruppe oder ohne Aufgaben */
export function GroupsEmpty({
  title = 'Gruppen',
  message = 'Verteilt Aufgaben in Eurem Verein, Eurer Hausgemeinschaft, WG oder Familie.',
  onCreate,
  onJoin,
  onPost,
}: {
  title?: string;
  message?: string;
  onCreate?: () => void;
  onJoin?: () => void;
  /** Leerer Feed: „Posten“ öffnet das Erstellen (Daria, 28.10.2026) */
  onPost?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <KaterCard title={title}>{message}</KaterCard>
      {onCreate ? <Button label="Gruppe gründen" onPress={onCreate} /> : null}
      {onJoin ? <Button label="Mit Beitrittscode beitreten" variant="secondary" onPress={onJoin} /> : null}
      {onPost ? <Button label="Posten" onPress={onPost} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[8], paddingHorizontal: space[16] },
  here: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingTop: space[4], paddingBottom: space[4] },
  name: { flexShrink: 1, minHeight: size.touchTarget, justifyContent: 'center' },
  trigger: { flex: 1, minHeight: size.touchTarget, alignItems: 'flex-end', justifyContent: 'center' },
  caret: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  hereName: { ...text.title, fontSize: 22, lineHeight: 28, color: color.text.primary, flexShrink: 1 },
  menu: { borderRadius: radius.xl, backgroundColor: color.bg.surface, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', gap: space[12], minHeight: 52, paddingVertical: space[8], paddingHorizontal: space[16] },
  optionDivider: { borderTopWidth: stroke.ultraThin, borderTopColor: color.line.hairline },
  optionName: { ...text.body, color: color.text.primary },
  optionNameActive: { fontFamily: font.medium },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  empty: { gap: space[12], paddingHorizontal: space[16] },
});
