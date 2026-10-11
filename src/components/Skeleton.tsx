import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';

import { color, radius, size, space } from '../theme/tokens';

/** Sanftes Pulsieren der Deckkraft (0,5 ↔ 1, 1 s). Bei „Bewegung reduzieren“ ohne Animation. */
function usePulse() {
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return opacity;
}

/** Figma „SkeletonPost“: Platzhalter für einen ChallengePost während des Ladens. */
export function SkeletonPost() {
  const opacity = usePulse();
  return (
    <Animated.View style={[styles.post, { opacity }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.authorRow}>
        <View style={styles.avatar} />
        <View style={styles.lines}>
          <View style={[styles.line, { width: 120, height: 12 }]} />
          <View style={[styles.line, { width: 80, height: 10 }]} />
        </View>
      </View>
      <View style={styles.media} />
      <View style={styles.lines}>
        <View style={[styles.line, { width: '100%', height: 12 }]} />
        <View style={[styles.line, { width: 240, height: 12 }]} />
      </View>
    </Animated.View>
  );
}

/** Figma „SkeletonTopItem“: Platzhalter für ein TopChallengeItem. */
export function SkeletonTopItem() {
  const opacity = usePulse();
  return (
    <Animated.View style={[styles.topItem, { opacity }]}>
      <View style={styles.thumbnail} />
      <View style={[styles.line, { width: 48, height: 8 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  post: { padding: space[12], gap: space[12] },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  avatar: { width: size.avatar, height: size.avatar, borderRadius: radius.full, backgroundColor: color.bg.surface },
  lines: { gap: space[6] },
  line: { borderRadius: radius.sm, backgroundColor: color.bg.surface },
  media: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: color.bg.surface },
  topItem: { width: size.thumbnail, alignItems: 'center', gap: space[4] },
  thumbnail: { width: size.thumbnail, height: size.thumbnail, borderRadius: radius.full, backgroundColor: color.bg.surface },
});
