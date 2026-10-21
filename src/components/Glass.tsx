import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';

import { color, radius, size } from '../theme/tokens';
import { IconButton } from './IconButton';
import type { IconName } from './icons/Icon';

/**
 * Liquid Glass von iOS 26 (expo-glass-effect, in Expo Go enthalten). Einmal beim Start geprüft:
 * Manche iOS-26-Betas haben die API nicht und stürzen sonst ab.
 */
export const liquidGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

/** Versuch (Daria, 21.10.2026): Buttons und Schalter aus Glas. `false` stellt alles auf die flache Gestaltung zurück. */
export const GLASS_CONTROLS = false;
/** Buttons und Schalter aus Glas, sofern das Gerät Liquid Glass kann */
export const glassControls = GLASS_CONTROLS && liquidGlass;

type GlassProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** `clear`: fast durchsichtig, für Fotos. `regular`: stärker gestreut, für unruhigen Grund. */
  variant?: 'clear' | 'regular';
  /** Färbt das Glas, z. B. in color/accent/primary für einen Primary-Button */
  tint?: string;
  /** Glas reagiert auf Berührung (leuchtet, federt) */
  interactive?: boolean;
};

/**
 * Glasfläche. Auf iOS 26 echtes Systemglas mit Lichtbrechung am Rand, sonst die bisherige
 * halbtransparente Fläche (color/bg/glass).
 */
export function Glass({ children, style, variant = 'clear', tint, interactive }: GlassProps) {
  if (liquidGlass) {
    return (
      <GlassView
        glassEffectStyle={variant}
        colorScheme="dark"
        tintColor={tint}
        isInteractive={interactive}
        style={[styles.clip, style]}
      >
        {children}
      </GlassView>
    );
  }
  return <View style={[styles.clip, styles.fallback, style]}>{children}</View>;
}

type GlassIconButtonProps = {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  /** Durchmesser in pt, mindestens die Tippfläche */
  diameter?: number;
  iconSize?: number;
  variant?: 'clear' | 'regular';
  style?: StyleProp<ViewStyle>;
};

/** Runder Knopf aus Glas, z. B. Zurück und Teilen über dem Foto oder das Zahnrad im Blatt. */
export function GlassIconButton({
  icon,
  accessibilityLabel,
  onPress,
  diameter = 52,
  iconSize = size.icon,
  variant = 'clear',
  style,
}: GlassIconButtonProps) {
  const d = Math.max(diameter, size.touchTarget);
  return (
    <Glass variant={variant} style={[{ width: d, height: d, borderRadius: d / 2 }, style]}>
      <IconButton icon={icon} iconSize={iconSize} accessibilityLabel={accessibilityLabel} onPress={onPress} style={styles.fill} />
    </Glass>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', borderRadius: radius.full },
  fallback: { backgroundColor: color.bg.glass },
  fill: { flex: 1, alignSelf: 'stretch' },
});
