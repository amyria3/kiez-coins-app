import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet } from 'react-native';

import { color } from '../theme/tokens';
import { KaterStage } from './KaterStage';

/** Fegen dauert in KaterStage rund 2 Sekunden. Danach blendet der Kater aus. */
const FEGEN_MS = 2100;
const AUSBLENDEN_MS = 320;

/**
 * Start der App (Daria, 2026-10-23): Nach den Zahnrädern fegt der Kater einmal mit dem Besen, dann blendet er aus
 * und gibt den Screen darunter frei. Ein Tipp überspringt ihn. Mit „Bewegung reduzieren“ steht er nur kurz da.
 */
export function StartKater({ onDone }: { onDone: () => void }) {
  const sichtbar = useRef(new Animated.Value(1)).current;
  const fertig = useRef(false);

  const weg = () => {
    if (fertig.current) return;
    fertig.current = true;
    Animated.timing(sichtbar, { toValue: 0, duration: AUSBLENDEN_MS, useNativeDriver: true }).start(() => onDone());
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((still) => {
        timer = setTimeout(weg, still ? 800 : FEGEN_MS);
      });
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: sichtbar }]}>
      <Pressable onPress={weg} style={styles.flaeche} accessibilityRole="button" accessibilityLabel="Weiter">
        <KaterStage width={220} spruch={{ text: '', aktion: 'fegen' }} take={1} ohneBlase />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: color.bg.screen, zIndex: 10 },
  flaeche: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
