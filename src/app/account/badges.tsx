import { Pressable, StyleSheet, View } from 'react-native';

import { BadgeIcon } from '../../components/BadgeIcon';
import { KaterBubble } from '../../components/Content';
import { SwitchRow } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { Text } from '../../components/T';
import { BADGES, badgeSteps, badgeTitle, useMyBadges } from '../../data/badges';
import { t } from '../../data/texts';
import { useGoBack } from '../../lib/goBack';
import { color, font, radius, space, stroke, text } from '../../theme/tokens';

/**
 * Route `account/badges` (Dein Konto › Meine Abzeichen, Daria, 2026-10-31): erhaltene Abzeichen ein- und ausblenden
 * und eins für den Avatar wählen. Darunter die offenen mit Fortschritt.
 */
export default function BadgesScreen() {
  const goBack = useGoBack();
  const { mine, update } = useMyBadges();
  const earned = BADGES.map((meta) => ({ meta, own: mine?.badges.find((b) => b.badge === meta.kind) })).filter((x) => !!x.own);
  const open = BADGES.filter((meta) => !mine?.badges.some((b) => b.badge === meta.kind) && meta.kind !== 'pionier');

  return (
    <SubScreen title="Meine Abzeichen" navigation="back" onLeadingPress={goBack}>
      <KaterBubble>Eingeblendete Abzeichen stehen in Deinem Profil. Eins wählst Du für Deinen Avatar.</KaterBubble>

      {mine === null ? (
        <Text style={styles.empty}>Abzeichen werden geladen …</Text>
      ) : earned.length ? (
        <View style={styles.block}>
          <Text style={styles.label}>Erhalten</Text>
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
        </View>
      ) : (
        <Text style={styles.empty}>Noch kein Abzeichen. Lade Leute ein, poste und packt gemeinsam an.</Text>
      )}

      {mine && open.length ? (
        <View style={styles.block}>
          <Text style={styles.label}>Noch offen</Text>
          <View style={styles.list}>
            {open.map((meta, i) => {
              const steps = badgeSteps(meta.kind, mine.progress);
              return (
                <View key={meta.kind} style={[styles.row, i > 0 && styles.divider]}>
                  <BadgeIcon kind={meta.kind} size={44} muted />
                  <View style={[styles.flex, styles.openText]}>
                    <View style={styles.openHead}>
                      <Text style={styles.openName}>{meta.name}</Text>
                      {steps ? (
                        <Text noTranslate style={styles.count}>
                          {t('{have} von {need}', steps)}
                        </Text>
                      ) : null}
                    </View>
                    {steps ? (
                      <View style={styles.track}>
                        <View style={[styles.bar, { width: `${Math.round((steps.have / steps.need) * 100)}%` }]} />
                      </View>
                    ) : null}
                    <Text style={styles.rule}>{meta.rule}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  block: { gap: space[8] },
  label: { ...text.caption, letterSpacing: 1, textTransform: 'uppercase', color: color.text.secondary },
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
  openText: { gap: space[4] },
  openHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8] },
  openName: { ...text.body, fontFamily: font.medium, color: color.text.secondary },
  count: { ...text.caption, color: color.text.secondary },
  track: { height: 6, borderRadius: 3, backgroundColor: color.line.hairline, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3, backgroundColor: color.text.secondary },
  rule: { ...text.caption, color: color.text.secondary },
  empty: { ...text.body, color: color.text.secondary },
});
