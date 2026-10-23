import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet } from 'react-native';

import sprueche from '../data/kater-sprueche.json';
import type { KaterSpruch } from '../data/kater';
import { color } from '../theme/tokens';
import { KaterStage } from './KaterStage';

/** Fegen dauert in KaterStage rund 2 Sekunden. Die Sprechblase bleibt etwas länger, damit man sie lesen kann. */
const FEGEN_MS = 3200;

/** Ein Spruch zum Fegen aus src/data/kater-sprueche.json. Ohne passenden Spruch fegt er still. */
function fegeSpruch(): KaterSpruch {
  const liste = (sprueche.sprueche as (string | KaterSpruch)[]).map((e) => (typeof e === 'string' ? { text: e } : e));
  const fegen = liste.filter((e) => e.aktion === 'fegen');
  const e = fegen[Math.floor(Math.random() * fegen.length)];
  return { text: e?.text ?? '', aktion: 'fegen' };
}
const AUSBLENDEN_MS = 320;

/**
 * Start der App (Daria, 2026-10-23): Nach den Zahnrädern fegt der Kater einmal mit dem Besen und sagt einen Spruch, dann blendet er aus
 * und gibt den Screen darunter frei. Ein Tipp überspringt ihn. Mit „Bewegung reduzieren“ steht er nur kurz da.
 */
export function StartKater({ onDone }: { onDone: () => void }) {
  const [spruch] = useState(fegeSpruch);
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
        <KaterStage width={220} spruch={spruch} take={1} ohneBlase={!spruch.text} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: color.bg.screen, zIndex: 10 },
  flaeche: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
