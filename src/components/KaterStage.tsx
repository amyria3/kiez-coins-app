import { memo, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './T';

import type { KaterAktion, KaterSpruch } from '../data/kater';
import { t } from '../data/texts';
import { color, font, motion, radius, space } from '../theme/tokens';

// Ebenen aus Darias SVG (assets/illustrations/kater.svg), alle auf derselben Fläche 651 × 812
const KOERPER = require('../../assets/kater/koerper.png');
const BESEN = require('../../assets/kater/besen.png');
const BRILLE = require('../../assets/kater/brille.png');
const STIEFEL = require('../../assets/kater/stiefel.png');
const W = 651;
const H = 812;

type Props = {
  /** Breite der Figur in pt; die Höhe folgt dem Bild */
  width: number;
  /** Was der Kater gerade sagt und tut. Ein neuer `take` spielt die Aktion neu ab. */
  spruch?: KaterSpruch | null;
  take?: number;
  onPress?: () => void;
};

/**
 * Darias Kater mit Besen (Daria, 22.10.2026): atmet, und je Spruch eine Aktion:
 * fegen (Besen umdrehen, mit der Bürste hin und her), winken (Besen heben und schwenken),
 * brille (Sonnenbrille runter, drüber schauen), stampfen (Stiefel heben). Darüber die Sprechblase.
 */
export const KaterStage = memo(function KaterStage({ width, spruch, take = 0, onPress }: Props) {
  const s = width / W;
  const height = H * s;
  const [still, setStill] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => {});
  }, []);

  const atem = useRef(new Animated.Value(0)).current;
  const besenRot = useRef(new Animated.Value(0)).current;
  const besenX = useRef(new Animated.Value(0)).current;
  const besenY = useRef(new Animated.Value(0)).current;
  const brilleY = useRef(new Animated.Value(0)).current;
  const stiefelY = useRef(new Animated.Value(0)).current;
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
      // Besen umdrehen, Bürste nach unten, dann hin und her
      const unten = 197;
      const hin = (rot: number, x: number) => Animated.parallel([step(besenRot, rot, 260), step(besenX, x, 260)]);
      ablauf = Animated.sequence([
        Animated.parallel([step(besenRot, 172, 380), step(besenY, unten, 380)]),
        hin(164, -11),
        hin(178, 8),
        hin(164, -11),
        hin(178, 8),
        hin(172, 0),
        Animated.delay(150),
        zurueck,
      ]);
    } else if (aktion === 'winken') {
      const schwenk = (rot: number) => step(besenRot, rot, 220);
      ablauf = Animated.sequence([
        step(besenY, -48, 260),
        schwenk(8),
        schwenk(-8),
        schwenk(8),
        schwenk(0),
        zurueck,
      ]);
    } else if (aktion === 'brille') {
      ablauf = Animated.sequence([step(brilleY, 27, 420), Animated.delay(1000), zurueck]);
    } else {
      const hoch = Animated.sequence([step(stiefelY, -21, 160), step(stiefelY, 0, 160)]);
      ablauf = Animated.sequence([hoch, Animated.delay(80), Animated.sequence([step(stiefelY, -16, 160), step(stiefelY, 0, 160)])]);
    }
    ablauf.start();
    return () => ablauf.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [take, spruch, still]);

  const flaeche = { width, height };
  const layer = { position: 'absolute' as const, left: 0, top: 0, width, height };
  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.bubble,
          {
            opacity: blase,
            transform: [{ scale: blase.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }, { rotate: '-2deg' }],
          },
        ]}
        accessibilityLiveRegion="polite"
      >
        <Text style={styles.bubbleText}>{spruch ? t(spruch.text) : ' '}</Text>
        <View style={styles.tail} />
      </Animated.View>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : 'image'}
        accessibilityLabel={onPress ? t('Kater antippen: noch ein Spruch') : t('Kater mit Sonnenbrille, Schürze und Besen')}
      >
        <Animated.View
          style={[
            flaeche,
            { transformOrigin: [width / 2, height, 0], transform: [{ scaleY: atem.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] }) }] },
          ]}
        >
          <Image source={KOERPER} style={layer} contentFit="contain" />
          <Animated.View
            style={[
              layer,
              {
                // Drehpunkt an der Pfote, die den Besen hält
                // Als Zahlen in pt: iOS liest Prozentwerte mit vielen Nachkommastellen falsch
                transformOrigin: [450 * s, 412 * s, 0],
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
          <Animated.View style={[layer, { transform: [{ translateY: Animated.multiply(brilleY, s) }] }]}>
            <Image source={BRILLE} style={flaeche} contentFit="contain" />
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space[12] },
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
