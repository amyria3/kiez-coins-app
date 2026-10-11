import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { color, size } from '../theme/tokens';
import { Icon, type IconName } from './icons/Icon';

type IconButtonProps = {
  icon: IconName;
  /** Pflicht, z. B. „Gefällt mir“, „Zurück“ */
  accessibilityLabel: string;
  onPress?: () => void;
  /** Zustand „aktiv“ (z. B. geliked): Icon in color/accent/affection */
  active?: boolean;
  iconColor?: string;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({ icon, accessibilityLabel, onPress, active, iconColor, iconSize, style }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={active === undefined ? undefined : { selected: active }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, style]}
    >
      <Icon name={icon} size={iconSize} color={iconColor ?? (active ? color.accent.affection : color.text.primary)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: size.touchTarget,
    minHeight: size.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
