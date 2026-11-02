import { memo, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import Svg, { Path } from 'react-native-svg';
import { Text } from './T';

import type { KaterAktion, KaterSpruch } from '../data/kater';
import { t } from '../data/texts';
import { color, font, motion, radius, space } from '../theme/tokens';

// Ebenen aus Darias Figma-Kater (Übergabe/KiezCoins Cat.svg, 02.11.2026), alle auf derselben Fläche 1300 × 1885.
// `oben` (Schürze, Kopf) hat an den Gläsern eine Aussparung: Darunter läuft das Video der schimmernden Gläser.
const UNTEN = require('../../assets/kater/unten.png');
const BESEN = require('../../assets/kater/besen.png');
const STIEFEL = require('../../assets/kater/stiefel.png');
const OBEN = require('../../assets/kater/oben.png');
const OBEN_GANZ = require('../../assets/kater/oben-ganz.png');
// Münder (Daria, 02.11.2026): sonst der Default-Mund, bei den Herzen lächelt er. Je mit und ohne Aussparung der Gläser.
const MUND = require('../../assets/kater/mund.png');
const MUND_GANZ = require('../../assets/kater/mund-ganz.png');
const LAECHELN = require('../../assets/kater/mund-laecheln.png');
const LAECHELN_GANZ = require('../../assets/kater/mund-laecheln-ganz.png');
/** Ausschnitt der Mundbilder auf der Fläche */
const MUND_BOX = { x: 560, y: 530, w: 120, h: 130 };
const GLAESER = require('../../assets/kater/glaeser.png');
const VIDEO = require('../../assets/kater/glaeser.mp4');
const W = 1300;
const H = 1885;
/** Ausschnitt des Videos auf der Fläche. Es läuft vor und zurück, damit die Schleife ohne Sprung ist. */
const CLIP = { x: 430, y: 423, w: 374, h: 188 };
/** Pfote, die den Besen hält: Drehpunkt des Besens */
const PFOTE = { x: 985, y: 1150 };
/** Mitte der Gläser, dort erscheinen die Herzen */
const GLAS_L = { x: 523, y: 528 };
const GLAS_R = { x: 707, y: 512 };
const HERZ = 150;
/** Herzen: kräftiges Rot mit weißem Rand, damit sie sich von den orangebraunen Gläsern und dem blauen Fell abheben */
const HERZ_FARBE = '#FF1E56';
const HERZ_RAND = '#FFFFFF';

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
};

/**
 * Darias Kater mit Besen (Figma, 02.11.2026): atmet, die Gläser schimmern, und je Spruch eine Aktion:
 * fegen (Besen umdrehen, mit der Bürste hin und her), winken (Besen heben und schwenken),
 * brille (Sonnenbrille runter, drüber schauen), stampfen (Stiefel heben). Darüber die Sprechblase.
 * `herzen` lässt Herzen in den Gläsern pochen wie in alten Zeichentrickfilmen, dabei lächelt er.
 */
export const KaterStage = memo(function KaterStage({ width, spruch, take = 0, onPress, ohneBlase, herzen = 0 }: Props) {
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
    ablauf.start();
    return () => ablauf.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [take, spruch, still]);

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
    ablauf.start();
    return () => ablauf.stop();
  }, [herzen, herz, herzSichtbar, still]);

  const flaeche = { width, height };
  const layer = { position: 'absolute' as const, left: 0, top: 0, width, height };
  // Schiebt der Kater die Brille runter, liegt der ganze Kopf über dem Video und die stillen Gläser rutschen
  const brilleRunter = brilleY.interpolate({ inputRange: [0, 2], outputRange: [0, 1], extrapolate: 'clamp' });
  const brilleVersatz = { transform: [{ translateY: Animated.multiply(brilleY, s) }] };
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
  const laechelt = herzSichtbar;
  const ernst = herzSichtbar.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
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
            <Animated.View style={[layer, brilleVersatz]}>
              <Image source={GLAESER} style={flaeche} contentFit="contain" />
            </Animated.View>
          </Animated.View>
          <Animated.View style={[layer, brilleVersatz]} pointerEvents="none">
            {[GLAS_L, GLAS_R].map((m) => (
              <Animated.View key={m.x} style={herzStil(m)}>
                <Herz size={herzGroesse} />
              </Animated.View>
            ))}
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
});

function Herz({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50 88 C20 66 6 50 6 32 C6 18 17 8 30 8 C39 8 46 13 50 21 C54 13 61 8 70 8 C83 8 94 18 94 32 C94 50 80 66 50 88 Z"
        fill={HERZ_FARBE}
        stroke={HERZ_RAND}
        strokeWidth={7}
        strokeLinejoin="round"
      />
      <Path d="M24 26 C27 20 33 18 38 20" stroke={HERZ_RAND} strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.85} />
    </Svg>
  );
}

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
  bubbleText: { fontFamily: font.display, fontSize: 18, lineHeight: 23, color: color.bg.screen, textAlign: 'center' },
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
