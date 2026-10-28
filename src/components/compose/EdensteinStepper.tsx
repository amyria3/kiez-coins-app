import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '../../data/texts';
import { color, radius, space, text } from '../../theme/tokens';
import { LivingCrystal } from '../icons/Brand';
import { Icon } from '../icons/Icon';
import { Text } from '../T';

export const EDENSTEINE_MIN = 1;
export const EDENSTEINE_MAX = 10;

/**
 * Minus, ein lebendiger Edenstein mit Zahl, Plus. 1 bis 10 Edensteine.
 * Gruppenaufgabe und We-Challenge im Kiez (Daria, 27.10.2026: Edensteine sind die ideelle Währung).
 */
export function EdensteinStepper({ value, onChange, seed }: { value: number; onChange: (n: number) => void; seed: string }) {
  const step = (delta: number) => onChange(Math.min(EDENSTEINE_MAX, Math.max(EDENSTEINE_MIN, value + delta)));
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Ein Edenstein weniger')}
        onPress={() => step(-1)}
        disabled={value <= EDENSTEINE_MIN}
        style={[styles.stepButton, value <= EDENSTEINE_MIN && styles.disabled]}
      >
        <Icon name="minus" size={STEP_ICON} color={color.text.primary} />
      </Pressable>
      <View style={styles.value} accessible accessibilityLabel={t('{edensteine} Edensteine', { edensteine: value })}>
        {/* Ein einzelner, lebendiger Edenstein statt des Haufens (Daria, 22.10.2026) */}
        <View style={styles.crystal}>
          <View style={styles.crystalFloat}>
            <LivingCrystal height={48} seed={seed} />
          </View>
        </View>
        <Text style={styles.valueText}>{value}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Ein Edenstein mehr')}
        onPress={() => step(1)}
        disabled={value >= EDENSTEINE_MAX}
        style={[styles.stepButton, value >= EDENSTEINE_MAX && styles.disabled]}
      >
        <Icon name="plus" size={STEP_ICON} color={color.text.primary} />
      </Pressable>
    </View>
  );
}

/** Plus und Minus kleiner als die Hauptsymbole (Daria, 24.10.2026) */
const STEP_ICON = 14;

const styles = StyleSheet.create({
  crystal: { width: 30, height: 30, alignItems: 'center' },
  crystalFloat: { position: 'absolute', top: (30 - 48) / 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bg.surface,
  },
  disabled: { opacity: 0.4 },
  value: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[8] },
  // Zahl in Textfarbe, damit sie neben dem bunten Stein ruhig bleibt (Daria, 24.10.2026)
  valueText: { ...text.metric, color: color.text.primary },
});
