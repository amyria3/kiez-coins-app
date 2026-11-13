import { memo, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Herz } from './Herz';
import { Text } from './T';

import type { KaterAktion, KaterSpruch } from '../data/kater';
import { t } from '../data/texts';
import { color, motion, radius, space, text } from '../theme/tokens';

// Ebenen aus Darias Figma-Kater, alle auf derselben Fläche 1300 × 1696 (Ausschnitt wie Übergabe/KiezCoins Cat2.svg). Gebaut mit scripts/kater-ebenen.py (02.11.2026).
// `oben` (Schürze, Kopf) hat an den Gläsern eine Aussparung: Darunter läuft das Video der schimmernden Gläser.
const UNTEN = require('../../assets/kater/unten.png');
const BESEN = require('../../assets/kater/besen.png');
const STIEFEL = require('../../assets/kater/stiefel.png');
const OBEN = require('../../assets/kater/oben.png');
const OBEN_GANZ = require('../../assets/kater/oben-ganz.png');
// Über die Brille schauen (Übergabe/KiezCoins Cat2.svg): weißes und schwarzes Auge, Brille tiefer und gekippt, mit Bügeln
const DRUEBER = require('../../assets/kater/drueber.png');
/** So weit sitzt die gekippte Brille tiefer als die normale */
const BRILLE_TIEFER = 66;
// Münder (Daria, 02.11.2026): sonst der Default-Mund, bei den Herzen und beim Blick über die Brille lächelt er
// (Daria, 2026-11-09). Mund und Nase immer schwarz, kein Braun (Daria, 2026-11-09). Je mit und ohne Aussparung der Gläser.
const MUND = require('../../assets/kater/mund.png');
const MUND_GANZ = require('../../assets/kater/mund-ganz.png');
const LAECHELN = require('../../assets/kater/mund-laecheln.png');
const LAECHELN_GANZ = require('../../assets/kater/mund-laecheln-ganz.png');
/** Ausschnitt der Mundbilder auf der Fläche */
const MUND_BOX = { x: 560, y: 236, w: 120, h: 140 };
const GLAESER = require('../../assets/kater/glaeser.png');
const VIDEO = require('../../assets/kater/glaeser.mp4');
const W = 1300;
const H = 1696;
/** Ausschnitt des Videos auf der Fläche. Es läuft vor und zurück, damit die Schleife ohne Sprung ist. */
const CLIP = { x: 430, y: 129, w: 374, h: 188 };
/** Pfote, die den Besen hält: Drehpunkt des Besens */
const PFOTE = { x: 985, y: 856 };
/** Mitte der Gläser, dort erscheinen die Herzen */
const GLAS_L = { x: 523, y: 234 };
const GLAS_R = { x: 707, y: 218 };
const HERZ = 150;
/** Augen beim Blick über die Brille (drueber.png): Dort flackern beim Start der App Herzen auf (Daria, 2026-11-11) */
const AUGE_L = { x: 534, y: 200 };
const AUGE_R = { x: 700, y: 186 };
const HERZ_AUGE = 150;
/** Ohne Aktion schaut er ab und zu über die Brille (Daria, 2026-11-09): Pause zufällig zwischen diesen Werten in ms */
const DRUEBER_PAUSE = [5000, 10000] as const;
/** So lange schaut er über die Brille */
const DRUEBER_MS = 1300;
/** Pause zwischen Aktion und Blick über die Brille (`danachDrueber`) */
const DRUEBER_DANACH_PAUSE = 200;
/**
 * Herzaugen beim Start der App (Daria, 2026-11-11): Brille runter, die Augen sind eine Drittelsekunde zu sehen,
 * dann erscheinen Herzen, flackern kurz und blenden aus. Erst danach geht die Brille wieder hoch.
 */
const HERZAUGEN_WARTEN = 330;
const HERZAUGEN_EIN = 160;
/** Flackern: so oft kurz dunkler und wieder voll, je Schritt so viele ms */
const HERZAUGEN_FLACKERN = 3;
const HERZAUGEN_FLACKER_MS = 110;
const HERZAUGEN_HALTEN = 250;
const HERZAUGEN_AUS = 260;
const HERZAUGEN_DANACH = 150;
const HERZAUGEN_MS =
  HERZAUGEN_WARTEN + HERZAUGEN_EIN + HERZAUGEN_FLACKERN * 2 * HERZAUGEN_FLACKER_MS + HERZAUGEN_HALTEN + HERZAUGEN_AUS + HERZAUGEN_DANACH;
/** So lange dauert das Fegen; der Start der App wartet darauf (StartKater) */
export const FEGEN_DAUER = 380 + 5 * 260 + 150 + 380;
/** So lange dauert der Blick über die Brille nach einer Aktion */
export const DRUEBER_DAUER = DRUEBER_DANACH_PAUSE + 420 + HERZAUGEN_MS + 380;

type Props = {
  /** Breite der Figur in pt; die Höhe folgt dem Bild */
  width: number;
  /** Was der Kater gerade sagt und tut. Ein neuer `take` spielt die Aktion neu ab. */
  spruch?: KaterSpruch | null;
  take?: number;
  onPress?: () => void;
  /** Ohne Sprechblase, nur die Aktion (Start der App) */
  ohneBlase?: boolean;
  /** Jede Erhöhung lässt Herzen in der Brille aufgehen (Knopf im Willkommensbildschirm) */
  herzen?: number;
  /** Nach der Aktion einmal über die Brille schauen und lächeln, dabei flackern Herzaugen (Start der App, Daria, 2026-11-09 und 2026-11-11) */
  danachDrueber?: boolean;
};

/**
 * Darias Kater mit Besen (Figma, 02.11.2026): atmet, die Gläser schimmern, und je Spruch eine Aktion:
 * fegen (Besen umdrehen, mit der Bürste hin und her), winken (Besen heben und schwenken),
 * brille (Sonnenbrille runter, drüber schauen), stampfen (Stiefel heben). Darüber die Sprechblase.
 * `herzen` lässt Herzen in den Gläsern pochen wie in alten Zeichentrickfilmen, dabei lächelt er.
 */
export const KaterStage = memo(function KaterStage({ width, spruch, take = 0, onPress, ohneBlase, herzen = 0, danachDrueber }: Props) {
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

  const atem = useRef(new Animated.Value(0)).current;
  const besenRot = useRef(new Animated.Value(0)).current;
  const besenX = useRef(new Animated.Value(0)).current;
  const besenY = useRef(new Animated.Value(0)).current;
  const brilleY = useRef(new Animated.Value(0)).current;
  const stiefelY = useRef(new Animated.Value(0)).current;
  const herz = useRef(new Animated.Value(0)).current;
  const herzSichtbar = useRef(new Animated.Value(0)).current;
  const herzAugen = useRef(new Animated.Value(0)).current;
  const blase = useRef(new Animated.Value(spruch ? 1 : 0)).current;

  // Atmen
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(atem, { toValue: 1, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(atem, { toValue: 0, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [atem, still]);

  // Läuft gerade eine Aktion oder gehen Herzen auf, wartet der Blick über die Brille
  const beschaeftigt = useRef(false);

  // Aktion zum Spruch
  useEffect(() => {
    if (!spruch) return;
    blase.setValue(0);
    Animated.spring(blase, { toValue: 1, useNativeDriver: true, ...motion.barrierSpring }).start();
    if (still) return;
    const step = (v: Animated.Value, toValue: number, duration: number) =>
      Animated.timing(v, { toValue, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    const zurueck = Animated.parallel([step(besenRot, 0, 380), step(besenX, 0, 380), step(besenY, 0, 380), step(brilleY, 0, 380), step(stiefelY, 0, 300)]);
    const aktion: KaterAktion = spruch.aktion ?? 'fegen';
    let ablauf: Animated.CompositeAnimation;
    if (aktion === 'fegen') {
      // Besen umdrehen, Bürste nach unten auf den Boden, dann hin und her
      const unten = 40;
      const hin = (rot: number, x: number) => Animated.parallel([step(besenRot, rot, 260), step(besenX, x, 260)]);
      ablauf = Animated.sequence([
        Animated.parallel([step(besenRot, 172, 380), step(besenY, unten, 380)]),
        hin(164, -22),
        hin(178, 16),
        hin(164, -22),
        hin(178, 16),
        hin(172, 0),
        Animated.delay(150),
        zurueck,
      ]);
    } else if (aktion === 'winken') {
      const schwenk = (rot: number) => step(besenRot, rot, 220);
      ablauf = Animated.sequence([step(besenY, -96, 260), schwenk(8), schwenk(-8), schwenk(8), schwenk(0), zurueck]);
    } else if (aktion === 'brille') {
      ablauf = Animated.sequence([step(brilleY, 54, 420), Animated.delay(1000), zurueck]);
    } else {
      const hoch = Animated.sequence([step(stiefelY, -42, 160), step(stiefelY, 0, 160)]);
      ablauf = Animated.sequence([hoch, Animated.delay(80), Animated.sequence([step(stiefelY, -32, 160), step(stiefelY, 0, 160)])]);
    }
    if (danachDrueber && aktion !== 'brille') {
      const herzAuge = (toValue: number, duration: number) =>
        Animated.timing(herzAugen, { toValue, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
      const flackern = Array.from({ length: HERZAUGEN_FLACKERN }, () => [
        herzAuge(0.25, HERZAUGEN_FLACKER_MS),
        herzAuge(1, HERZAUGEN_FLACKER_MS),
      ]).flat();
      ablauf = Animated.sequence([
        ablauf,
        Animated.delay(DRUEBER_DANACH_PAUSE),
        step(brilleY, 54, 420),
        Animated.delay(HERZAUGEN_WARTEN),
        herzAuge(1, HERZAUGEN_EIN),
        ...flackern,
        Animated.delay(HERZAUGEN_HALTEN),
        herzAuge(0, HERZAUGEN_AUS),
        Animated.delay(HERZAUGEN_DANACH),
        step(brilleY, 0, 380),
      ]);
    }
    beschaeftigt.current = true;
    ablauf.start(() => {
      beschaeftigt.current = false;
    });
    return () => {
      ablauf.stop();
      herzAugen.setValue(0);
      beschaeftigt.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [take, spruch, still]);

  // Zwischendurch über die Brille schauen und dabei lächeln
  useEffect(() => {
    if (still) return;
    let timer: ReturnType<typeof setTimeout>;
    let blick: Animated.CompositeAnimation | null = null;
    const planen = () => {
      const [min, max] = DRUEBER_PAUSE;
      timer = setTimeout(() => {
        if (beschaeftigt.current) return planen();
        const step = (toValue: number, duration: number) =>
          Animated.timing(brilleY, { toValue, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
        blick = Animated.sequence([step(54, 420), Animated.delay(DRUEBER_MS), step(0, 380)]);
        blick.start(() => planen());
      }, min + Math.random() * (max - min));
    };
    planen();
    return () => {
      clearTimeout(timer);
      blick?.stop();
    };
  }, [still, brilleY]);

  // Herzen: aufgehen, zweimal pochen, ausblenden
  useEffect(() => {
    if (!herzen) return;
    herz.setValue(0);
    herzSichtbar.setValue(1);
    const puls = (bis: number, ms: number) =>
      Animated.timing(herz, { toValue: bis, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    const ablauf = still
      ? Animated.sequence([puls(1, 1), Animated.delay(900), Animated.timing(herzSichtbar, { toValue: 0, duration: 200, useNativeDriver: true })])
      : Animated.sequence([
          Animated.spring(herz, { toValue: 1, useNativeDriver: true, friction: 4, tension: 160 }),
          puls(1.3, 140),
          puls(1, 160),
          puls(1.3, 140),
          puls(1, 160),
          Animated.delay(450),
          Animated.timing(herzSichtbar, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]);
    beschaeftigt.current = true;
    ablauf.start(() => {
      beschaeftigt.current = false;
    });
    return () => {
      ablauf.stop();
      beschaeftigt.current = false;
    };
  }, [herzen, herz, herzSichtbar, still]);

  const flaeche = { width, height };
  const layer = { position: 'absolute' as const, left: 0, top: 0, width, height };
  // Schiebt der Kater die Brille runter, liegt der ganze Kopf über dem Video und die stillen Gläser rutschen
  const brilleRunter = brilleY.interpolate({ inputRange: [0, 2], outputRange: [0, 1], extrapolate: 'clamp' });
  // Die normale Brille rutscht runter und geht in die gekippte über, darüber schauen die Augen
  const rutschen = { transform: [{ translateY: Animated.multiply(brilleY, (s * BRILLE_TIEFER) / 54) }] };
  const normalWeg = brilleY.interpolate({ inputRange: [24, 54], outputRange: [1, 0], extrapolate: 'clamp' });
  const drueberDa = brilleY.interpolate({ inputRange: [24, 54], outputRange: [0, 1], extrapolate: 'clamp' });
  const herzGroesse = HERZ * s;
  const herzStil = (m: { x: number; y: number }) => ({
    position: 'absolute' as const,
    left: m.x * s - herzGroesse / 2,
    top: m.y * s - herzGroesse / 2,
    width: herzGroesse,
    height: herzGroesse,
    opacity: herzSichtbar,
    transform: [{ scale: herz }],
  });
  const mundStil = {
    position: 'absolute' as const,
    left: MUND_BOX.x * s,
    top: MUND_BOX.y * s,
    width: MUND_BOX.w * s,
    height: MUND_BOX.h * s,
  };
  // Lächeln bei den Herzen und beim Blick über die Brille
  const laechelt = Animated.add(herzSichtbar, drueberDa).interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const ernst = laechelt.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const muender = (mund: number, laecheln: number) => (
    <>
      <Animated.Image source={mund} style={[mundStil, { opacity: ernst }]} resizeMode="stretch" />
      <Animated.Image source={laecheln} style={[mundStil, { opacity: laechelt }]} resizeMode="stretch" />
    </>
  );
  return (
    <View style={styles.wrap}>
      {ohneBlase ? null : <KaterBlase text={spruch?.text} sichtbar={blase} />}
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : 'image'}
        accessibilityLabel={onPress ? t('Cat The Käptn antippen: noch ein Spruch') : t('Cat The Käptn mit Sonnenbrille, Schürze und Besen')}
      >
        <Animated.View
          style={[
            flaeche,
            { transformOrigin: [width / 2, height, 0], transform: [{ scaleY: atem.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] }) }] },
          ]}
        >
          <Image source={UNTEN} style={layer} contentFit="contain" />
          <Animated.View
            style={[
              layer,
              {
                // Als Zahlen in pt: iOS liest Prozentwerte mit vielen Nachkommastellen falsch
                transformOrigin: [PFOTE.x * s, PFOTE.y * s, 0],
                transform: [
                  { translateX: Animated.multiply(besenX, s) },
                  { translateY: Animated.multiply(besenY, s) },
                  { rotate: besenRot.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) },
                ],
              },
            ]}
          >
            <Image source={BESEN} style={flaeche} contentFit="contain" />
          </Animated.View>
          <Animated.View style={[layer, { transform: [{ translateY: Animated.multiply(stiefelY, s) }] }]}>
            <Image source={STIEFEL} style={flaeche} contentFit="contain" />
          </Animated.View>
          <Image source={GLAESER} style={layer} contentFit="contain" />
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
          <Image source={OBEN} style={layer} contentFit="contain" />
          {muender(MUND, LAECHELN)}
          <Animated.View style={[layer, { opacity: brilleRunter }]} pointerEvents="none">
            <Image source={OBEN_GANZ} style={flaeche} contentFit="contain" />
            {muender(MUND_GANZ, LAECHELN_GANZ)}
            <Animated.View style={[layer, rutschen, { opacity: normalWeg }]}>
              <Image source={GLAESER} style={flaeche} contentFit="contain" />
            </Animated.View>
            <Animated.View style={[layer, { opacity: drueberDa }]}>
              <Image source={DRUEBER} style={flaeche} contentFit="contain" />
            </Animated.View>
          </Animated.View>
          <Animated.View style={[layer, rutschen]} pointerEvents="none">
            {[GLAS_L, GLAS_R].map((m) => (
              <Animated.View key={m.x} style={herzStil(m)}>
                <Herz size={herzGroesse} />
              </Animated.View>
            ))}
          </Animated.View>
          {/* Herzaugen über den Augen, nur solange die Brille unten ist (Start der App) */}
          <Animated.View style={[layer, { opacity: herzAugen }]} pointerEvents="none">
            {[AUGE_L, AUGE_R].map((m) => (
              <View key={m.x} style={{ position: 'absolute', left: m.x * s - (HERZ_AUGE * s) / 2, top: m.y * s - (HERZ_AUGE * s) / 2 }}>
                <Herz size={HERZ_AUGE * s} rand={false} />
              </View>
            ))}
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
});


/** Sprechblase des Katers; `sichtbar` läuft von 0 bis 1 und lässt sie aufploppen. */
export function KaterBlase({ text, sichtbar }: { text?: string; sichtbar: Animated.Value }) {
  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          opacity: sichtbar,
          transform: [{ scale: sichtbar.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }, { rotate: '-2deg' }],
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
