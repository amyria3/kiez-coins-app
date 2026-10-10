import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { color, radius, space, stroke, text } from '../theme/tokens';

// Figma „Button“ (Primary, Secondary). Die übrigen Varianten sind Überschreibungen in Screens:
// `signal` („Aufgabe zurück schicken“, „Muss ich noch machen“), `signalOutline` („Rückgängig machen“),
// `danger` („Missbrauch melden“).
export type ButtonVariant = 'primary' | 'secondary' | 'signal' | 'signalOutline' | 'danger';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const v = variants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, v.container, pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      <Text style={[v.filled ? text.buttonDarkOnLight : text.buttonLightOnDark, { color: v.label }]}>{label}</Text>
    </Pressable>
  );
}

const variants: Record<ButtonVariant, { container: ViewStyle; label: string; filled?: boolean }> = {
  primary: { container: { backgroundColor: color.accent.primary }, label: color.bg.screen, filled: true },
  secondary: {
    container: { borderWidth: stroke.thin, borderColor: color.text.secondary },
    label: color.text.primary,
  },
  signal: { container: { backgroundColor: color.accent.signal }, label: color.bg.screen, filled: true },
  signalOutline: {
    container: { borderWidth: stroke.thin, borderColor: color.accent.signal },
    label: color.accent.signal,
  },
  danger: { container: { borderWidth: stroke.thin, borderColor: color.accent.error }, label: color.accent.error },
};

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: space[24],
    paddingVertical: space[12],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
