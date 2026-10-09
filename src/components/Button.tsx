import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { color, radius, space, stroke, text } from '../theme/tokens';

// Figma „Button“ (Primary, Secondary). `signal` und `danger` sind Überschreibungen
// aus dem Screen „challenge/review/reject“ („Aufgabe zurück schicken“, „Missbrauch melden“).
export type ButtonVariant = 'primary' | 'secondary' | 'signal' | 'danger';

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
      <Text style={[text.button, { color: v.label }]}>{label}</Text>
    </Pressable>
  );
}

const variants: Record<ButtonVariant, { container: ViewStyle; label: string }> = {
  primary: { container: { backgroundColor: color.accent.primary }, label: color.bg.screen },
  secondary: {
    container: { borderWidth: stroke.thin, borderColor: color.text.secondary },
    label: color.text.primary,
  },
  signal: { container: { backgroundColor: color.accent.signal }, label: color.bg.screen },
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
