import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from '../../components/T';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { Chip, ChipGroup, TextField } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useAuth } from '../../data/auth';
import { saveHandle, takenHandles } from '../../data/remote';
import { useStore } from '../../data/store';
import { color, text } from '../../theme/tokens';
import { useNudge } from '../../components/Nudge';
import { useGoBack } from '../../lib/goBack';

// Kater-Vorschläge aus zwei Wortlisten. Die App schlägt nur Namen vor, die noch frei sind (Daria, 28.10.2026).
const NAMES = [
  'Käpt’n Kompost', 'Rostige Rosi', 'Flinke Flora', 'Kesse Kastanie', 'Muntere Möwe', 'Stille Eule',
  'Bunte Hummel', 'Schlaue Schnecke', 'Tapfere Tulpe', 'Wilder Wilhelm', 'Fixer Felix', 'Kühne Kelle',
  'Fröhliche Frida', 'Leise Laterne', 'Brave Brezel', 'Muntere Mira', 'Flotte Lotte', 'Gute Gießkanne',
  'Heitere Hilde', 'Schneller Schorsch', 'Rote Rübe', 'Lustiger Lurch', 'Sanfte Socke', 'Mutige Maus',
];
const SHOWN = 3;

function candidates(count: number): string[] {
  return [...NAMES].sort(() => Math.random() - 0.5).slice(0, count);
}

/** Route `onboarding/deckname`. Figma: `onboarding/deckname`. Deckname ist öffentlich und einmalig. */
export default function Deckname() {
  const router = useRouter();
  const goBack = useGoBack();
  const { profile, mode, dispatch } = useStore();
  const userId = useAuth().session?.user.id;
  const [handle, setHandle] = useState(profile.handle || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Vorschläge erst zeigen, wenn klar ist, dass sie frei sind. Klappt die Prüfung nicht, gibt es keine Vorschläge.
  useEffect(() => {
    let active = true;
    const pool = candidates(12);
    (async () => {
      const taken = mode === 'live' ? await takenHandles(pool) : new Set<string>();
      if (!active || !taken) return;
      const free = pool.filter((c) => !taken.has(c.toLowerCase())).slice(0, SHOWN);
      setSuggestions(free);
      setHandle((h) => h || free[0] || '');
    })();
    return () => {
      active = false;
    };
  }, [mode]);
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
      subtitle="Schritt 2 von 6"
      navigation="back"
      onLeadingPress={() => (goBack())}
      actions={<Button busy={busy} label="Weiter" onPress={next} disabled={!handle.trim() || busy} whyDisabled={() => !busy && handleField.nudge('Wähle einen Decknamen.')} />}
    >
      <KaterBubble>Dein Rufname</KaterBubble>
      <TextField
        label="Deckname" required
        nudge={handleField}
        helperText="Öffentlich sichtbar."
        error={error}
        value={handle}
        onChangeText={(value) => {
          setHandle(value);
          setError(undefined);
        }}
        maxLength={30}
        autoCorrect={false}
      />
      {suggestions.length ? (
        <>
          <Text style={styles.label}>Vorschläge</Text>
          <ChipGroup>
            {suggestions.map((s) => (
              <Chip key={s} label={s} selected={handle === s} onPress={() => {
                setHandle(s);
                setError(undefined);
              }} />
            ))}
          </ChipGroup>
        </>
      ) : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  label: { ...text.caption, color: color.text.secondary },
});
