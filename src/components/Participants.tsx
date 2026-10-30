import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { t, tAbout } from '../data/texts';
import type { Challenge, User } from '../data/types';
import { joinedIds, joinRequests, participantsOpen, participationText, maxParticipants } from '../data/weChallenge';
import { color, font, space, stroke, text } from '../theme/tokens';
import { AuthorRow } from './AuthorRow';
import { Text } from './T';

type Props = {
  challenge: Challenge;
  users: User[];
  currentUserId: string;
  isAuthor: boolean;
  onOpenProfile: (userId: string) => void;
  onAnswer: (userId: string, accept: boolean) => void;
  onRemove: (userId: string) => void;
};

/**
 * „Wer macht mit“ in der Detailansicht einer We-Challenge mit mehreren Personen (Daria, 27.10.2026).
 * Alle sehen, wer dabei ist. Die Erstellerin sieht dazu die Anfragen, nimmt an, lehnt ab und schließt aus,
 * bis jemand erledigt meldet.
 */
export function ParticipantsSection({ challenge: c, users, currentUserId, isAuthor, onOpenProfile, onAnswer, onRemove }: Props) {
  const joined = joinedIds(c);
  const requests = isAuthor ? joinRequests(c) : [];
  const canChange = isAuthor && participantsOpen(c);
  const userOf = (id: string): User => users.find((u) => u.id === id) ?? { id, name: t('Unbekannt'), firstName: t('Unbekannt') };

  const confirmRemove = (user: User) =>
    Alert.alert(t('{name} ausschließen?', { name: user.name }), tAbout(user, '{name} ist dann nicht mehr dabei und kann nicht wieder beitreten.', { name: user.name }), [
      { text: t('Abbrechen'), style: 'cancel' },
      { text: t('Ausschließen'), style: 'destructive', onPress: () => onRemove(user.id) },
    ]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Wer macht mit</Text>
        <Text style={styles.count}>{participationText(maxParticipants(c), c.joinMode, joined.length)}</Text>
      </View>
      {joined.length === 0 ? <Text style={styles.empty}>Noch niemand dabei.</Text> : null}
      {joined.map((id) => {
        const user = userOf(id);
        return (
          <AuthorRow
            key={id}
            user={user}
            onPress={() => onOpenProfile(id)}
            trailing={
              canChange && id !== currentUserId ? (
                <SmallAction label="Ausschließen" tone="error" onPress={() => confirmRemove(user)} />
              ) : undefined
            }
          />
        );
      })}
      {joined.length > 1 ? (
        <Text style={styles.empty}>
          {t('Jede teilnehmende Person kann erledigt melden, für alle.')}
        </Text>
      ) : null}
      {requests.length ? (
        <>
          <Text style={styles.subtitle}>{t('Anfragen ({n})', { n: requests.length })}</Text>
          {requests.map((r) => {
            const user = userOf(r.userId);
            return (
              <AuthorRow
                key={r.userId}
                user={user}
                onPress={() => onOpenProfile(r.userId)}
                trailing={
                  canChange ? (
                    <View style={styles.actions}>
                      <SmallAction label="Ablehnen" tone="muted" onPress={() => onAnswer(r.userId, false)} />
                      <SmallAction label="Annehmen" tone="confirm" onPress={() => onAnswer(r.userId, true)} />
                    </View>
                  ) : undefined
                }
              />
            );
          })}
        </>
      ) : null}
    </View>
  );
}

/** Kleine Textaktion am Ende einer Zeile, mit voller Tippfläche */
function SmallAction({ label, tone, onPress }: { label: string; tone: 'error' | 'muted' | 'confirm'; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.small, pressed && styles.pressed]}
    >
      <Text style={[styles.smallText, tone === 'error' && styles.error, tone === 'confirm' && styles.confirm]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[4], borderTopWidth: stroke.ultraThin, borderTopColor: color.line.hairline, paddingTop: space[12] },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space[8] },
  title: { ...text.body, fontFamily: font.regular, color: color.text.primary },
  subtitle: { ...text.caption, color: color.text.secondary, marginTop: space[8] },
  count: { ...text.caption, color: color.text.secondary },
  empty: { ...text.caption, color: color.text.secondary },
  actions: { flexDirection: 'row', gap: space[12] },
  small: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space[4] },
  smallText: { ...text.caption, fontSize: 14, color: color.text.secondary },
  error: { color: color.accent.error },
  confirm: { color: color.accent.confirmation },
  pressed: { opacity: 0.7 },
});
