import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { color, font, radius, space, text } from '../theme/tokens';
import { Cat, type CatMood } from './icons/Brand';
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

/** Figma „InfoRow“: Wert links, Icon rechts in einer 24er-Box. */
export function InfoRow({ icon, value }: { icon: IconName; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoText}>{value}</Text>
      <View style={styles.iconBox}>
        <Icon name={icon} size={icon === 'map-pin' ? 22 : 24} />
      </View>
    </View>
  );
}

/** Figma „SpeechBubble“: Sprechblase, Ecke oben links spitz. */
export function SpeechBubble({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.bubble, style]}>
      <Text style={styles.bubbleText}>{children}</Text>
    </View>
  );
}

/** Figma „KaterBubble“ (Emotion=Happy): Kater mit Sprechblase. */
export function KaterBubble({ children }: { children: ReactNode }) {
  return (
    <View style={styles.kater}>
      <Cat />
      <SpeechBubble style={styles.flex}>{children}</SpeechBubble>
    </View>
  );
}

/**
 * Upgrade „Nachtschicht“ (Probe): Der Kater sitzt oben links auf einer stark gerundeten Karte und
 * schaut über ihren Rand; der Text steht in der Karte. Erst in „Deine Reise“, später ggf. statt KaterBubble.
 */
export function KaterCard({ children, mood = 'default' }: { children: ReactNode; mood?: CatMood }) {
  return (
    <View style={styles.katerCard}>
      <View style={styles.katerCardCat} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Cat mood={mood} height={52} />
      </View>
      <Text style={styles.katerCardText}>{children}</Text>
    </View>
  );
}

/** Figma „OperationTag“: Operationsname oben links auf dem Foto, nur für die annehmende Person. */
export function OperationTag({ name }: { name: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText} numberOfLines={1}>
        {name}
      </Text>
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
  flex: { flex: 1 },
  bubble: {
    padding: space[12],
    backgroundColor: color.accent.primary,
    borderTopLeftRadius: 2,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  bubbleText: { ...text.body, color: color.bg.screen },
  tag: {
    position: 'absolute',
    top: space[12],
    left: space[12],
    maxWidth: '80%',
    paddingVertical: space[4],
    paddingHorizontal: space[12],
    borderRadius: radius.full,
    backgroundColor: color.accent.signal,
  },
  tagText: { fontFamily: font.semiBold, fontSize: 11, lineHeight: 16, color: color.bg.screen },
  katerCard: {
    marginTop: 30,
    paddingTop: 30,
    paddingBottom: space[16],
    paddingHorizontal: space[20],
    borderRadius: radius.card,
    backgroundColor: color.bg.surface,
  },
  // Der Kater ragt zur Hälfte über den oberen Rand
  katerCardCat: { position: 'absolute', top: -30, left: space[16] },
  katerCardText: { fontFamily: font.light, fontSize: 15, lineHeight: 21, color: color.text.primary },
  group: { gap: space[8] },
  groupLabel: { ...text.caption, color: color.text.secondary },
});
