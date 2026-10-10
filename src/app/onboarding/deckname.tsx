import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { Chip, ChipGroup, TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useStore } from '../../data/store';
import { color, text } from '../../theme/tokens';

// Kater-Vorschläge kommen später aus einer Wortliste
const suggestions = ['Käpt’n Kompost', 'Rostige Rosi'];

/** Route `onboarding/deckname`. Figma: `onboarding/deckname`. Deckname ist öffentlich und einmalig. */
export default function Deckname() {
  const router = useRouter();
  const { profile, dispatch } = useStore();
  const [handle, setHandle] = useState(profile.handle || suggestions[0]);

  const next = () => {
    dispatch({ type: 'updateProfile', patch: { handle: handle.trim() } });
    router.push('/onboarding/ansprache');
  };

  return (
    <SubScreen
      title="Deckname"
      subtitle="Schritt 2 von 6"
      navigation="back"
      onLeadingPress={() => router.back()}
      actions={<Button label="Weiter" onPress={next} disabled={!handle.trim()} />}
    >
      <KaterBubble>Dein Rufname</KaterBubble>
      <TextField
        label="Deckname"
        helperText="Öffentlich sichtbar. Jeden Decknamen gibt es nur einmal."
        value={handle}
        onChangeText={setHandle}
        maxLength={30}
        autoCorrect={false}
      />
      <Text style={styles.label}>Vorschläge vom Kater</Text>
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
