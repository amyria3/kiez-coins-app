import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import sprueche from '../data/kater-sprueche.json';
import type { KaterSaying } from '../data/kater';
import { color, space, text } from '../theme/tokens';
import { Text } from './T';
import { t } from '../data/texts';
import { GearsLoader } from './GearsLoader';
import { PEEK_DURATION, SWEEP_DURATION, KaterStage } from './KaterStage';

/**
 * Erst fegen, dann einmal über die Brille schauen und lächeln (Daria, 2026-11-09). Danach noch kurz stehen bleiben,
 * damit man die Sprechblase lesen kann. Zusammen rund 4,8 Sekunden.
 */
const SWEEP_MS = SWEEP_DURATION + PEEK_DURATION + 300;

/** Ein Spruch zum Fegen aus src/data/kater-sprueche.json. Ohne passenden Spruch fegt er still. */
function sweepSaying(): KaterSaying {
  const list = (sprueche.sprueche as (string | KaterSaying)[]).map((e) => (typeof e === 'string' ? { text: e } : e));
  const sweep = list.filter((e) => e.aktion === 'fegen');
  const e = sweep[Math.floor(Math.random() * sweep.length)];
  return { text: e?.text ?? '', aktion: 'fegen' };
}
const FADE_OUT_MS = 320;
/** Erst drehen sich die Zahnräder, dann taucht der Kater auf. */
const KATER_AFTER_MS = 600;
const FADE_IN_MS = 280;
/** Kater und Zahnräder stehen mindestens so lange zusammen auf dem Bild (Daria, 2026-10-24) */
const TOGETHER_MS = 1000;

/**
 * Startbildschirm (Daria, 2026-10-24): Zuerst drehen sich die Zahnräder unten. Danach taucht der Kater in der Mitte auf,
 * fegt einmal und sagt einen Spruch. Die Zahnräder verschwinden, sobald alles geladen ist (`loaded`) und Kater und
 * Zahnräder mindestens eine Sekunde zusammen zu sehen waren. Der Bildschirm blendet aus, wenn die Zahnräder weg sind
 * und der Kater fertig gefegt hat. Ein Tipp überspringt den Kater jederzeit (Daria, 2026-11-05); lädt die App noch, drehen danach nur die Zahnräder weiter. Mit „Bewegung reduzieren“ steht der Kater nur kurz da.
 */
export function StartKater({ loaded, onDone }: { loaded: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Kater mit Kreis ist höher als breit (1300 × 1696): auf kleinen Handys schmaler, damit er die Zahnräder nicht berührt (2026-11-02)
  const katerWidth = Math.round(Math.min(240, height * 0.28));
  // Zahnräder groß wie beim Start vorher (200), auf kleinen Handys etwas kleiner, damit sie den Kater nicht berühren
  const gearsSize = Math.round(Math.min(200, height * 0.22));
  const [saying] = useState(sweepSaying);
  const [kater, setKater] = useState(false);
  const [together, setTogether] = useState(false);
  const [gearsGone, setGearsGone] = useState(false);
  const [swept, setSwept] = useState(false);
  const visible = useRef(new Animated.Value(1)).current;
  const katerVisible = useRef(new Animated.Value(0)).current;
  const gears = useRef(new Animated.Value(1)).current;
  const done = useRef(false);

  // Die Zahnräder aus public/index.html übernehmen: Ab hier drehen die eigenen an derselben Stelle
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.getElementById('boot')?.remove();
    document.getElementById('boot-moment')?.remove();
  }, []);

  // Kater nach den Zahnrädern einblenden, dann fegen lassen
  useEffect(() => {
    let sweep: ReturnType<typeof setTimeout>;
    let together: ReturnType<typeof setTimeout>;
    const entrance = setTimeout(() => {
      setKater(true);
      together = setTimeout(() => setTogether(true), FADE_IN_MS + TOGETHER_MS);
      Animated.timing(katerVisible, {
        toValue: 1,
        duration: FADE_IN_MS,
        useNativeDriver: true,
      }).start();
      AccessibilityInfo.isReduceMotionEnabled()
        .catch(() => false)
        .then((still) => {
          sweep = setTimeout(() => setSwept(true), still ? 800 : SWEEP_MS);
        });
    }, KATER_AFTER_MS);
    return () => {
      clearTimeout(entrance);
      clearTimeout(together);
      clearTimeout(sweep);
    };
  }, [katerVisible]);

  // Zahnräder ausblenden, sobald alles geladen ist und sie eine Sekunde mit dem Kater zu sehen waren
  useEffect(() => {
    if (loaded && together)
      Animated.timing(gears, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(() => setGearsGone(true));
  }, [loaded, together, gears]);

  const leave = () => {
    if (done.current) return;
    done.current = true;
    Animated.timing(visible, {
      toValue: 0,
      duration: FADE_OUT_MS,
      useNativeDriver: true,
    }).start(() => onDone());
  };

  useEffect(() => {
    if (gearsGone && swept) leave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gearsGone, swept]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, { opacity: visible }]}>
      <Pressable
        onPress={leave}
        // Kater mittig im Platz über den Zahnrädern, mit Luft dazwischen (Daria, 2026-11-05)
        style={[styles.area, { paddingBottom: insets.bottom + space[32] + gearsSize + space[24] }]}
        accessibilityRole="button"
        accessibilityLabel={t('Weiter')}
      >
        {kater ? (
          <Animated.View style={{ opacity: katerVisible }}>
            <KaterStage width={katerWidth} saying={saying} take={1} withoutBubble={!saying.text} peekAfter />
          </Animated.View>
        ) : (
          <Moment />
        )}
      </Pressable>
      <Animated.View
        pointerEvents="none"
        style={[styles.gears, { bottom: insets.bottom + space[32], opacity: gears }]}
      >
        <GearsLoader size={gearsSize} />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * „Moment“ mit wandernden Punkten, bis der Kater auftaucht (Daria, 07.11.2026): . .. ... und wieder von vorn.
 * Die fehlenden Punkte bleiben unsichtbar stehen, damit das Wort nicht hin und her rutscht.
 */
export function Moment() {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const timer = setInterval(() => setDots((d) => (d % 3) + 1), 400);
    return () => clearInterval(timer);
  }, []);
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={t('Moment')}>
      <Text style={styles.moment}>
        Moment
        <Text>{'.'.repeat(dots)}</Text>
        <Text style={styles.hidden}>{'.'.repeat(3 - dots)}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  moment: { ...text.title, color: color.text.primary },
  hidden: { color: 'transparent' },
  screen: { backgroundColor: color.bg.screen, zIndex: 10 },
  area: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gears: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
