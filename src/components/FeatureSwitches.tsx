import { StyleSheet, View } from 'react-native';

import { MODES, setModeHidden, setStandardMode, useModes, type Mode } from '../data/features';
import { useStore } from '../data/store';
import { color, space, text } from '../theme/tokens';
import { FieldGroup } from './Content';
import { Segments } from './FeedHeader';
import { Toggle } from './Form';
import { Text } from './T';

/**
 * Modi Privat, Gruppe, Kiez (Onboarding und Dein Konto › Funktionen, Daria, 27.10.2026): Der Schalter (vorher ein Auge,
 * Daria, 08.11.2026) blendet einen Modus aus; der letzte sichtbare bleibt an. Darunter der Standard, der im Umschalter oben vorausgewählt ist,
 * als derselbe waagerechte Umschalter wie im Feed (vorher Radio-Liste, Daria, 08.11.2026).
 */

// Kurze Namen wie im Umschalter oben im Feed, damit alle vier nebeneinander passen
const SHORT: Record<Mode, string> = { private: 'Privat', groups: 'Gruppe', kiez: 'Kiez', everywhere: 'Überall' };
export function FeatureSwitches() {
  const { currentUserId } = useStore();
  const modes = useModes();
  const lastVisible = modes.visible.length === 1;

  const toggle = (mode: Mode) => {
    if (currentUserId) setModeHidden(currentUserId, mode, modes.isVisible(mode));
  };
  const choose = (mode: Mode) => {
    if (currentUserId) setStandardMode(currentUserId, mode);
  };

  return (
    <View style={styles.wrap}>
      <FieldGroup label="Modi">
        {MODES.map((m) => {
          const visible = modes.isVisible(m.key);
          const locked = visible && lastVisible;
          return (
            <View key={m.key} style={styles.row}>
              <View style={[styles.texts, !visible && styles.dim]}>
                <Text style={[text.body, { color: color.text.primary }]}>{m.label}</Text>
                <Text style={[text.caption, { color: color.text.secondary }]}>{m.description}</Text>
              </View>
              <View style={locked && styles.locked} pointerEvents={locked ? 'none' : 'auto'}>
                <Toggle label={m.label} value={visible} onValueChange={() => toggle(m.key)} />
              </View>
            </View>
          );
        })}
      </FieldGroup>
      {modes.visible.length > 1 ? (
        <FieldGroup label="Standard">
          <Text style={[text.caption, { color: color.text.secondary }]}>Dieser Modus ist oben im Umschalter vorausgewählt.</Text>
          <Segments
            tabs={MODES.filter((m) => modes.isVisible(m.key)).map((m) => ({ key: m.key, label: SHORT[m.key] }))}
            selectedKey={modes.standard}
            onChange={choose}
          />
        </FieldGroup>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[24] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[4] },
  texts: { flex: 1, gap: space[2] },
  dim: { opacity: 0.5 },
  // Letzter sichtbarer Modus: bleibt an
  locked: { opacity: 0.5 },
});
