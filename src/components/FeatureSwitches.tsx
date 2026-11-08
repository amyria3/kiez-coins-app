import { StyleSheet, View } from 'react-native';

import { MODES, setModeHidden, setStandardMode, useModes, type Mode } from '../data/features';
import { useStore } from '../data/store';
import { color, space, text } from '../theme/tokens';
import { FieldGroup } from './Content';
import { RadioOption, Toggle } from './Form';
import { Text } from './T';

/**
 * Modi Privat, Gruppe, Kiez (Onboarding und Dein Konto › Funktionen, Daria, 27.10.2026): Der Schalter (vorher ein Auge,
 * Daria, 08.11.2026) blendet einen Modus aus; der letzte sichtbare bleibt an. Darunter der Standard, der im Umschalter oben vorausgewählt ist.
 */
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
      <FieldGroup label="Standard">
        <Text style={[text.caption, { color: color.text.secondary }]}>Dieser Modus ist oben im Umschalter vorausgewählt.</Text>
        {MODES.filter((m) => modes.isVisible(m.key)).map((m) => (
          <RadioOption key={m.key} label={m.label} selected={modes.standard === m.key} onPress={() => choose(m.key)} />
        ))}
      </FieldGroup>
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
