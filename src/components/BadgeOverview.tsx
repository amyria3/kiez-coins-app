import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BADGES, badgeSteps, badgeTitle, useMyBadges } from '../data/badges';
import { t } from '../data/texts';
import { color, font, radius, space, stroke, text } from '../theme/tokens';
import { BadgeIcon } from './BadgeIcon';
import { Text } from './T';

/**
 * Abzeichen in „Me“ (Daria, 2026-11-01): erhaltene und offene mit Fortschritt. Ein Tipp auf die erhaltenen
 * führt zu Persönliche Angaben, wo sie sich ein- und ausblenden und für den Avatar wählen lassen.
 * `gutter`: seitlicher Rand der Seite, falls die Liste ihn selbst braucht (Fashionable-Profil).
 */
export function BadgeOverview({ gutter = 0 }: { gutter?: number }) {
  const router = useRouter();
  const { mine } = useMyBadges();
  if (!mine) return null;
  const earned = BADGES.map((meta) => ({ meta, own: mine.badges.find((b) => b.badge === meta.kind) })).filter((x) => !!x.own);
  const open = BADGES.filter((meta) => !mine.badges.some((b) => b.badge === meta.kind) && meta.kind !== 'pionier');
  return (
    <View style={[styles.wrap, { paddingHorizontal: gutter }]}>
      {earned.length ? (
        <View style={styles.block}>
          <Text style={styles.label}>Deine Abzeichen</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Abzeichen einblenden und für den Avatar wählen')}
            onPress={() => router.push('/account/profile')}
            style={({ pressed }) => [styles.list, pressed && styles.pressed]}
          >
            {earned.map(({ meta, own }, i) => (
              <View key={meta.kind} style={[styles.row, i > 0 && styles.divider]}>
                <BadgeIcon kind={meta.kind} number={own!.number} size={44} muted={!own!.visible} />
                <View style={styles.flex}>
                  <Text noTranslate style={styles.name}>
                    {badgeTitle(meta.kind, own!.number)}
                  </Text>
                  <Text style={styles.sub}>{own!.visible ? meta.earned : 'Ausgeblendet'}</Text>
                </View>
                {own!.selected ? <Text style={styles.tag}>Am Avatar</Text> : null}
              </View>
            ))}
          </Pressable>
        </View>
      ) : null}
      {open.length ? (
        <View style={styles.block}>
          <Text style={styles.label}>Noch offen</Text>
          <View style={styles.list}>
            {open.map((meta, i) => {
              const steps = badgeSteps(meta.kind, mine.progress);
              return (
                <View key={meta.kind} style={[styles.row, i > 0 && styles.divider]}>
                  <BadgeIcon kind={meta.kind} size={44} muted />
                  <View style={styles.flex}>
                    <View style={styles.head}>
                      <Text style={styles.openName}>{meta.name}</Text>
                      {steps ? (
                        <Text noTranslate style={styles.sub}>
                          {t('{have} von {need}', steps)}
                        </Text>
                      ) : null}
                    </View>
                    {steps ? (
                      <View style={styles.track}>
                        <View style={[styles.bar, { width: `${Math.round((steps.have / steps.need) * 100)}%` }]} />
                      </View>
                    ) : null}
                    <Text style={styles.sub}>{meta.rule}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[24] },
  block: { gap: space[8] },
  label: { ...text.caption, letterSpacing: 1, textTransform: 'uppercase', color: color.text.secondary },
  list: { borderRadius: radius.xl + 2, backgroundColor: color.bg.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[12], paddingHorizontal: space[16] },
  divider: { borderTopWidth: stroke.ultraThin, borderTopColor: color.line.hairline },
  flex: { flex: 1, gap: space[4] },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8] },
  name: { ...text.body, fontFamily: font.medium, color: color.text.primary },
  openName: { ...text.body, fontFamily: font.medium, color: color.text.secondary },
  sub: { ...text.caption, color: color.text.secondary },
  tag: { ...text.caption, fontFamily: font.medium, color: color.text.primary },
  track: { height: 6, borderRadius: 3, backgroundColor: color.line.hairline, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3, backgroundColor: color.text.secondary },
  pressed: { opacity: 0.8 },
});
