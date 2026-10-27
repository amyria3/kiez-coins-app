import { StyleSheet, View } from 'react-native';

import { Text } from './T';
import { Avatar } from './AuthorRow';
import { LivingCrystal } from './icons/Brand';
import { leaderboard } from '../data/groups';
import { useStore } from '../data/store';
import type { Group, User } from '../data/types';
import { t } from '../data/texts';
import { color, radius, space, text } from '../theme/tokens';

/**
 * Dein Platz in der Rangliste einer Gruppe, in „Was Du so machst“ unter „In Gruppen“ (UX-Audit, Daria, 27.10.2026).
 * Rangliste an: alle Mitglieder nach Edensteinen, Deine Zeile hervorgehoben. Aus: nur Deine eigenen Edensteine.
 */
export function GroupRanking({ group }: { group: Group }) {
  const { challenges, users, currentUserId } = useStore();
  const ranks = leaderboard(group, challenges);
  const myIndex = ranks.findIndex((r) => r.userId === currentUserId);
  const rows = group.showLeaderboard ? ranks : ranks.filter((r) => r.userId === currentUserId);
  const userOf = (userId: string): User =>
    users.find((u) => u.id === userId) ?? { id: userId, name: 'Unbekannt', firstName: 'Unbekannt' };

  return (
    <View style={styles.block}>
      <Text style={styles.sectionLabel}>{group.showLeaderboard ? 'Rangliste' : 'Deine Edensteine'}</Text>
      {group.showLeaderboard && myIndex >= 0 ? (
        <Text style={styles.place} accessibilityRole="header">
          {t('Dein Platz: {rank} von {total}', { rank: myIndex + 1, total: ranks.length })}
        </Text>
      ) : null}
      <View style={styles.list}>
        {rows.map((r) => {
          const me = r.userId === currentUserId;
          const user = userOf(r.userId);
          const rank = ranks.indexOf(r) + 1;
          return (
            <View
              key={r.userId}
              accessible
              accessibilityLabel={
                group.showLeaderboard
                  ? t('Platz {index}, {name}, {edensteine} Edensteine', { index: rank, name: me ? t('Du') : user.name, edensteine: r.edensteine })
                  : t('Du, {edensteine} Edensteine', { edensteine: r.edensteine })
              }
              style={[styles.row, me && styles.rowMe]}
            >
              {group.showLeaderboard ? <Text style={styles.rank}>{rank}</Text> : null}
              <Avatar user={user} diameter={32} />
              <View style={styles.flex}>
                <Text noTranslate style={styles.name} numberOfLines={1}>
                  {me ? t('Du') : user.name}
                </Text>
                <Text style={styles.meta}>
                  {r.done === 1 ? t('1 Aufgabe erledigt') : t('{done} Aufgaben erledigt', { done: r.done })}
                </Text>
              </View>
              <View style={styles.crystal}>
                <View style={styles.crystalFloat}>
                  <LivingCrystal height={36} seed={`rang-${user.id}`} />
                </View>
              </View>
              <Text style={styles.eden}>{r.edensteine}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space[8] },
  sectionLabel: { ...text.caption, letterSpacing: 1, textTransform: 'uppercase', color: color.text.secondary },
  place: { ...text.title, color: color.text.primary },
  list: { gap: space[8] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[12],
    paddingHorizontal: space[12],
    borderRadius: radius.xl,
    backgroundColor: color.bg.surface,
  },
  rowMe: { borderWidth: 1, borderColor: color.accent.confirmation },
  rank: { ...text.metric, fontSize: 18, width: 22, textAlign: 'center', color: color.text.secondary },
  flex: { flex: 1, gap: space[2] },
  name: { ...text.title, fontSize: 16, color: color.text.primary },
  meta: { ...text.caption, color: color.text.secondary },
  // Einzelner Edenstein je Zeile, ragt über die Zeilenhöhe (Daria, 22.10.2026)
  crystal: { width: 24, height: 22, alignItems: 'center' },
  crystalFloat: { position: 'absolute', top: (22 - 36) / 2 },
  eden: { ...text.metric, fontSize: 18, color: color.accent.confirmation, minWidth: 24, textAlign: 'right' },
});
