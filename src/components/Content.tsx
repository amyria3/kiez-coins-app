import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './T';

import { color, font, isFashionable, radius, space, text, playfulCard, isPlayful, playfulColor } from '../theme/tokens';
import { useTexts } from '../data/texts';
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
  // Seit dem Upgrade „Nachtschicht“ überall die Sprechblase nach Duolingo-Vorbild
  return <KaterCard>{children}</KaterCard>;
}

/**
 * Sprechblase nach Duolingo-Vorbild: Blase links mit Rahmen und Spitze nach rechts,
 * der Kater rechts daneben auf einer runden Kachel. Optional mit fetter Überschrift.
 */
export function KaterCard({ children, title, mood = 'default' }: { children: ReactNode; title?: string; mood?: CatMood }) {
  // Texte aus dem CMS (Tabelle app_texts). Nur reiner Text lässt sich ersetzen; Texte mit Namen
  // setzen die Screens selbst über t() mit Platzhaltern zusammen.
  const tx = useTexts();
  if (typeof children === 'string') children = tx(children);
  if (title) title = tx(title);
  return (
    <View style={styles.speech}>
      <View style={styles.speechBubble}>
        {title ? <Text style={styles.speechTitle}>{title}</Text> : null}
        <Text style={styles.speechText}>{children}</Text>
        <View style={styles.speechTail} />
      </View>
      <View
        style={[styles.speechCat, isFashionable && styles.speechCatMono]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {/* Fashionable Look: kleinere, rundere Kachel im Grau der Sprechblase, Kater in Textfarbe (Daria, 24.10.2026: hell neben schwarz klappt nicht) */}
        {/* Kiez-Look: Kater etwas höher in der Kachel (Daria, 24.10.2026) */}
        <View style={isFashionable ? undefined : styles.speechCatLift}>
          <Cat mood={mood} height={isFashionable ? 36 : 52} tint={isFashionable ? color.text.primary : undefined} />
        </View>
      </View>
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

/** Abschnitt mit kleiner Überschrift (z. B. „Coins (optional)“, „Notiz“) */
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
    ...playfulCard,
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
  speech: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  speechBubble: {
    flex: 1,
    gap: space[4],
    paddingVertical: space[12],
    paddingHorizontal: space[16],
    borderRadius: radius.xl,
    backgroundColor: color.bg.surface,
    ...playfulCard,
  },
  // Spitze rechts zur Katze: gedrehtes Quadrat in der Farbe der Blase
  speechTail: {
    position: 'absolute',
    right: -7,
    top: '50%',
    marginTop: -8,
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: color.bg.surface,
    // Pausenhof: Rand nur an den zwei Kanten, die nach außen zeigen
    ...(isPlayful ? { right: -9, backgroundColor: color.bg.screen, borderTopWidth: 2, borderRightWidth: 2, borderColor: playfulColor.border } : null),
    transform: [{ rotate: '45deg' }],
  },
  speechTitle: { ...text.cardTitle, fontSize: 17, lineHeight: 22, color: color.text.primary },
  speechText: { fontFamily: font.light, fontSize: 15, lineHeight: 21, color: color.text.primary },
  speechCat: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: color.line.hairline,
    backgroundColor: color.bg.surface,
    ...playfulCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speechCatLift: { transform: [{ translateY: -6 }] },
  // Mehr Luft um den Kater (Daria, 24.10.2026): Kachel 68 pt, Kater bleibt 36 pt
  speechCatMono: {
    width: 68,
    height: 68,
    borderRadius: 24,
    borderWidth: 0,
    backgroundColor: color.bg.surface,
    ...playfulCard,
  },
  group: { gap: space[8] },
  groupLabel: { ...text.caption, color: color.text.secondary },
});
