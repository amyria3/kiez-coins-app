import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './T';

import { color, font, isFashionable, radius, space, text } from '../theme/tokens';
import { useTexts } from '../data/texts';
import { Cat, type CatMood } from './icons/Brand';
import { Icon, type IconName } from './icons/Icon';
import { iconSvgs } from './icons/svgs';
import { SvgXml } from 'react-native-svg';

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
 * Sprechblase: Text links, rechts auf der Blase der Kater im Kreis. Optional mit fetter Überschrift.
 */
/** Kiez-Look: Icon „cat“ im Kreis ohne Stimmungen; Fashionable: Kater nach `mood` in der Kachel daneben. */
export function KaterCard({ children, title, mood = 'default' }: { children: ReactNode; title?: string; mood?: CatMood }) {
  // Texte aus dem CMS (Tabelle app_texts). Nur reiner Text lässt sich ersetzen; Texte mit Namen
  // setzen die Screens selbst über t() mit Platzhaltern zusammen.
  const tx = useTexts();
  if (typeof children === 'string') children = tx(children);
  if (title) title = tx(title);
  if (isFashionable) {
    // Fashionable Look bleibt wie bisher: Blase mit Spitze, Kater in der Kachel daneben (Daria, 30.10.2026)
    return (
      <View style={styles.speech}>
        <View style={[styles.speechBubble, styles.speechBubbleFashionable]}>
          <View style={styles.speechTexts}>
            {title ? <Text style={styles.speechTitle}>{title}</Text> : null}
            <Text style={styles.speechText}>{children}</Text>
          </View>
          <View style={styles.speechTail} />
        </View>
        <View style={styles.speechCatFashionable} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Cat mood={mood} height={36} tint={color.text.primary} />
        </View>
      </View>
    );
  }
  return (
    // Kiez-Look: Kater im Kreis sitzt auf der Blase, rechts neben dem Text (Daria, 30.10.2026)
    <View style={styles.speechBubble}>
      <View style={styles.speechTexts}>
        {title ? <Text style={styles.speechTitle}>{title}</Text> : null}
        <Text style={styles.speechText}>{children}</Text>
      </View>
      <KaterRund />
    </View>
  );
}

/**
 * Kater im Kreis (Daria, 30.10.2026): das Icon „cat“ in Textfarbe, unten vom Kreis angeschnitten, ohne Kachel.
 * Gläser, Nase und Mund sind ausgespart, dort scheint der Kreis durch. Der Kreis sitzt auf der Sprechblase.
 */
const RUND = 64;
const RUND_KATER = 44;
export function KaterRund() {
  const cat = iconSvgs.cat;
  return (
    <View style={styles.rund} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.rundKater}>
        <SvgXml xml={cat.svg(color.text.primary)} width={(cat.width / cat.height) * RUND_KATER} height={RUND_KATER} />
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
  speechBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    paddingVertical: space[12],
    paddingLeft: space[16],
    paddingRight: space[12],
    borderRadius: radius.xl,
    backgroundColor: color.bg.surface,
  },
  speechTexts: { flex: 1, gap: space[4] },
  speech: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  speechBubbleFashionable: { flex: 1, paddingRight: space[16] },
  // Spitze rechts zur Katze: gedrehtes Quadrat in der Farbe der Blase (nur Fashionable)
  speechTail: {
    position: 'absolute',
    right: -7,
    top: '50%',
    marginTop: -8,
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: color.bg.surface,
    transform: [{ rotate: '45deg' }],
  },
  // Fashionable: Kachel 68 pt, Kater 36 pt (Daria, 24.10.2026)
  speechCatFashionable: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: color.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speechTitle: { ...text.cardTitle, fontSize: 17, lineHeight: 22, color: color.text.primary },
  speechText: { fontFamily: font.light, fontSize: 15, lineHeight: 21, color: color.text.primary },
  // Kreis im Grund der Seite, damit er sich von der Blase abhebt
  rund: { width: RUND, height: RUND, borderRadius: RUND / 2, overflow: 'hidden', backgroundColor: color.bg.screen },
  // Unten 8 pt angeschnitten, über den Ohren gut ein Drittel Luft
  rundKater: { position: 'absolute', left: 0, right: 0, bottom: -7, alignItems: 'center' },
  group: { gap: space[8] },
  groupLabel: { ...text.caption, color: color.text.secondary },
});
