import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  CROSSPOST_PLATFORMS,
  loadCrosspostAccounts,
  loadCrosspostSelection,
  useCrosspostEnabled,
  type CrosspostAccount,
  type LivePlatform,
} from '../../data/crosspost';
import { color, radius, space, stroke, text } from '../../theme/tokens';
import { Toggle } from '../Form';
import { Text } from '../T';

/**
 * Weiterposten im Erstellen-Blatt öffentlicher Posts (Daria, 13.11.2026): Ist Weiterposten unter Dein Konto ›
 * Funktionen für eine Plattform an, steht sie hier mit Schalter, wie unter Funktionen. Ausschalten gilt nur für
 * diesen Post, die Einstellung bleibt. Ist Weiterposten nirgends an, steht hier nichts.
 * `off`: die Plattformen, die für diesen Post abgewählt sind.
 */
export function CrosspostRow({ off, onChange }: { off: LivePlatform[]; onChange: (off: LivePlatform[]) => void }) {
  const enabled = useCrosspostEnabled();
  const [accounts, setAccounts] = useState<CrosspostAccount[]>([]);
  const [selected, setSelected] = useState<LivePlatform[]>([]);

  useEffect(() => {
    if (!enabled) return;
    loadCrosspostAccounts().then(setAccounts);
    loadCrosspostSelection().then(setSelected);
  }, [enabled]);

  const active = CROSSPOST_PLATFORMS.filter(
    (p) => selected.includes(p.key as LivePlatform) && accounts.some((a) => a.platform === p.key),
  );
  if (!enabled || !active.length) return null;

  const toggle = (p: LivePlatform, on: boolean) => onChange(on ? off.filter((x) => x !== p) : [...off.filter((x) => x !== p), p]);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>Weiterposten</Text>
        <Text style={styles.caption}>Dein Post erscheint auch hier. Abwählen gilt nur für diesen Post.</Text>
      </View>
      {active.map((p) => {
        const key = p.key as LivePlatform;
        return (
          <View key={key} style={[styles.row, styles.divider]}>
            <View style={styles.texts}>
              <Text noTranslate style={styles.label}>{p.label}</Text>
              <Text noTranslate style={styles.caption}>
                {accounts.find((a) => a.platform === key)?.handle}
              </Text>
            </View>
            <Toggle label={p.label} value={!off.includes(key)} onValueChange={(on) => toggle(key, on)} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: space[16],
    paddingTop: space[12],
    borderRadius: radius.lg,
    borderWidth: stroke.thin,
    borderColor: color.line.raised,
    backgroundColor: color.bg.surface,
  },
  head: { gap: space[2], paddingBottom: space[8] },
  title: { ...text.body, color: color.text.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[8] },
  divider: { borderTopWidth: stroke.thin, borderTopColor: color.line.hairline },
  texts: { flex: 1, gap: space[2] },
  label: { ...text.body, color: color.text.primary },
  caption: { ...text.caption, color: color.text.secondary },
});
