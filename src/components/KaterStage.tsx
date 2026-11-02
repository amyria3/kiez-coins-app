import { memo, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import Svg, { Path } from 'react-native-svg';
import { Text } from './T';

import type { KaterAktion, KaterSpruch } from '../data/kater';
import { t } from '../data/texts';
import { color, font, motion, radius, space } from '../theme/tokens';

// Ebenen aus Darias Figma-Kater, alle auf derselben Fläche 1300 × 1885. Gebaut mit scripts/kater-ebenen.py (02.11.2026).
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
// Münder (Daria, 02.11.2026): sonst der Default-Mund, bei den Herzen lächelt er. Je mit und ohne Aussparung der Gläser.
const MUND = require('../../assets/kater/mund.png');
const MUND_GANZ = require('../../assets/kater/mund-ganz.png');
const LAECHELN = require('../../assets/kater/mund-laecheln.png');
const LAECHELN_GANZ = require('../../assets/kater/mund-laecheln-ganz.png');
/** Ausschnitt der Mundbilder auf der Fläche */
const MUND_BOX = { x: 560, y: 530, w: 120, h: 140 };
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
/** Herzen: Darias Herz, flach, kräftiges Rot mit weißem Rand, damit sie sich von den orangebraunen Gläsern und dem blauen Fell abheben */
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
        </Animated.View>
      </Pressable>
    </View>
  );
});

function Herz({ size }: { size: number }) {
  return (
    // Darias Herz (assets/icons/heart.svg), flach, weißer Rand für den Kontrast
    <Svg width={size} height={size} viewBox="-2 -2 39 40">
      <Path
        d="M5.12647 19.7975C4.69258 17.9806 4.68712 17.9851 4.6516 17.8263C3.48654 14.2976 3.44118 13.3646 3.29801 11.3288C3.04117 7.67041 2.66576 7.38825 3.586 4.2296C3.92043 3.0803 4.59859 2.43592 4.72209 2.31905C5.95764 1.14585 6.98444 -0.298527 9.12767 0.0540128C10.9621 0.355544 12.366 0.309702 14.3885 4.98827C15.2546 7.06929 15.1939 7.08801 15.8333 9.27621C15.8901 9.33497 16.4639 9.92835 16.6585 9.82504C16.8978 9.69784 18.2039 7.61553 19.1367 6.42038C19.9667 5.45962 20.0509 5.57713 20.8176 4.53759C22.0548 3.2217 22.6925 2.6393 24.4526 1.85481C26.6975 0.854653 28.1336 1.213 28.1844 1.22333C31.6343 1.91033 31.7649 4.45365 31.9976 6.18665C32.0425 9.57903 31.4424 11.0686 30.637 13.3911C30.0725 15.0189 29.9151 14.9059 29.2085 16.4471C28.1243 18.8135 28.015 18.7257 26.2226 21.2303C23.4034 25.0946 23.3974 25.0837 23.1586 25.4252C21.8313 27.3216 20.6651 28.3734 20.1968 28.979C18.9175 30.6307 18.7886 30.6726 17.3607 32.1351C16.647 32.7704 16.2442 33.1566 16.1492 33.2476C11.8343 37.3799 10.0638 33.123 9.41019 31.4849C7.0462 26.1729 7.43801 25.9786 5.12647 19.7975Z"
        fill={HERZ_FARBE}
        stroke={HERZ_RAND}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
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
