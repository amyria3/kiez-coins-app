import { useRef, type RefObject } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './T';

import { color, font, isFashionable, isPlayful, playfulColor, radius, space, stroke, text } from '../theme/tokens';
import { useTexts } from '../data/texts';
import { Glass, glassControls } from './Glass';
import { GearsLoader, SMALL_GEARS } from './GearsLoader';
import { Icon } from './icons/Icon';
import { useSubmitTarget } from './Nudge';
import type { IconName } from './icons/svgs';

// Figma „Button“ (Primary, Secondary). Die übrigen Varianten sind Überschreibungen in Screens:
// `signal` („Aufgabe zurückschicken“, „Muss ich noch machen“), `signalOutline` („Rückgängig machen“),
// `danger` („Missbrauch melden“).
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'signal' | 'signalOutline' | 'danger';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /**
   * Tippen auf den deaktivierten Button: zeigt, was fehlt (zum Feld scrollen und Hinweis, siehe Nudge.tsx)
   * oder erklärt per Meldung, warum es gerade nicht geht. Ohne diese Funktion passiert nichts.
   */
  whyDisabled?: () => void;
  /** Läuft gerade: kleine Zahnräder vor der Beschriftung, Tippen ohne Wirkung */
  busy?: boolean;
  /** Icon vor der Beschriftung, in der Farbe der Beschriftung */
  icon?: IconName;
  /** Icon waagerecht spiegeln (Hand nach links für „Zurück zum Feed“) */
  iconFlip?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label: original, onPress: press, variant = 'primary', disabled: off, whyDisabled, busy, icon, iconFlip, style }: ButtonProps) {
  // Mit Erklärung bleibt der Button tippbar, sieht aber deaktiviert aus
  const explains = !!off && !!whyDisabled;
  const disabled = (off && !explains) || !!busy;
  const onPress = explains ? whyDisabled : press;
  const v = variants[variant];
  // Beschriftung aus dem CMS (Tabelle app_texts), sonst wie im Code
  const label = useTexts()(original);
  // Ziel nach dem letzten Formularfeld (Nudge.tsx). Ghost-Buttons sind Nebenwege und zählen nicht.
  const ref = useRef<View>(null);
  useSubmitTarget(ref, variant !== 'ghost');
  // Versuch: Buttons aus Liquid Glass (iOS 26). Gefüllte Varianten bekommen ihre Farbe als Tönung.
  if (isPlayful) return <PlayButton pressRef={ref} label={label} onPress={onPress} variant={variant} off={off} disabled={disabled} busy={busy} icon={icon} style={style} />;
  if (isFashionable) return <FashionButton pressRef={ref} label={label} onPress={onPress} variant={variant} off={off} disabled={disabled} busy={busy} style={style} />;
  if (glassControls && variant !== 'ghost') {
    const g = glassVariants[variant];
    return (
      <Glass
        variant="regular"
        tint={g.tint}
        interactive={!disabled}
        style={[styles.glass, off && styles.disabled, style]}
      >
        <Pressable
          ref={ref}
          accessibilityRole="button"
          accessibilityState={{ disabled: off }}
          disabled={disabled}
          onPress={onPress}
          style={styles.glassInner}
        >
          <Text style={[g.tint ? text.buttonDarkOnLight : text.buttonLightOnDark, { color: g.label }]}>{label}</Text>
        </Pressable>
      </Glass>
    );
  }
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, v.container, pressed && styles.pressed, off && !busy && styles.disabled, style]}
    >
      <View style={styles.row}>
        {busy ? <GearsLoader size={22} tint={v.label} only={SMALL_GEARS} /> : icon ? <Icon name={icon} size={22} color={v.label} flip={iconFlip} /> : null}
        <Text style={[v.filled ? text.buttonDarkOnLight : text.buttonLightOnDark, { color: v.label }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

/**
 * Knopf im Look „Fashionable“ (Daria, 24.10.2026), überall gleich: 44 hoch, Radius 8, halbfett 14, ohne Icon.
 * Primary blau mit weißer Schrift; Secondary und die übrigen grau gefüllt, Danger mit roter Schrift; Ghost nur Text in Blau.
 */
function FashionButton({
  pressRef,
  label,
  onPress,
  variant,
  off,
  disabled,
  busy,
  style,
}: {
  pressRef: RefObject<View | null>;
  label: string;
  onPress?: () => void;
  variant: ButtonVariant;
  off?: boolean;
  disabled: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = fashionVariants[variant];
  return (
    <Pressable
      ref={pressRef}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.fashion, { backgroundColor: v.bg }, pressed && styles.pressed, off && !busy && styles.disabled, style]}
    >
      <View style={styles.row}>
        {busy ? <GearsLoader size={18} tint={v.label} only={SMALL_GEARS} /> : null}
        <Text style={[styles.fashionLabel, { color: v.label }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

/**
 * Knopf im Look „Pausenhof“ (Entwurf 27.10.2026): runde Kiez-Form mit flacher 3D-Kante unten in einem dunkleren Ton.
 * Beim Drücken sinkt der Knopf um die Kante ein.
 */
function PlayButton({
  pressRef,
  label,
  onPress,
  variant,
  off,
  disabled,
  busy,
  icon,
  style,
}: {
  pressRef: RefObject<View | null>;
  label: string;
  onPress?: () => void;
  variant: ButtonVariant;
  off?: boolean;
  disabled: boolean;
  busy?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const v = playVariants[variant];
  return (
    <Pressable
      ref={pressRef}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.play,
        { backgroundColor: v.bg, borderColor: v.border, borderBottomColor: v.edge },
        variant === 'ghost' && styles.playGhost,
        pressed && variant !== 'ghost' && styles.playPressed,
        off && !busy && styles.disabled,
        style,
      ]}
    >
      <View style={styles.row}>
        {busy ? <GearsLoader size={20} tint={v.label} only={SMALL_GEARS} /> : icon ? <Icon name={icon} size={20} color={v.label} /> : null}
        <Text style={[styles.playLabel, { color: v.label }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const playVariants: Record<ButtonVariant, { bg: string; border: string; edge: string; label: string }> = {
  primary: { bg: color.accent.primary, border: color.accent.primary, edge: playfulColor.edgePrimary, label: '#FFFFFF' },
  secondary: { bg: color.bg.surface, border: playfulColor.border, edge: playfulColor.border, label: color.text.primary },
  ghost: { bg: 'transparent', border: 'transparent', edge: 'transparent', label: color.text.primary },
  signal: { bg: color.accent.signal, border: color.accent.signal, edge: playfulColor.edgeSignal, label: '#FFFFFF' },
  signalOutline: { bg: color.bg.surface, border: playfulColor.border, edge: playfulColor.border, label: color.accent.signal },
  danger: { bg: color.bg.surface, border: playfulColor.border, edge: playfulColor.border, label: color.accent.error },
};

const fashionVariants: Record<ButtonVariant, { bg: string; label: string }> = {
  primary: { bg: color.accent.primary, label: color.text.onAccent },
  secondary: { bg: color.bg.surface, label: color.text.primary },
  ghost: { bg: 'transparent', label: color.accent.primary },
  signal: { bg: color.accent.primary, label: color.text.onAccent },
  signalOutline: { bg: color.bg.surface, label: color.text.primary },
  danger: { bg: color.bg.surface, label: color.accent.error },
};

const variants: Record<ButtonVariant, { container: ViewStyle; label: string; filled?: boolean }> = {
  primary: { container: { backgroundColor: color.accent.primary }, label: color.text.onAccent, filled: true },
  secondary: {
    container: { borderWidth: stroke.thin, borderColor: color.text.secondary },
    label: color.text.primary,
  },
  // Upgrade „Nachtschicht“: Text ohne Rahmen, für die zweite Wahl unter einem Primary
  ghost: { container: {}, label: color.text.primary },
  signal: { container: { backgroundColor: color.accent.signal }, label: color.bg.screen, filled: true },
  signalOutline: {
    container: { borderWidth: stroke.thin, borderColor: color.accent.signal },
    label: color.accent.signal,
  },
  danger: { container: { borderWidth: stroke.thin, borderColor: color.accent.error }, label: color.accent.error },
};

/** Glas-Buttons: Tönung statt Fläche, kein Rahmen. Die Kante zeichnet das Glas selbst. */
const glassVariants: Record<Exclude<ButtonVariant, 'ghost'>, { tint?: string; label: string }> = {
  primary: { tint: color.accent.primary, label: color.text.onAccent },
  secondary: { label: color.text.primary },
  signal: { tint: color.accent.signal, label: color.bg.screen },
  signalOutline: { label: color.accent.signal },
  danger: { label: color.accent.error },
};

const styles = StyleSheet.create({
  glass: { minHeight: 52, borderRadius: radius.full },
  glassInner: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: space[24],
    paddingVertical: space[12],
    alignItems: 'center',
    justifyContent: 'center',
  },
  base: {
    minHeight: 52,
    paddingHorizontal: space[24],
    paddingVertical: space[12],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  fashion: { minHeight: 44, paddingHorizontal: space[16], borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  fashionLabel: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 18 },
  play: {
    minHeight: 52,
    paddingHorizontal: space[24],
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playGhost: { borderWidth: 0, borderBottomWidth: 0 },
  playPressed: { borderBottomWidth: 1.5, transform: [{ translateY: 2 }] },
  playLabel: { fontFamily: font.semiBold, fontSize: 16, lineHeight: 20 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
