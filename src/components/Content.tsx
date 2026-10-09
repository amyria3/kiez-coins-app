import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { color, radius, space, text } from '../theme/tokens';
import { Cat } from './icons/Brand';
import { Icon, type IconName } from './icons/Icon';

/** Figma „Notice“: `info` für Erklärungen, `warning` für Dinge mit Folgen. */
export function Notice({ message, variant = 'info' }: { message: string; variant?: 'info' | 'warning' }) {
  return (
    <View style={styles.notice} accessibilityRole={variant === 'warning' ? 'alert' : undefined}>
      <Icon name="info" color={variant === 'warning' ? color.accent.signal : color.text.primary} />
      <Text style={styles.noticeText}>{message}</Text>
    </View>
  );
}

/** Figma „InfoRow“: Icon in einer 24er-Box und Wert. */
export function InfoRow({ icon, value }: { icon: IconName; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.iconBox}>
        <Icon name={icon} size={icon === 'map-pin' ? 22 : 24} />
      </View>
      <Text style={styles.infoText}>{value}</Text>
    </View>
  );
}

/** Figma „KaterBubble“ (Emotion=Happy): Kater mit Sprechblase. */
export function KaterBubble({ children }: { children: ReactNode }) {
  return (
    <View style={styles.kater}>
      <Cat />
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{children}</Text>
      </View>
    </View>
  );
}

/** Abschnitt mit kleiner Überschrift (z. B. „Bounty (optional)“, „Notiz“) */
export function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    gap: space[8],
    padding: space[12],
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
  },
  noticeText: { ...text.caption, color: color.text.primary, flex: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: space[8], minHeight: 24 },
  iconBox: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  infoText: { ...text.body, color: color.text.primary, flex: 1 },
  kater: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  bubble: {
    flex: 1,
    padding: space[12],
    backgroundColor: color.accent.primary,
    borderTopLeftRadius: 2,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  bubbleText: { ...text.body, color: color.bg.screen },
  group: { gap: space[8] },
  groupLabel: { ...text.caption, color: color.text.secondary },
});
