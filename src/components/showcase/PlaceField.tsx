import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { findPlace } from '../../data/location';
import { t } from '../../data/texts';
import { color, space, text } from '../../theme/tokens';
import { TextField } from '../Form';
import { Text } from '../T';

/**
 * „Wo habt Ihr Euch getroffen?“ mit „Aktuellen Ort einsetzen“ (Daria, 2026-11-23): Erst nach dem Tippen fragt das Gerät
 * nach dem Standort. Den Ort liefert findPlace (data/location.ts). Das Feld bleibt änderbar.
 */
export function PlaceField({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');
  const locate = async () => {
    setBusy(true);
    setHint(t('Ort wird ermittelt …'));
    try {
      const found = await findPlace();
      onChange((found.street ?? found.kiez).slice(0, 120));
      setHint('');
    } catch {
      setHint(t('Kein Ort gefunden. Bitte von Hand eintragen.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.place}>
      <TextField label="Wo habt Ihr Euch getroffen?" value={value} onChangeText={onChange} maxLength={120} helperText="Optional" placeholder="z. B. Flohmarkt am Kanal" autoFocus={autoFocus} />
      <Pressable accessibilityRole="button" onPress={locate} disabled={busy} hitSlop={8}>
        <Text style={[styles.link, busy && styles.dim]}>{t('Aktuellen Ort einsetzen')}</Text>
      </Pressable>
      {hint ? <Text style={styles.meta}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  place: { gap: space[8] },
  link: { ...text.caption, color: color.text.primary, textDecorationLine: 'underline' },
  meta: { ...text.caption, color: color.text.secondary },
  dim: { opacity: 0.5 },
});
