import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import sprueche from '../data/kater-sprueche.json';
import type { KaterSpruch } from '../data/kater';
import { color, space } from '../theme/tokens';
import { GearsLoader } from './GearsLoader';
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
/** Erst drehen sich die Zahnräder, dann taucht der Kater auf. */
const KATER_NACH_MS = 600;
const EINBLENDEN_MS = 280;
/** Kater und Zahnräder stehen mindestens so lange zusammen auf dem Bild (Daria, 2026-10-24) */
const ZUSAMMEN_MS = 1000;

/**
 * Startbildschirm (Daria, 2026-10-24): Zuerst drehen sich die Zahnräder unten. Danach taucht der Kater in der Mitte auf,
 * fegt einmal und sagt einen Spruch. Die Zahnräder verschwinden, sobald alles geladen ist (`loaded`) und Kater und
 * Zahnräder mindestens eine Sekunde zusammen zu sehen waren. Der Bildschirm blendet aus, wenn die Zahnräder weg sind
 * und der Kater fertig gefegt hat. Ein Tipp überspringt das Fegen, sobald die Zahnräder weg sind. Mit „Bewegung reduzieren“ steht der Kater nur kurz da.
 */
export function StartKater({ loaded, onDone }: { loaded: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Zahnräder groß wie beim Start vorher (200), auf kleinen Handys etwas kleiner, damit sie den Kater nicht berühren
  const raederSize = Math.round(Math.min(200, height * 0.22));
  const [spruch] = useState(fegeSpruch);
  const [kater, setKater] = useState(false);
  const [zusammen, setZusammen] = useState(false);
  const [raederWeg, setRaederWeg] = useState(false);
  const [gefegt, setGefegt] = useState(false);
  const sichtbar = useRef(new Animated.Value(1)).current;
  const katerSichtbar = useRef(new Animated.Value(0)).current;
  const raeder = useRef(new Animated.Value(1)).current;
  const fertig = useRef(false);

  // Kater nach den Zahnrädern einblenden, dann fegen lassen
  useEffect(() => {
    let fegen: ReturnType<typeof setTimeout>;
    let gemeinsam: ReturnType<typeof setTimeout>;
    const auftritt = setTimeout(() => {
      setKater(true);
      gemeinsam = setTimeout(() => setZusammen(true), EINBLENDEN_MS + ZUSAMMEN_MS);
      Animated.timing(katerSichtbar, {
        toValue: 1,
        duration: EINBLENDEN_MS,
        useNativeDriver: true,
      }).start();
      AccessibilityInfo.isReduceMotionEnabled()
        .catch(() => false)
        .then((still) => {
          fegen = setTimeout(() => setGefegt(true), still ? 800 : FEGEN_MS);
        });
    }, KATER_NACH_MS);
    return () => {
      clearTimeout(auftritt);
      clearTimeout(gemeinsam);
      clearTimeout(fegen);
    };
  }, [katerSichtbar]);

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
    if (raederWeg && gefegt) weg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raederWeg, gefegt]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: sichtbar }]}>
      <Pressable
        onPress={() => raederWeg && weg()}
        style={styles.flaeche}
        accessibilityRole="button"
        accessibilityLabel="Weiter"
      >
        {kater ? (
          <Animated.View style={{ opacity: katerSichtbar }}>
            <KaterStage width={220} spruch={spruch} take={1} ohneBlase={!spruch.text} />
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
  raeder: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
