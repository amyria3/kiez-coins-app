import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './T';

import { leaderboard, MAX_GROUPS } from '../data/groups';
import type { Challenge, Group, User } from '../data/types';
import { joinedIds } from '../data/weChallenge';
import { Avatar } from './AuthorRow';
import { color, font, radius, size, space, stroke, text } from '../theme/tokens';
import { FeedStateMessage } from './FeedStateMessage';
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
  /**
   * Klein im Erstellen-Blatt (Daria, 2026-11-14: „Ich muss sehen, welche Gruppe“): Name in Fließtextgröße mit „Gruppe:“
   * davor, ohne Zahnrad, ohne eigenen Rand links und rechts.
   */
  compact?: boolean;
  /**
   * Kopf der Gruppe im Feed (Daria, 2026-11-16, Mockup): Avatare, „x geschafft · Platz y“ und „1 Aufgabe wartet“.
   * Ohne diese Angaben nur die Auswahl wie bisher.
   */
  summary?: {
    users: User[];
    challenges: Challenge[];
    currentUserId?: string;
    /** Avatare antippen: Mitgliederliste */
    onMembers: () => void;
    /** „Aufgabe wartet“ antippen: zur ersten solchen Karte */
    onWaiting: (challengeId: string) => void;
  };
};

/** Bis so viele Avatare, dann „+n“ */
const MAX_AVATARS = 5;

/** Gruppenaufgabe, die noch niemand übernommen hat */
const isWaiting = (c: Challenge, groupId: string) =>
  c.groupId === groupId && c.status === 'open' && c.type !== 'photo' && c.type !== 'before_after' && joinedIds(c).length === 0;

/**
 * Gruppenauswahl unter dem Umschalter „Im Kiez / In Gruppen“, im Feed und in „Was Du so machst“ (UX-Audit, Daria, 27.10.2026):
 * Der Name der gewählten Gruppe öffnet das Auswahlmenü mit allen Gruppen, unmittelbar darunter „Neue Gruppe erstellen“.
 * Das Zahnrad führt zur Gruppenseite. Edensteine und Anzahl der Mitglieder stehen hier nicht.
 */
export function GroupBar({ groups, selectedId, onSelect, onOpen, onCreate, compact = false, summary }: GroupBarProps) {
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
    <View style={[styles.wrap, compact && styles.compact]}>
      <View style={[styles.here, compact && styles.compact]}>
        {/* Name bündig links, Zahnrad direkt rechts daneben, Pfeil bündig rechts (Daria, 27.10.2026).
            Name, Freiraum und Pfeil öffnen das Menü. */}
        {/* Name mit Pfeil direkt dahinter öffnet das Menü, Zahnrad bündig rechts (Daria, 2026-11-16, Mockup: wie der
            Kopf des Kalenders, Name in der Schrift der Fototitel) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Gruppe wählen, gewählt: {name}', { name: selected.name })}
          accessibilityState={{ expanded: open }}
          onPress={toggle}
          style={({ pressed }) => [styles.name, pressed && styles.pressed]}
        >
          {compact ? (
            <Text style={styles.compactName} numberOfLines={1}>
              {t('Gruppe: {name}', { name: selected.name })}
            </Text>
          ) : (
            <Text noTranslate style={styles.hereName} numberOfLines={1} accessibilityRole="header">
              {selected.name}
            </Text>
          )}
          <View style={[styles.caret, { transform: [{ rotate: `${turn}deg` }] }]}>
            <Icon name="chevron-right" size={size.icon} color={color.text.primary} />
          </View>
        </Pressable>
        <View style={styles.flex} />
        {compact ? null : (
          <IconButton
            icon="settings"
            iconSize={18}
            iconColor={color.text.primary}
            accessibilityLabel={t('{name} verwalten', { name: selected.name })}
            onPress={() => onOpen(selected.id)}
          />
        )}
      </View>
      {summary && !compact && !open ? <GroupSummary group={selected} {...summary} /> : null}
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

/** Avatare, Zusammenfassung und wartende Aufgabe unter dem Namen (Daria, 2026-11-16) */
function GroupSummary({
  group,
  users,
  challenges,
  currentUserId,
  onMembers,
  onWaiting,
}: { group: Group } & NonNullable<GroupBarProps['summary']>) {
  const userOf = (id: string): User => users.find((u) => u.id === id) ?? { id, name: '?', firstName: '?' };
  // Du zuletzt, damit die anderen vorn stehen
  const members = [...group.members].sort((a, b) => Number(a.userId === currentUserId) - Number(b.userId === currentUserId));
  const shown = members.slice(0, MAX_AVATARS);
  const more = members.length - shown.length;
  const board = leaderboard(group, challenges);
  const done = challenges.filter((c) => c.groupId === group.id && c.status === 'confirmed').length;
  const mine = board.findIndex((e) => e.userId === currentUserId);
  // Platz nur mit Rangliste und wenn Du schon Edensteine hast
  const place = group.showLeaderboard && mine >= 0 && board[mine].edensteine > 0 ? mine + 1 : undefined;
  const waiting = challenges.filter((c) => isWaiting(c, group.id));
  const meta = place ? t('{done} geschafft · Platz {place}', { done, place }) : t('{done} geschafft', { done });
  return (
    <View style={styles.summary}>
      <View style={styles.summaryRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Mitglieder von {name}', { name: group.name })}
          onPress={onMembers}
          hitSlop={8}
          style={({ pressed }) => [styles.avatars, pressed && styles.pressed]}
        >
          {shown.map((m, i) => (
            <View key={m.userId} style={[styles.avatar, i > 0 && styles.avatarOverlap]}>
              <Avatar user={userOf(m.userId)} diameter={26} badge={false} />
            </View>
          ))}
          {more > 0 ? <Text style={styles.more}>+{more}</Text> : null}
        </Pressable>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {waiting.length ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onWaiting(waiting[0].id)}
          style={({ pressed }) => [styles.waiting, pressed && styles.pressed]}
        >
          <Text style={styles.waitingText}>
            {waiting.length === 1 ? t('1 Aufgabe wartet') : t('{n} Aufgaben warten', { n: waiting.length })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Ohne Gruppe: Cat The Käptn mit Titel und Knöpfen, wie der leere Reiter „Gruppen“ im Feed (Daria, 29.10.2026).
 * Genutzt in „Was Du so machst“, im Profil des Fashionable Look und im Erstellen-Blatt.
 */
export function GroupsEmpty({ onCreate, onJoin }: { onCreate: () => void; onJoin?: () => void }) {
  return (
    <FeedStateMessage
      variant="empty"
      body="Erstelle Deine erste Gruppe"
      action="Gruppe gründen"
      onAction={onCreate}
      secondary={onJoin ? { label: 'Mit Passcode beitreten', onPress: onJoin } : undefined}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[8], paddingHorizontal: space[16] },
  // Name und Pfeil auf einer Linie mit dem Text im Hinweis darüber und in der Liste darunter (Daria, 30.10.2026)
  here: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingTop: space[4], paddingBottom: space[4], paddingHorizontal: space[16] },
  name: { flexShrink: 1, minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space[4] },
  caret: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  hereName: { ...text.displaySm, color: color.text.primary, flexShrink: 1 },
  summary: { gap: space[12], paddingHorizontal: space[16], paddingBottom: space[8] },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[12] },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  avatar: { borderRadius: 999, borderWidth: 2, borderColor: color.bg.screen },
  avatarOverlap: { marginLeft: -8 },
  more: { ...text.bodySm, color: color.text.secondary, marginLeft: space[6] },
  meta: { ...text.bodyLarge, color: color.text.secondary, flexShrink: 1 },
  waiting: { alignSelf: 'flex-start', borderRadius: radius.full, backgroundColor: color.routine.task, paddingVertical: space[6], paddingHorizontal: space[12] },
  waitingText: { ...text.bodySm, color: color.routine.ink },
  compact: { paddingHorizontal: 0 },
  compactName: { ...text.bodyStrong, color: color.text.primary, flexShrink: 1 },
  menu: { borderRadius: radius.md, backgroundColor: color.bg.surface, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', gap: space[12], minHeight: 52, paddingVertical: space[8], paddingHorizontal: space[16] },
  optionDivider: { borderTopWidth: stroke.ultraThin, borderTopColor: color.line.hairline },
  optionName: { ...text.body, color: color.text.primary },
  optionNameActive: { fontFamily: font.medium },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
});
