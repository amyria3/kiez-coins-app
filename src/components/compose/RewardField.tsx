import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { bountyPresets, bountyRange, COINS_MAX_PER_PERSON, COINS_MIN_PER_PERSON, sharedBountyText } from '../../data/coins';
import { formatEuro } from '../../data/format';
import { t } from '../../data/texts';
import { color, text } from '../../theme/tokens';
import { FieldGroup, Notice } from '../Content';
import { Chip, ChipGroup, SwitchRow, TextField } from '../Form';
import type { Nudge } from '../Nudge';
import { Text } from '../T';
import { EdensteinStepper } from './EdensteinStepper';

/** Belohnung einer We-Challenge im Kiez: keine, Edensteine oder Coins (Euro), nie beides */
export type Reward = 'none' | 'eden' | 'euro';
export type RewardValue = { reward: Reward; edensteine?: number; bountyAmount?: number };

/** Vorgabe beim Wechsel zu Edensteinen, wie bei der Gruppenaufgabe */
export const EDEN_START = 3;

/** Belohnung aus gespeicherten Werten */
export const rewardOf = (edensteine?: number, bountyAmount?: number): Reward =>
  edensteine ? 'eden' : bountyAmount !== undefined ? 'euro' : 'none';

/** Fehler im eigenen Betrag, sonst undefined */
export function customAmountError(value: string, places: number): string | undefined {
  if (!value) return undefined;
  const n = Number(value.replace(',', '.'));
  const { min, max } = bountyRange(places);
  if (/[^\d.,\s]/.test(value) || !Number.isFinite(n)) return t('Dieser Betrag enthält unerlaubte Zeichen.');
  if (n > max) return t('Maximal {max} möglich.', { max: formatEuro(max) });
  if (n < min) return t('Mindestens {min} möglich.', { min: formatEuro(min) });
  return undefined;
}

/**
 * Belohnung einer We-Challenge im Kiez (Daria, 28.10.2026): „Keine“ oder „Mit Belohnung“. Mit Belohnung sind es
 * Edensteine; der Umschalter „Das ist mir bares Geld wert“ macht Coins daraus (Versprechen von echtem Geld).
 * Coins: pro Platz 5 bis 50 €, höchstens 10 Personen, der Betrag wird geteilt.
 * Gruppenaufgaben haben keine Coins und nutzen diesen Baustein nicht.
 */
export function RewardField({
  value,
  onChange,
  places,
  seed,
  customText,
  onCustomTextChange,
  amountNudge,
}: {
  value: RewardValue;
  onChange: (next: RewardValue) => void;
  /** Höchstzahl an Personen */
  places: number;
  seed: string;
  /** Eigener Betrag als Text; ohne bleibt es bei den Vorschlägen */
  customText?: string;
  onCustomTextChange?: (text: string | undefined) => void;
  amountNudge?: Nudge;
}) {
  const presets = bountyPresets(places);
  const { min, max } = bountyRange(places);
  const [customOpen, setCustomOpen] = useState(
    customText !== undefined || (value.bountyAmount !== undefined && !presets.includes(value.bountyAmount)),
  );
  const custom = !!onCustomTextChange && customOpen;
  const options =
    !onCustomTextChange && value.bountyAmount !== undefined && !presets.includes(value.bountyAmount)
      ? [...presets, value.bountyAmount].sort((a, b) => a - b)
      : presets;

  const choose = (reward: Reward) =>
    onChange({
      reward,
      edensteine: reward === 'eden' ? (value.edensteine ?? EDEN_START) : undefined,
      bountyAmount: reward === 'euro' ? (value.bountyAmount ?? presets[0]) : undefined,
    });

  const error = custom ? customAmountError(customText ?? '', places) : undefined;
  const shares = value.reward === 'euro' && !!value.bountyAmount && places > 1;

  return (
    <>
      <FieldGroup label="Belohnung (optional)">
        <ChipGroup>
          <Chip label="Keine" selected={value.reward === 'none'} onPress={() => choose('none')} />
          <Chip label="Mit Belohnung" selected={value.reward !== 'none'} onPress={() => value.reward === 'none' && choose('eden')} />
        </ChipGroup>
      </FieldGroup>
      {value.reward !== 'none' ? (
        <SwitchRow
          label="Das ist mir bares Geld wert"
          description={
            value.reward === 'euro'
              ? 'Coins: Du versprichst echtes Geld und zahlst es selbst direkt.'
              : 'Aus: Edensteine, eine ideelle Währung. Sie kosten nichts und haben so viel Wert, wie Ihr ihnen zusprecht.'
          }
          value={value.reward === 'euro'}
          onValueChange={(on) => choose(on ? 'euro' : 'eden')}
        />
      ) : null}
      {value.reward === 'eden' ? (
        <FieldGroup label="Edensteine">
          <EdensteinStepper
            value={value.edensteine ?? EDEN_START}
            onChange={(n) => onChange({ ...value, edensteine: n })}
            seed={seed}
          />
          <Text style={styles.secondary}>
            1 bis 10.
          </Text>
        </FieldGroup>
      ) : null}
      {value.reward === 'euro' ? (
        <FieldGroup label="Coins">
          <ChipGroup>
            {options.map((amount) => (
              <Chip
                key={amount}
                label={formatEuro(amount)}
                selected={!custom && value.bountyAmount === amount}
                onPress={() => {
                  setCustomOpen(false);
                  onCustomTextChange?.(undefined);
                  onChange({ ...value, bountyAmount: amount });
                }}
              />
            ))}
            {onCustomTextChange ? (
              <Chip
                label="Eigener Betrag"
                selected={custom}
                onPress={() => {
                  setCustomOpen(true);
                  onCustomTextChange(customText ?? '');
                }}
              />
            ) : null}
          </ChipGroup>
          {custom ? (
            <TextField
              label="Betrag in €"
              nudge={amountNudge}
              keyboardType="number-pad"
              value={customText ?? ''}
              onChangeText={(next) => {
                onCustomTextChange?.(next);
                const n = Number(next.replace(',', '.'));
                onChange({ ...value, bountyAmount: n >= min && n <= max ? Math.round(n) : undefined });
              }}
              error={error}
              autoFocus
            />
          ) : null}
          <Text style={styles.secondary}>
            {places > 1
              ? t('Pro Person {perMin} bis {perMax}, bei {n} Plätzen also {min} bis {max}. Der Betrag wird unter allen geteilt, die mitmachen.', {
                  perMin: formatEuro(COINS_MIN_PER_PERSON),
                  perMax: formatEuro(COINS_MAX_PER_PERSON),
                  n: places,
                  min: formatEuro(min),
                  max: formatEuro(max),
                })
              : t('{min} bis {max}. Du zahlst die Coins selbst direkt an die Person, die die Challenge erledigt.', {
                  min: formatEuro(min),
                  max: formatEuro(max),
                })}
          </Text>
          {shares ? <Text style={styles.secondary}>{sharedBountyText(value.bountyAmount, places)} {t('Machen weniger mit, bekommt jede mehr.')}</Text> : null}
        </FieldGroup>
      ) : null}
      {value.reward === 'euro' && value.bountyAmount ? (
        <Notice
          variant="warning"
          message="Versprich nur, was Du zahlen kannst. Wer zugesagte Coins nicht zahlt, kann gemeldet und für Coins gesperrt werden."
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  secondary: { ...text.caption, color: color.text.secondary },
});
