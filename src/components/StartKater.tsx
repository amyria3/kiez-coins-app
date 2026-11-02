import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import sprueche from '../data/kater-sprueche.json';
import type { KaterSpruch } from '../data/kater';
import { color, motion, space } from '../theme/tokens';
import { GearsLoader } from './GearsLoader';
import { KaterBrille } from './KaterBrille';
import { KaterBlase } from './KaterStage';

/** So lange steht der Kater mit Sprechblase da, damit man den Spruch lesen kann. */
const KATER_MS = 3200;

/** Ein Spruch zum Fegen aus src/data/kater-sprueche.json. Ohne passenden Spruch bleibt die Blase weg. */
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
/** Kater und Zahnräder stehen mindestens so lange zusammen auf dem Bild (Daria, 2026-10-24) */
const ZUSAMMEN_MS = 1000;

/**
 * Startbildschirm (Daria, 2026-10-24): Zuerst drehen sich die Zahnräder unten. Danach taucht der Kater in der Mitte auf
 * und sagt einen Spruch. Seit 2026-11-02 Darias Kater aus Figma vor gelbem Kreis mit schimmernder Brille (KaterBrille). Die Zahnräder verschwinden, sobald alles geladen ist (`loaded`) und Kater und
 * Zahnräder mindestens eine Sekunde zusammen zu sehen waren. Der Bildschirm blendet aus, wenn die Zahnräder weg sind
 * und der Kater seinen Spruch gesagt hat. Ein Tipp überspringt den Rest, sobald die Zahnräder weg sind. Mit „Bewegung reduzieren“ steht der Kater nur kurz da.
 */
export function StartKater({ loaded, onDone }: { loaded: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Kater mit Kreis ist höher als breit (1300 × 1885): auf kleinen Handys schmaler, damit er die Zahnräder nicht berührt
  const katerBreite = Math.round(Math.min(240, height * 0.28));
  // Zahnräder groß wie beim Start vorher (200), auf kleinen Handys etwas kleiner, damit sie den Kater nicht berühren
  const raederSize = Math.round(Math.min(200, height * 0.22));
  const [spruch] = useState(fegeSpruch);
  const [kater, setKater] = useState(false);
  const [zusammen, setZusammen] = useState(false);
  const [raederWeg, setRaederWeg] = useState(false);
  const [gesagt, setGesagt] = useState(false);
  const sichtbar = useRef(new Animated.Value(1)).current;
  const katerSichtbar = useRef(new Animated.Value(0)).current;
  const blase = useRef(new Animated.Value(0)).current;
  const raeder = useRef(new Animated.Value(1)).current;
  const fertig = useRef(false);

  // Die Zahnräder aus public/index.html übernehmen: Ab hier drehen die eigenen an derselben Stelle
  useEffect(() => {
    if (typeof document !== 'undefined') document.getElementById('boot')?.remove();
  }, []);

  // Kater nach den Zahnrädern einblenden, dann den Spruch zeigen
  useEffect(() => {
    let fertigGesagt: ReturnType<typeof setTimeout>;
    let gemeinsam: ReturnType<typeof setTimeout>;
    const auftritt = setTimeout(() => {
      setKater(true);
      gemeinsam = setTimeout(() => setZusammen(true), EINBLENDEN_MS + ZUSAMMEN_MS);
      Animated.timing(katerSichtbar, {
        toValue: 1,
        duration: EINBLENDEN_MS,
        useNativeDriver: true,
      }).start();
      Animated.spring(blase, { toValue: 1, useNativeDriver: true, ...motion.barrierSpring }).start();
      AccessibilityInfo.isReduceMotionEnabled()
        .catch(() => false)
        .then((still) => {
          fertigGesagt = setTimeout(() => setGesagt(true), still ? 800 : KATER_MS);
        });
    }, KATER_NACH_MS);
    return () => {
      clearTimeout(auftritt);
      clearTimeout(gemeinsam);
      clearTimeout(fertigGesagt);
    };
  }, [katerSichtbar, blase]);

  // Zahnräder ausblenden, sobald alles geladen ist und sie eine Sekunde mit dem Kater zu sehen waren
  useEffect(() => {
    if (loaded && zusammen)
      Animated.timing(raeder, {
        toValue: 0,
        duration: AUSBLENDEN_MS,
        useNativeDriver: true,
      }).start(() => setRaederWeg(true));
  }, [loaded, zusammen, raeder]);

  const weg = () => {
    if (fertig.current) return;
    fertig.current = true;
    Animated.timing(sichtbar, {
      toValue: 0,
      duration: AUSBLENDEN_MS,
      useNativeDriver: true,
    }).start(() => onDone());
  };

  useEffect(() => {
    if (raederWeg && gesagt) weg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raederWeg, gesagt]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: sichtbar }]}>
      <Pressable
        onPress={() => raederWeg && weg()}
        style={styles.flaeche}
        accessibilityRole="button"
        accessibilityLabel="Weiter"
      >
        {kater ? (
          <Animated.View style={[styles.kater, { opacity: katerSichtbar }]}>
            {spruch.text ? <KaterBlase text={spruch.text} sichtbar={blase} /> : null}
            <KaterBrille width={katerBreite} />
          </Animated.View>
        ) : null}
      </Pressable>
      <Animated.View
        pointerEvents="none"
        style={[styles.raeder, { bottom: insets.bottom + space[32], opacity: raeder }]}
      >
        <GearsLoader size={raederSize} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: color.bg.screen, zIndex: 10 },
  flaeche: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kater: { alignItems: 'center', gap: space[12] },
  raeder: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
