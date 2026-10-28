import { Pressable, StyleSheet, View } from 'react-native';

import type { Participation } from '../../data/remote';
import { t } from '../../data/texts';
import { color, radius, space, text } from '../../theme/tokens';
import { FieldGroup } from '../Content';
import { Chip, ChipGroup } from '../Form';
import { Icon } from '../icons/Icon';
import { Text } from '../T';

export const DEFAULT_PARTICIPATION: Participation = { max: 1, mode: 'open' };

/**
 * „Wie viele machen mit?“ und „Offen“ / „Auf Anfrage“ (Daria, 27.10.2026).
 * Die Erstellerin wählt die Höchstzahl; die App setzt keine feste Obergrenze, außer `limit` (Gruppengröße).
 * Ab 2 Personen gibt es nur Edensteine, keine Coins in Euro. `withCoinsHint` sagt das im Kiez dazu.
 */
export function ParticipantsField({
  value,
  onChange,
  min = 1,
  limit,
  withCoinsHint,
}: {
  value: Participation;
  onChange: (next: Participation) => void;
  /** Beim Bearbeiten: nie unter die Zahl der Teilnehmenden */
  min?: number;
  limit?: number;
  withCoinsHint?: boolean;
}) {
  const lower = Math.max(1, min);
  const upper = limit ?? Number.MAX_SAFE_INTEGER;
  const step = (delta: number) => onChange({ ...value, max: Math.min(upper, Math.max(lower, value.max + delta)) });
  const many = value.max > 1;
  return (
    <FieldGroup label="Wie viele machen mit?">
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Eine Person weniger')}
          onPress={() => step(-1)}
          disabled={value.max <= lower}
          style={[styles.stepButton, value.max <= lower && styles.disabled]}
        >
          <Icon name="minus" size={STEP_ICON} color={color.text.primary} />
        </Pressable>
        <Text style={styles.valueText} accessibilityLiveRegion="polite">
          {value.max === 1 ? t('1 Person') : t('Bis zu {n} Personen', { n: value.max })}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Eine Person mehr')}
          onPress={() => step(1)}
          disabled={value.max >= upper}
          style={[styles.stepButton, value.max >= upper && styles.disabled]}
        >
          <Icon name="plus" size={STEP_ICON} color={color.text.primary} />
        </Pressable>
      </View>
      <ChipGroup>
        <Chip label="Offen" selected={value.mode === 'open'} onPress={() => onChange({ ...value, mode: 'open' })} />
        <Chip label="Auf Anfrage" selected={value.mode === 'approval'} onPress={() => onChange({ ...value, mode: 'approval' })} />
      </ChipGroup>
      <Text style={styles.secondary}>
        {value.mode === 'open'
          ? many
            ? 'Wer die Challenge sieht, macht direkt mit, bis alle Plätze vergeben sind.'
            : 'Wer die Challenge sieht, nimmt sie direkt an.'
          : 'Jede Person fragt an. Du nimmst an oder lehnst ab und kannst Teilnehmende ausschließen.'}
      </Text>
      {many ? (
        <Text style={styles.secondary}>
          {withCoinsHint
            ? 'Die erste Person meldet erledigt, für alle. Jede Person bekommt alle Edensteine. Coins in Euro gibt es nur für eine Person.'
            : 'Die erste Person meldet erledigt, für alle. Jede Person bekommt alle Edensteine.'}
        </Text>
      ) : null}
    </FieldGroup>
  );
}

/** Plus und Minus kleiner als die Hauptsymbole (Daria, 24.10.2026), wie beim Edenstein-Zähler */
const STEP_ICON = 14;

const styles = StyleSheet.create({
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
  valueText: { ...text.body, flex: 1, textAlign: 'center', color: color.text.primary },
  secondary: { ...text.caption, color: color.text.secondary },
});
