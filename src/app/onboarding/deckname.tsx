import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from '../../components/T';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { Chip, ChipGroup, TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useAuth } from '../../data/auth';
import { saveHandle } from '../../data/remote';
import { useStore } from '../../data/store';
import { color, text } from '../../theme/tokens';
import { useNudge } from '../../components/Nudge';
import { useGoBack } from '../../lib/goBack';

// Kater-Vorschläge kommen später aus einer Wortliste
const suggestions = ['Käpt’n Kompost', 'Rostige Rosi'];

/** Route `onboarding/deckname`. Figma: `onboarding/deckname`. Deckname ist öffentlich und einmalig. */
export default function Deckname() {
  const router = useRouter();
  const goBack = useGoBack();
  const { profile, mode, dispatch } = useStore();
  const userId = useAuth().session?.user.id;
  const [handle, setHandle] = useState(profile.handle || suggestions[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const handleField = useNudge();

  const next = async () => {
    // Deckname gleich speichern, damit „gibt es schon“ hier auffällt und nicht erst später.
    if (mode === 'live' && userId) {
      setBusy(true);
      const failure = await saveHandle(userId, handle);
      setBusy(false);
      if (failure) {
        setError(failure);
        return;
      }
    }
    dispatch({ type: 'updateProfile', patch: { handle: handle.trim() } });
    router.push('/onboarding/ansprache');
  };

  return (
    <SubScreen
      title="Deckname"
      subtitle="Schritt 2 von 7"
      navigation="back"
      onLeadingPress={() => (goBack())}
      actions={<Button busy={busy} label="Weiter" onPress={next} disabled={!handle.trim() || busy} whyDisabled={() => !busy && handleField.nudge('Wähl einen Decknamen.')} />}
    >
      <KaterBubble>Dein Rufname</KaterBubble>
      <TextField
        label="Deckname" required
        nudge={handleField}
        helperText="Öffentlich sichtbar. Jeden Decknamen gibt es nur einmal."
        error={error}
        value={handle}
        onChangeText={(value) => {
          setHandle(value);
          setError(undefined);
        }}
        maxLength={30}
        autoCorrect={false}
      />
      <Text style={styles.label}>Vorschläge von Cat The Käptn</Text>
      <ChipGroup>
        {suggestions.map((s) => (
          <Chip key={s} label={s} selected={handle === s} onPress={() => setHandle(s)} />
        ))}
      </ChipGroup>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  label: { ...text.caption, color: color.text.secondary },
});
