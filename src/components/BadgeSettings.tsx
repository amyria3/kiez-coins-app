import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BadgeIcon } from './BadgeIcon';
import { FieldGroup } from './Content';
import { RadioOption, SwitchRow } from './Form';
import { Text } from './T';
import { BADGES, badgeTitle, useMyBadges } from '../data/badges';
import { color, radius, space, stroke, text } from '../theme/tokens';

/**
 * Abzeichen in Dein Konto › Persönliche Angaben (Daria, 2026-11-01). Zwei Einstellungen, je mit dem passenden
 * Element: „Im Profil zeigen“ ist an oder aus je Abzeichen (Schalter), „Am Avatar“ ist eine Wahl aus mehreren
 * (Radio). Erhaltene und offene zeigt „Me“ (BadgeOverview). Ein Tipp auf das Icon öffnet das Detail.
 */
export function BadgeSettings() {
  const router = useRouter();
  const { mine, update } = useMyBadges();
  const earned = BADGES.map((meta) => ({ meta, own: mine?.badges.find((b) => b.badge === meta.kind) })).filter((x) => !!x.own);
  const shown = earned.filter((x) => x.own!.visible);
  // Ohne eigene Wahl zeigt der Avatar das zuletzt erhaltene (wie die Sicht avatar_badges)
  const onAvatar =
    shown.find((x) => x.own!.selected)?.meta.kind ??
    [...shown].sort((a, b) => b.own!.earnedAt.localeCompare(a.own!.earnedAt))[0]?.meta.kind;

  if (mine === null) {
    return (
      <FieldGroup label="Abzeichen">
        <Text style={styles.empty}>Abzeichen werden geladen …</Text>
      </FieldGroup>
    );
  }
  if (!earned.length) {
    return (
      <FieldGroup label="Abzeichen">
        <Text style={styles.empty}>Noch kein Abzeichen. Lade Leute ein, poste und packt gemeinsam an.</Text>
      </FieldGroup>
    );
  }
  return (
    <>
      <FieldGroup label="Abzeichen im Profil zeigen">
        <View style={styles.list}>
          {earned.map(({ meta, own }, i) => (
            <View key={meta.kind} style={[styles.row, i > 0 && styles.divider]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={badgeTitle(meta.kind, own!.number)}
                hitSlop={8}
                onPress={() => router.push({ pathname: '/badges/[kind]', params: { kind: meta.kind } })}
              >
                <BadgeIcon kind={meta.kind} number={own!.number} size={46} muted={!own!.visible} lines />
              </Pressable>
              <View style={styles.flex}>
                <SwitchRow
                  label={badgeTitle(meta.kind, own!.number)}
                  description={meta.earned}
                  value={own!.visible}
                  onValueChange={(visible) => update(meta.kind, { visible }).catch(() => undefined)}
                />
              </View>
            </View>
          ))}
        </View>
      </FieldGroup>
      {shown.length > 1 ? (
        <FieldGroup label="Abzeichen am Avatar">
          {shown.map(({ meta, own }) => (
            <RadioOption
              key={meta.kind}
              label={badgeTitle(meta.kind, own!.number)}
              selected={onAvatar === meta.kind}
              onPress={() => update(meta.kind, { selected: true }).catch(() => undefined)}
            />
          ))}
        </FieldGroup>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: radius.md, backgroundColor: color.bg.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[8], paddingHorizontal: space[16] },
  divider: { borderTopWidth: stroke.ultraThin, borderTopColor: color.line.hairline },
  flex: { flex: 1 },
  empty: { ...text.body, color: color.text.secondary },
});
