import { StyleSheet, View } from 'react-native';

import { parseUntil, TIME } from '../../data/reminders';
import { space } from '../../theme/tokens';
import { Chip, ChipGroup, TextField } from '../Form';
import { type Nudge } from '../Nudge';

/** `none`: ohne Uhrzeit (Daria, 2026-11-14) */
export type TimeKind = 'until' | 'at' | 'range' | 'none';

export const kindOfTimes = (atTime?: string, untilTime?: string): TimeKind =>
  atTime && untilTime ? 'range' : atTime ? 'at' : untilTime ? 'until' : 'none';

/** Ist die Zeit vollständig? Ohne Uhrzeit immer. `withDate`: „Bis“ nimmt auch einen Tag. */
export const timesReady = (kind: TimeKind, from: string, until: string, withDate = false) =>
  kind === 'none'
    ? true
    : kind === 'until'
      ? withDate
        ? !!parseUntil(until)
        : TIME.test(until.trim())
      : kind === 'at'
        ? TIME.test(from.trim())
        : TIME.test(from.trim()) && TIME.test(until.trim());

const hhmm = (v: string) => v.trim().padStart(5, '0');

/** Werte zum Speichern: „um“ und „von“ in atTime, „bis“ in untilTime */
export const timesOf = (kind: TimeKind, from: string, until: string) => ({
  atTime: kind === 'at' || kind === 'range' ? hhmm(from) : undefined,
  untilTime: kind === 'until' || kind === 'range' ? hhmm(until) : undefined,
});

/**
 * Uhrzeit einer Erinnerung: „ohne Uhrzeit“, „bis“, „um“ oder „von … bis“. Gilt für einmalige und für feste Tage
 * (Daria, 2026-11-16: „Auch bei Terminen mit festen Tagen wäre ‚bis 10:00‘ cool“).
 */
export function TimeChoice({
  kind,
  onKind,
  from,
  onFrom,
  until,
  onUntil,
  fromNudge,
  untilNudge,
  withDate = false,
}: {
  kind: TimeKind;
  onKind: (k: TimeKind) => void;
  from: string;
  onFrom: (v: string) => void;
  until: string;
  onUntil: (v: string) => void;
  fromNudge: Nudge;
  untilNudge: Nudge;
  /** Einmalig: „Bis“ nimmt auch einen Tag, „22.11.“ oder „22.11. 18:00“ (Daria, 2026-11-16) */
  withDate?: boolean;
}) {
  const fromOk = !from.trim() || TIME.test(from.trim());
  const dateAllowed = withDate && kind === 'until';
  const untilOk = !until.trim() || (dateAllowed ? !!parseUntil(until) : TIME.test(until.trim()));
  return (
    <>
      <ChipGroup>
        {/* Ohne Uhrzeit vorn, da Standard (Daria, 2026-11-14) */}
        <Chip label="ohne Uhrzeit" selected={kind === 'none'} onPress={() => onKind('none')} />
        <Chip label="bis" selected={kind === 'until'} onPress={() => onKind('until')} />
        <Chip label="um" selected={kind === 'at'} onPress={() => onKind('at')} />
        <Chip label="von … bis" selected={kind === 'range'} onPress={() => onKind('range')} />
      </ChipGroup>
      <View style={styles.times}>
        {kind === 'at' || kind === 'range' ? (
          <View style={styles.time}>
            <TextField
              label={kind === 'at' ? 'Um' : 'Von'}
              placeholder="Format 9:00"
              value={from}
              onChangeText={onFrom}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              nudge={fromNudge}
              error={fromOk ? undefined : 'Bitte so: 9:00'}
            />
          </View>
        ) : null}
        {kind === 'until' || kind === 'range' ? (
          <View style={styles.time}>
            <TextField
              label="Bis"
              placeholder={dateAllowed ? 'z. B. 18:00 oder 22.11.' : 'Format 18:00'}
              value={until}
              onChangeText={onUntil}
              keyboardType="numbers-and-punctuation"
              maxLength={dateAllowed ? 17 : 5}
              nudge={untilNudge}
              error={untilOk ? undefined : dateAllowed ? 'Bitte so: 18:00, 22.11. oder 22.11. 18:00' : 'Bitte so: 18:00'}
            />
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  times: { flexDirection: 'row', gap: space[12] },
  time: { flex: 1 },
});
