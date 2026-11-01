import { Pressable, StyleSheet, View } from 'react-native';

import { BadgeIcon } from './BadgeIcon';
import { FieldGroup } from './Content';
import { SwitchRow } from './Form';
import { Text } from './T';
import { BADGES, badgeTitle, useMyBadges } from '../data/badges';
import { color, font, radius, space, stroke, text } from '../theme/tokens';

/**
 * Abzeichen in Dein Konto › Persönliche Angaben (Daria, 2026-11-01; vorher eigener Bildschirm):
 * erhaltene ein- und ausblenden und eins für den Avatar wählen. Erhaltene und offene zeigt „Me“ (BadgeOverview).
 */
export function BadgeSettings() {
  const { mine, update } = useMyBadges();
  const earned = BADGES.map((meta) => ({ meta, own: mine?.badges.find((b) => b.badge === meta.kind) })).filter((x) => !!x.own);

  return (
    <>
      {mine === null ? (
        <FieldGroup label="Abzeichen">
          <Text style={styles.empty}>Abzeichen werden geladen …</Text>
        </FieldGroup>
      ) : earned.length ? (
        <FieldGroup label="Abzeichen">
          <Text style={styles.hint}>Eingeblendete Abzeichen stehen in Deinem Profil. Eins wählst Du für Deinen Avatar.</Text>
          <View style={styles.list}>
            {earned.map(({ meta, own }, i) => (
              <View key={meta.kind} style={[styles.row, i > 0 && styles.divider]}>
                <BadgeIcon kind={meta.kind} number={own!.number} size={44} />
                <View style={styles.flex}>
                  <SwitchRow
                    label={badgeTitle(meta.kind, own!.number)}
                    description={meta.earned}
                    value={own!.visible}
                    onValueChange={(visible) => update(meta.kind, { visible }).catch(() => undefined)}
                  />
                  {own!.visible ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: own!.selected }}
                      onPress={() => update(meta.kind, { selected: !own!.selected }).catch(() => undefined)}
                      style={({ pressed }) => [styles.pick, own!.selected && styles.pickOn, pressed && styles.pressed]}
                    >
                      <Text style={[styles.pickText, own!.selected && styles.pickTextOn]}>
                        {own!.selected ? 'Am Avatar' : 'Am Avatar zeigen'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </FieldGroup>
      ) : (
        <FieldGroup label="Abzeichen">
          <Text style={styles.empty}>Noch kein Abzeichen. Lade Leute ein, poste und packt gemeinsam an.</Text>
        </FieldGroup>
      )}

    </>
  );
}

const styles = StyleSheet.create({
  hint: { ...text.caption, color: color.text.secondary },
  list: { borderRadius: radius.xl + 2, backgroundColor: color.bg.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[12], paddingHorizontal: space[16] },
  divider: { borderTopWidth: stroke.ultraThin, borderTopColor: color.line.hairline },
  flex: { flex: 1, gap: space[4] },
  pick: {
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: space[12],
    borderRadius: radius.full,
    borderWidth: stroke.thin,
    borderColor: color.line.hairline,
  },
  pickOn: { backgroundColor: color.text.primary, borderColor: color.text.primary },
  pickText: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.text.primary },
  pickTextOn: { color: color.bg.screen },
  pressed: { opacity: 0.7 },
  empty: { ...text.body, color: color.text.secondary },
});
