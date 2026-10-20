import { StyleSheet, Text, View } from 'react-native';

import { formatBountyShort } from '../data/format';
import type { ChallengeStatus } from '../data/types';
import { color, font, radius, space, stroke, text } from '../theme/tokens';
import { CoinsIcon } from './icons/Brand';

const statusStyles: Record<ChallengeStatus, { label: string; tint: string }> = {
  open: { label: 'Offen', tint: color.text.secondary },
  accepted: { label: 'Angenommen', tint: color.accent.primary },
  reported: { label: 'Erledigt gemeldet', tint: color.accent.signal },
  confirmed: { label: 'Bestätigt', tint: color.accent.affection },
  rejected: { label: 'Abgelehnt', tint: color.text.secondary },
  payment_open: { label: 'Zahlung offen', tint: color.accent.signal },
  paid_marked: { label: 'Als bezahlt markiert', tint: color.accent.primary },
  paid: { label: 'Bezahlt', tint: color.accent.affection },
};

/** Figma „StatusBadge“ */
export function StatusBadge({ status }: { status: ChallengeStatus }) {
  const { label, tint } = statusStyles[status];
  return (
    <View style={[styles.status, { borderColor: tint }]}>
      <Text style={[text.caption, { color: tint }]}>{label}</Text>
    </View>
  );
}

/**
 * Figma „BountyBadge“, Anzeige „15,-“.
 * Die Handschrift „BROWN NOW TWO“ ist noch nicht eingebunden (Lizenz für Apps offen), bis dahin Inter.
 */
export function BountyBadge({ amount }: { amount: number }) {
  return (
    <View style={styles.bounty} accessible accessibilityLabel={`Bounty ${amount} Euro`}>
      <CoinsIcon height={18} />
      <Text style={styles.bountyText}>{formatBountyShort(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    borderWidth: stroke.thin,
    borderRadius: radius.full,
    paddingHorizontal: space[8],
    paddingVertical: space[6],
    alignSelf: 'center',
  },
  bounty: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  bountyText: { fontFamily: font.display, fontSize: 18, lineHeight: 22, color: color.accent.signal },
});
