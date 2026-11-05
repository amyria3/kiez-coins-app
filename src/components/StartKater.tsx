import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import sprueche from '../data/kater-sprueche.json';
import type { KaterSpruch } from '../data/kater';
import { color, space } from '../theme/tokens';
import { GearsLoader } from './GearsLoader';
import { KaterStage } from './KaterStage';

/** Ein Spruch zum Fegen aus src/data/kater-sprueche.json. Ohne passenden Spruch fegt er still. */
function fegeSpruch(): KaterSpruch {
  const liste = (sprueche.sprueche as (string | KaterSpruch)[]).map((e) => (typeof e === 'string' ? { text: e } : e));
  const fegen = liste.filter((e) => e.aktion === 'fegen');
  const e = fegen[Math.floor(Math.random() * fegen.length)];
  return { text: e?.text ?? '', aktion: 'fegen' };
}
const AUSBLENDEN_MS = 320;
/** Erst drehen sich die Zahnräder, dann taucht der Kater auf. */
const KATER_NACH_MS = 600;
const EINBLENDEN_MS = 280;

/**
 * Startbildschirm (Daria, 2026-10-24): Zuerst drehen sich die Zahnräder unten. Danach taucht der Kater in der Mitte auf,
 * fegt und sagt einen Spruch. Der Kater hält den Start nicht auf (Daria, 2026-11-05): Sobald alles geladen ist (`loaded`),
 * blendet der Bildschirm aus, auch mitten im Fegen. Ein Tipp überspringt ihn jederzeit.
 */
export function StartKater({ loaded, onDone }: { loaded: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Kater mit Kreis ist höher als breit (1300 × 1696): auf kleinen Handys schmaler, damit er die Zahnräder nicht berührt (2026-11-02)
  const katerBreite = Math.round(Math.min(240, height * 0.28));
  // Zahnräder groß wie beim Start vorher (200), auf kleinen Handys etwas kleiner, damit sie den Kater nicht berühren
  const raederSize = Math.round(Math.min(200, height * 0.22));
  const [spruch] = useState(fegeSpruch);
  const [kater, setKater] = useState(false);
  const sichtbar = useRef(new Animated.Value(1)).current;
  const katerSichtbar = useRef(new Animated.Value(0)).current;
  const fertig = useRef(false);

  // Die Zahnräder aus public/index.html übernehmen: Ab hier drehen die eigenen an derselben Stelle
  useEffect(() => {
    if (typeof document !== 'undefined') document.getElementById('boot')?.remove();
  }, []);

  // Kater nach den Zahnrädern einblenden
  useEffect(() => {
    const auftritt = setTimeout(() => {
      setKater(true);
      Animated.timing(katerSichtbar, {
        toValue: 1,
        duration: EINBLENDEN_MS,
        useNativeDriver: true,
      }).start();
    }, KATER_NACH_MS);
    return () => clearTimeout(auftritt);
  }, [katerSichtbar]);

  const weg = () => {
    if (fertig.current) return;
    fertig.current = true;
    Animated.timing(sichtbar, {
      toValue: 0,
      duration: AUSBLENDEN_MS,
      useNativeDriver: true,
    }).start(() => onDone());
  };

  // Geladen: sofort weiter zum Feed
  useEffect(() => {
    if (loaded) weg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: sichtbar }]}>
      <Pressable
        onPress={weg}
        // Kater mittig im Platz über den Zahnrädern, mit Luft dazwischen (Daria, 2026-11-05)
        style={[styles.flaeche, { paddingBottom: insets.bottom + space[32] + raederSize + space[24] }]}
        accessibilityRole="button"
        accessibilityLabel="Weiter"
      >
        {kater ? (
          <Animated.View style={{ opacity: katerSichtbar }}>
            <KaterStage width={katerBreite} spruch={spruch} take={1} ohneBlase={!spruch.text} />
          </Animated.View>
        ) : null}
      </Pressable>
      <Animated.View
        pointerEvents="none"
        style={[styles.raeder, { bottom: insets.bottom + space[32] }]}
      >
        <GearsLoader size={raederSize} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: color.bg.screen, zIndex: 10 },
  flaeche: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  raeder: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
