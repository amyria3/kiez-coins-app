import { memo, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Heart } from './Heart';
import { Text } from './T';

import type { KaterAction, KaterSaying } from '../data/kater';
import { t } from '../data/texts';
import { color, motion, radius, space, text } from '../theme/tokens';

// Ebenen aus Darias Figma-Kater, alle auf derselben Fläche 1300 × 1696 (Ausschnitt wie design/kater/KiezCoins Cat2.svg). Gebaut mit scripts/kater-ebenen.py (02.11.2026).
// `oben` (Schürze, Kopf) hat an den Gläsern eine Aussparung: Darunter läuft das Video der schimmernden Gläser.
const BOTTOM = require('../../assets/kater/unten.png');
const BROOM = require('../../assets/kater/besen.png');
const BOOTS = require('../../assets/kater/stiefel.png');
const TOP = require('../../assets/kater/oben.png');
const TOP_FULL = require('../../assets/kater/oben-ganz.png');
// Über die Brille schauen (design/kater/KiezCoins Cat2.svg): weißes und schwarzes Auge, Brille tiefer und gekippt, mit Bügeln
const PEEK = require('../../assets/kater/drueber.png');
/** So weit sitzt die gekippte Brille tiefer als die normale */
const GLASSES_LOWER = 66;
// Münder (Daria, 02.11.2026): sonst der Default-Mund, bei den Herzen und beim Blick über die Brille lächelt er
// (Daria, 2026-11-09). Mund und Nase immer schwarz, kein Braun (Daria, 2026-11-09). Je mit und ohne Aussparung der Gläser.
const MOUTH = require('../../assets/kater/mund.png');
const MOUTH_FULL = require('../../assets/kater/mund-ganz.png');
const SMILE = require('../../assets/kater/mund-laecheln.png');
const SMILE_FULL = require('../../assets/kater/mund-laecheln-ganz.png');
/** Ausschnitt der Mundbilder auf der Fläche */
const MOUTH_BOX = { x: 560, y: 236, w: 120, h: 140 };
const GLASSES = require('../../assets/kater/glaeser.png');
const VIDEO = require('../../assets/kater/glaeser.mp4');
const W = 1300;
const H = 1696;
/** Ausschnitt des Videos auf der Fläche. Es läuft vor und zurück, damit die Schleife ohne Sprung ist. */
const CLIP = { x: 430, y: 129, w: 374, h: 188 };
/** Pfote, die den Besen hält: Drehpunkt des Besens */
const PAW = { x: 985, y: 856 };
/** Mitte der Gläser, dort erscheinen die Herzen */
const GLASS_L = { x: 523, y: 234 };
const GLASS_R = { x: 707, y: 218 };
const HEART = 150;
/** Augen beim Blick über die Brille (drueber.png): Dort flackern beim Start der App Herzen auf (Daria, 2026-11-11) */
const EYE_L = { x: 534, y: 200 };
const EYE_R = { x: 700, y: 186 };
const HEART_EYE = 150;
/** Ohne Aktion schaut er ab und zu über die Brille (Daria, 2026-11-09): Pause zufällig zwischen diesen Werten in ms */
const PEEK_PAUSE = [5000, 10000] as const;
/** So lange schaut er über die Brille */
const PEEK_MS = 1300;
/** Pause zwischen Aktion und Blick über die Brille (`danachDrueber`) */
const PEEK_AFTER_PAUSE = 200;
/**
 * Herzaugen beim Start der App (Daria, 2026-11-11): Brille runter, die Augen sind eine Drittelsekunde zu sehen,
 * dann erscheinen Herzen, flackern kurz und blenden aus. Erst danach geht die Brille wieder hoch.
 */
const HEART_EYES_WAIT = 330;
const HEART_EYES_IN = 160;
/** Flackern: so oft kurz dunkler und wieder voll, je Schritt so viele ms */
const HEART_EYES_FLICKER = 3;
const HERZAUGEN_FLACKER_MS = 110;
const HEART_EYES_HOLD = 250;
const HERZAUGEN_AUS = 260;
const HEART_EYES_AFTER = 150;

type Props = {
  /** Breite der Figur in pt; die Höhe folgt dem Bild */
  width: number;
  /** Was der Kater gerade sagt und tut. Ein neuer `take` spielt die Aktion neu ab. */
  saying?: KaterSaying | null;
  take?: number;
  onPress?: () => void;
  /** Ohne Sprechblase, nur die Aktion (Start der App) */
  withoutBubble?: boolean;
  /** Jede Erhöhung lässt Herzen in der Brille aufgehen (Knopf im Willkommensbildschirm) */
  hearts?: number;
  /** Nach der Aktion einmal über die Brille schauen und lächeln, dabei flackern Herzaugen (Start der App, Daria, 2026-11-09 und 2026-11-11) */
  peekAfter?: boolean;
};

/**
 * Darias Kater mit Besen (Figma, 02.11.2026): atmet, die Gläser schimmern, und je Spruch eine Aktion:
 * fegen (Besen umdrehen, mit der Bürste hin und her), winken (Besen heben und schwenken),
 * brille (Sonnenbrille runter, drüber schauen), stampfen (Stiefel heben). Darüber die Sprechblase.
 * `herzen` lässt Herzen in den Gläsern pochen wie in alten Zeichentrickfilmen, dabei lächelt er.
 */
export const KaterStage = memo(function KaterStage({ width, saying, take = 0, onPress, withoutBubble, hearts = 0, peekAfter }: Props) {
  const s = width / W;
  const height = H * s;
  const [still, setStill] = useState(false);
  const [videoDa, setVideoDa] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => {});
  }, []);

  const player = useVideoPlayer(VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
  });
  useEffect(() => {
    if (still) player.pause();
    else player.play();
  }, [still, player]);

  const breathe = useRef(new Animated.Value(0)).current;
  const broomRotation = useRef(new Animated.Value(0)).current;
  const broomX = useRef(new Animated.Value(0)).current;
  const broomY = useRef(new Animated.Value(0)).current;
  const glassesY = useRef(new Animated.Value(0)).current;
  const bootsY = useRef(new Animated.Value(0)).current;
  const heart = useRef(new Animated.Value(0)).current;
  const heartVisible = useRef(new Animated.Value(0)).current;
  const heartEyes = useRef(new Animated.Value(0)).current;
  const bubbleOpacity = useRef(new Animated.Value(saying ? 1 : 0)).current;

  // Atmen
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, still]);

  // Läuft gerade eine Aktion oder gehen Herzen auf, wartet der Blick über die Brille
  const busy = useRef(false);

  // Aktion zum Spruch
  useEffect(() => {
    if (!saying) return;
    bubbleOpacity.setValue(0);
    Animated.spring(bubbleOpacity, { toValue: 1, useNativeDriver: true, ...motion.barrierSpring }).start();
    if (still) return;
    const step = (v: Animated.Value, toValue: number, duration: number) =>
      Animated.timing(v, { toValue, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    const back = Animated.parallel([step(broomRotation, 0, 380), step(broomX, 0, 380), step(broomY, 0, 380), step(glassesY, 0, 380), step(bootsY, 0, 300)]);
    const action: KaterAction = saying.aktion ?? 'fegen';
    let sequence: Animated.CompositeAnimation;
    if (action === 'fegen') {
      // Besen umdrehen, Bürste nach unten auf den Boden, dann hin und her
      const lower = 40;
      const swing = (rot: number, x: number) => Animated.parallel([step(broomRotation, rot, 260), step(broomX, x, 260)]);
      sequence = Animated.sequence([
        Animated.parallel([step(broomRotation, 172, 380), step(broomY, lower, 380)]),
        swing(164, -22),
        swing(178, 16),
        swing(164, -22),
        swing(178, 16),
        swing(172, 0),
        Animated.delay(150),
        back,
      ]);
    } else if (action === 'winken') {
      const swing = (rot: number) => step(broomRotation, rot, 220);
      sequence = Animated.sequence([step(broomY, -96, 260), swing(8), swing(-8), swing(8), swing(0), back]);
    } else if (action === 'brille') {
      sequence = Animated.sequence([step(glassesY, 54, 420), Animated.delay(1000), back]);
    } else {
      const up = Animated.sequence([step(bootsY, -42, 160), step(bootsY, 0, 160)]);
      sequence = Animated.sequence([up, Animated.delay(80), Animated.sequence([step(bootsY, -32, 160), step(bootsY, 0, 160)])]);
    }
    if (peekAfter && action !== 'brille') {
      const heartEye = (toValue: number, duration: number) =>
        Animated.timing(heartEyes, { toValue, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
      const flicker = Array.from({ length: HEART_EYES_FLICKER }, () => [
        heartEye(0.25, HERZAUGEN_FLACKER_MS),
        heartEye(1, HERZAUGEN_FLACKER_MS),
      ]).flat();
      sequence = Animated.sequence([
        sequence,
        Animated.delay(PEEK_AFTER_PAUSE),
        step(glassesY, 54, 420),
        Animated.delay(HEART_EYES_WAIT),
        heartEye(1, HEART_EYES_IN),
        ...flicker,
        Animated.delay(HEART_EYES_HOLD),
        heartEye(0, HERZAUGEN_AUS),
        Animated.delay(HEART_EYES_AFTER),
        step(glassesY, 0, 380),
      ]);
    }
    busy.current = true;
    sequence.start(() => {
      busy.current = false;
    });
    return () => {
      sequence.stop();
      heartEyes.setValue(0);
      busy.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [take, saying, still]);

  // Zwischendurch über die Brille schauen und dabei lächeln
  useEffect(() => {
    if (still) return;
    let timer: ReturnType<typeof setTimeout>;
    let glance: Animated.CompositeAnimation | null = null;
    const schedule = () => {
      const [min, max] = PEEK_PAUSE;
      timer = setTimeout(() => {
        if (busy.current) return schedule();
        const step = (toValue: number, duration: number) =>
          Animated.timing(glassesY, { toValue, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
        glance = Animated.sequence([step(54, 420), Animated.delay(PEEK_MS), step(0, 380)]);
        glance.start(() => schedule());
      }, min + Math.random() * (max - min));
    };
    schedule();
    return () => {
      clearTimeout(timer);
      glance?.stop();
    };
  }, [still, glassesY]);

  // Herzen: aufgehen, zweimal pochen, ausblenden
  useEffect(() => {
    if (!hearts) return;
    heart.setValue(0);
    heartVisible.setValue(1);
    const pulse = (until: number, ms: number) =>
      Animated.timing(heart, { toValue: until, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    const sequence = still
      ? Animated.sequence([pulse(1, 1), Animated.delay(900), Animated.timing(heartVisible, { toValue: 0, duration: 200, useNativeDriver: true })])
      : Animated.sequence([
          Animated.spring(heart, { toValue: 1, useNativeDriver: true, friction: 4, tension: 160 }),
          pulse(1.3, 140),
          pulse(1, 160),
          pulse(1.3, 140),
          pulse(1, 160),
          Animated.delay(450),
          Animated.timing(heartVisible, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]);
    busy.current = true;
    sequence.start(() => {
      busy.current = false;
    });
    return () => {
      sequence.stop();
      busy.current = false;
    };
  }, [hearts, heart, heartVisible, still]);

  const area = { width, height };
  const layer = { position: 'absolute' as const, left: 0, top: 0, width, height };
  // Schiebt der Kater die Brille runter, liegt der ganze Kopf über dem Video und die stillen Gläser rutschen
  const glassesDown = glassesY.interpolate({ inputRange: [0, 2], outputRange: [0, 1], extrapolate: 'clamp' });
  // Die normale Brille rutscht runter und geht in die gekippte über, darüber schauen die Augen
  const slide = { transform: [{ translateY: Animated.multiply(glassesY, (s * GLASSES_LOWER) / 54) }] };
  const normalHidden = glassesY.interpolate({ inputRange: [24, 54], outputRange: [1, 0], extrapolate: 'clamp' });
  const peekShown = glassesY.interpolate({ inputRange: [24, 54], outputRange: [0, 1], extrapolate: 'clamp' });
  const heartSize = HEART * s;
  const heartStyle = (m: { x: number; y: number }) => ({
    position: 'absolute' as const,
    left: m.x * s - heartSize / 2,
    top: m.y * s - heartSize / 2,
    width: heartSize,
    height: heartSize,
    opacity: heartVisible,
    transform: [{ scale: heart }],
  });
  const mouthStyle = {
    position: 'absolute' as const,
    left: MOUTH_BOX.x * s,
    top: MOUTH_BOX.y * s,
    width: MOUTH_BOX.w * s,
    height: MOUTH_BOX.h * s,
  };
  // Lächeln bei den Herzen und beim Blick über die Brille
  const smiling = Animated.add(heartVisible, peekShown).interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const ernst = smiling.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const mouths = (mouth: number, smile: number) => (
    <>
      <Animated.Image source={mouth} style={[mouthStyle, { opacity: ernst }]} resizeMode="stretch" />
      <Animated.Image source={smile} style={[mouthStyle, { opacity: smiling }]} resizeMode="stretch" />
    </>
  );
  return (
    <View style={styles.wrap}>
      {withoutBubble ? null : <KaterBubble text={saying?.text} visible={bubbleOpacity} />}
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : 'image'}
        accessibilityLabel={onPress ? t('Cat The Käptn antippen: noch ein Spruch') : t('Cat The Käptn mit Sonnenbrille, Schürze und Besen')}
      >
        <Animated.View
          style={[
            area,
            { transformOrigin: [width / 2, height, 0], transform: [{ scaleY: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] }) }] },
          ]}
        >
          <Image source={BOTTOM} style={layer} contentFit="contain" />
          <Animated.View
            style={[
              layer,
              {
                // Als Zahlen in pt: iOS liest Prozentwerte mit vielen Nachkommastellen falsch
                transformOrigin: [PAW.x * s, PAW.y * s, 0],
                transform: [
                  { translateX: Animated.multiply(broomX, s) },
                  { translateY: Animated.multiply(broomY, s) },
                  { rotate: broomRotation.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) },
                ],
              },
            ]}
          >
            <Image source={BROOM} style={area} contentFit="contain" />
          </Animated.View>
          <Animated.View style={[layer, { transform: [{ translateY: Animated.multiply(bootsY, s) }] }]}>
            <Image source={BOOTS} style={area} contentFit="contain" />
          </Animated.View>
          <Image source={GLASSES} style={layer} contentFit="contain" />
          {still ? null : (
            <VideoView
              player={player}
              style={[
                styles.video,
                { left: CLIP.x * s, top: CLIP.y * s, width: CLIP.w * s, height: CLIP.h * s, opacity: videoDa ? 1 : 0 },
              ]}
              contentFit="fill"
              nativeControls={false}
              playsInline
              surfaceType="textureView"
              useExoShutter={false}
              allowsPictureInPicture={false}
              onFirstFrameRender={() => setVideoDa(true)}
            />
          )}
          <Image source={TOP} style={layer} contentFit="contain" />
          {mouths(MOUTH, SMILE)}
          <Animated.View style={[layer, { opacity: glassesDown }]} pointerEvents="none">
            <Image source={TOP_FULL} style={area} contentFit="contain" />
            {mouths(MOUTH_FULL, SMILE_FULL)}
            <Animated.View style={[layer, slide, { opacity: normalHidden }]}>
              <Image source={GLASSES} style={area} contentFit="contain" />
            </Animated.View>
            <Animated.View style={[layer, { opacity: peekShown }]}>
              <Image source={PEEK} style={area} contentFit="contain" />
            </Animated.View>
          </Animated.View>
          <Animated.View style={[layer, slide]} pointerEvents="none">
            {[GLASS_L, GLASS_R].map((m) => (
              <Animated.View key={m.x} style={heartStyle(m)}>
                <Heart size={heartSize} rand={false} />
              </Animated.View>
            ))}
          </Animated.View>
          {/* Herzaugen über den Augen, nur solange die Brille unten ist (Start der App) */}
          <Animated.View style={[layer, { opacity: heartEyes }]} pointerEvents="none">
            {[EYE_L, EYE_R].map((m) => (
              <View key={m.x} style={{ position: 'absolute', left: m.x * s - (HEART_EYE * s) / 2, top: m.y * s - (HEART_EYE * s) / 2 }}>
                <Heart size={HEART_EYE * s} rand={false} />
              </View>
            ))}
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
});


/** Sprechblase des Katers; `sichtbar` läuft von 0 bis 1 und lässt sie aufploppen. */
export function KaterBubble({ text, visible }: { text?: string; visible: Animated.Value }) {
  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          opacity: visible,
          transform: [{ scale: visible.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }, { rotate: '-2deg' }],
        },
      ]}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.bubbleText}>{text ? t(text) : ' '}</Text>
      <View style={styles.tail} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space[12] },
  video: { position: 'absolute' },
  bubble: {
    maxWidth: 320,
    paddingVertical: space[12],
    paddingHorizontal: space[16],
    borderRadius: radius.xl,
    backgroundColor: color.text.primary,
  },
  bubbleText: { ...text.cardTitle, color: color.bg.screen, textAlign: 'center' },
  tail: {
    position: 'absolute',
    bottom: -7,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 16,
    backgroundColor: color.text.primary,
    transform: [{ rotate: '45deg' }],
    borderRadius: 3,
    zIndex: -1,
  },
});
