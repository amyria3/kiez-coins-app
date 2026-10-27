import { StyleSheet, View } from 'react-native';
import { Text } from './T';

import { formatBountyShort, formatRemainingShort } from '../data/format';
import { Icon } from './icons/Icon';
import type { Challenge, ChallengeStatus } from '../data/types';
import { useStore } from '../data/store';
import { useIconPt } from './icons/fashionableSvgs';
import { color, font, isFashionable, radius, space, stroke, text } from '../theme/tokens';
import { CoinsIcon } from './icons/Brand';
import { t } from '../data/texts';

const statusStyles: Record<ChallengeStatus, { label: string; tint: string }> = {
  draft: { label: 'Entwurf', tint: color.text.secondary },
  open: { label: 'Offen', tint: color.accent.confirmation },
  accepted: { label: 'Angenommen', tint: color.accent.primary },
  reported: { label: 'Yey, erledigt!', tint: color.accent.signal },
  confirmed: { label: 'Bestätigt', tint: color.accent.affection },
  rejected: { label: 'Abgelehnt', tint: color.text.secondary },
  payment_open: { label: 'Zahlung offen', tint: color.accent.signal },
  paid_marked: { label: 'Als bezahlt markiert', tint: color.accent.primary },
  paid: { label: 'Bezahlt', tint: color.accent.affection },
  closed: { label: 'Geschlossen', tint: color.text.secondary },
  deleted: { label: 'Gelöscht', tint: color.accent.signal },
};

/**
 * Wer den Status ausgelöst hat (Daria, 27.10.2026): annehmen und erledigt melden die Annehmenden,
 * bestätigen, ablehnen und bezahlen die Ersteller:innen. Entwurf, offen, Zahlung offen, geschlossen
 * und gelöscht zeigen keinen Namen.
 */
const statusActor: Partial<Record<ChallengeStatus, 'assignee' | 'author'>> = {
  accepted: 'assignee',
  reported: 'assignee',
  confirmed: 'author',
  rejected: 'author',
  paid_marked: 'author',
  paid: 'author',
};

/** Zeichen zwischen Status und Deckname, gleichbedeutend mit „by“: „Angenommen · Sof“ */
const ACTOR_SEPARATOR = ' · ';

/**
 * Figma „StatusBadge“. Getönte Fläche ohne Rahmen, damit es nicht wie ein Button aussieht.
 * „Offen“ (grün) erscheint nur in der Vorschau beim Erstellen (`showOpen`), sonst ist offen der Normalfall (Daria, 22.10.2026).
 */
export function StatusBadge({
  status,
  showOpen,
  photo,
  beforeAfter,
  challenge,
}: {
  status: ChallengeStatus;
  /** Mit Challenge zeigt das Badge den Decknamen der Person, die den Status ausgelöst hat. */
  challenge?: Challenge;
  showOpen?: boolean;
  photo?: boolean;
  /** Vorher-Nachher: eigenes Badge wie beim Bild */
  beforeAfter?: boolean;
}) {
  // Nur ein Bild oder Vorher-Nachher, keine Aufgabe: eigenes Badge, solange es online ist
  const postOnly = (photo || beforeAfter) && (status === 'open' || status === 'draft');
  const { label, tint } = postOnly
    ? { label: beforeAfter ? 'Me-Challenge' : 'Nur ein Bild', tint: color.accent.affection }
    : statusStyles[status];
  const { users } = useStore();
  const role = postOnly ? undefined : statusActor[status];
  const actorId = role === 'assignee' ? challenge?.assigneeId : role === 'author' ? challenge?.authorId : undefined;
  const actor = actorId ? users.find((u) => u.id === actorId)?.name : undefined;
  if (status === 'open' && !showOpen && !postOnly) return null;
  return (
    <View style={[styles.status, { backgroundColor: `${tint}26` }]}>
      <Text style={[text.caption, { color: tint }]} numberOfLines={1}>
        {label}
        {actor ? (
          <Text noTranslate>
            {ACTOR_SEPARATOR}
            <Text noTranslate style={styles.actorName}>
              {actor}
            </Text>
          </Text>
        ) : null}
      </Text>
    </View>
  );
}

/** Restzeit als Badge, nicht tippbar: Uhr und „Noch 6 Tage 23 Std.“ (Daria, 22.10.2026) */
export function DeadlineBadge({ deadline }: { deadline: string }) {
  return (
    <View style={[styles.status, styles.deadline, { backgroundColor: `${color.text.secondary}26` }]} accessible>
      <Icon name="clock" size={11} color={color.text.secondary} />
      <Text style={[text.caption, { color: color.text.primary }]} numberOfLines={1}>
        {formatRemainingShort(deadline)}
      </Text>
    </View>
  );
}

/**
 * Figma „BountyBadge“, Anzeige „15,-“.
 * Die Handschrift „BROWN NOW TWO“ ist noch nicht eingebunden (Lizenz für Apps offen), bis dahin Inter.
 */
export function BountyBadge({ amount, small }: { amount: number; small?: boolean }) {
  const iconPt = useIconPt();
  return (
    <View style={styles.bounty} accessible accessibilityLabel={t('Coins: {amount} Euro', { amount })}>
      <CoinsIcon height={isFashionable ? iconPt : small ? 22 : 26} />
      <Text style={[styles.bountyText, small ? styles.bountyTextSmall : null]}>{formatBountyShort(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    borderRadius: radius.full,
    paddingHorizontal: space[8],
    paddingVertical: space[6],
    alignSelf: 'center',
  },
  actorName: { fontFamily: font.semiBold },
  deadline: { flexDirection: 'row', alignItems: 'center', gap: space[6], alignSelf: 'flex-start' },
  bounty: { flexDirection: 'row', alignItems: 'center', gap: isFashionable ? space[4] : space[6] },
  // Fashionable Look: Betrag halbfett in Textfarbe wie die Zahlen großer Foto-Apps
  bountyText: isFashionable
    ? { fontFamily: font.semiBold, fontSize: 16, lineHeight: 20, color: color.text.primary, fontVariant: ['tabular-nums'] }
    : { fontFamily: font.display, fontSize: 18, lineHeight: 22, color: color.accent.signal },
  bountyTextSmall: isFashionable ? { fontSize: 14, lineHeight: 18 } : { fontSize: 16, lineHeight: 20 },
});
