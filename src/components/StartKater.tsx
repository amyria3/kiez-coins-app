import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, space } from '../theme/tokens';
import { t } from '../data/texts';
import { getLogoTarget } from '../lib/logoTarget';
import { GearsLoader } from './GearsLoader';
import { Logo } from './icons/Brand';

/** Seitenverhältnis der Wortbildmarke (assets/marke/wortbildmarke.svg, 105 × 24) */
const LOGO_RATIO = 105 / 24;
/** So lange stehen Logo und Zahnräder mindestens, auch wenn alles schon geladen ist */
const MIN_SHOW_MS = 1200;
/** Logo gleitet an seinen Platz, die Zahnräder rollen weg */
const LEAVE_MS = 650;

/**
 * Startbildschirm (Daria, 2026-11-16): In der Mitte die Wortbildmarke (Kater im Kreis und „KiezCoins“), unten drehen
 * die Zahnräder. Ist die App geladen, gleitet das Logo an seinen Platz oben im Feed und wird dabei so klein wie dort.
 * Die Zahnräder rollen nach rechts aus dem Bild, der dunkle Grund blendet aus, und darunter steht die App.
 * Ohne Feed-Kopf (Start z. B. in der Routine) gleitet das Logo nach oben raus. Ein Tipp überspringt die Wartezeit.
 * Mit „Bewegung reduzieren“ blendet alles nur aus.
 * Vorher (bis 2026-11-16): Kater mit Besen und Spruch; der fällt weg (Daria: „Kater fällt weg“).
 */
export function StartKater({ loaded, onDone }: { loaded: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height } = useWindowDimensions();
  const logoWidth = Math.round(Math.min(300, screenWidth * 0.72));
  const logoHeight = logoWidth / LOGO_RATIO;
  const gearsSize = Math.round(Math.min(200, height * 0.22));
  const [shownLongEnough, setShownLongEnough] = useState(false);
  const [skip, setSkip] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const [path, setPath] = useState({ dx: 0, dy: -height / 2, scale: 1, fadeLogo: true });
  const logoRef = useRef<View>(null);
  const leaving = useRef(false);

  // Die Zahnräder aus public/index.html übernehmen: Ab hier drehen die eigenen an derselben Stelle
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.getElementById('boot')?.remove();
    document.getElementById('boot-moment')?.remove();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShownLongEnough(true), MIN_SHOW_MS);
    return () => clearTimeout(timer);
  }, []);

  const leave = () => {
    if (leaving.current) return;
    leaving.current = true;
    const target = getLogoTarget();
    const run = (still: boolean) => {
      logoRef.current?.measureInWindow((x, y, w, h) => {
        if (target && w > 0) {
          setPath({
            dx: target.x + target.width / 2 - (x + w / 2),
            dy: target.y + target.height / 2 - (y + h / 2),
            scale: target.width / w,
            fadeLogo: false,
          });
        }
        Animated.timing(progress, {
          toValue: 1,
          duration: still ? 250 : LEAVE_MS,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }).start(() => onDone());
      });
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(run);
  };

  useEffect(() => {
    if (loaded && (shownLongEnough || skip)) leave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, shownLongEnough, skip]);

  // Abrollen: So weit, wie die Räder rollen, drehen sie sich (Umfang = π × Breite)
  const rollDistance = screenWidth + gearsSize;
  const rollTurns = rollDistance / (Math.PI * gearsSize);

  return (
    <View style={[StyleSheet.absoluteFill, styles.top]} pointerEvents="box-none">
      {/* Der Grund blendet erst am Ende aus: Sonst stünde das echte Logo im Feed schon da, bevor das große ankommt */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.screen, { opacity: progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }) }]}
      />
      <Pressable
        onPress={() => setSkip(true)}
        style={[styles.area, { paddingBottom: insets.bottom + space[32] + gearsSize + space[24] }]}
        accessibilityRole="button"
        accessibilityLabel={t('Weiter')}
      >
        <Animated.View
          ref={logoRef}
          collapsable={false}
          style={{
            opacity: path.fadeLogo ? progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) : 1,
            transform: [
              { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, path.dx] }) },
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, path.dy] }) },
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, path.scale] }) },
            ],
          }}
        >
          <Logo height={logoHeight} />
        </Animated.View>
      </Pressable>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.gears,
          {
            bottom: insets.bottom + space[32],
            transform: [
              { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, rollDistance] }) },
              { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${rollTurns * 360}deg`] }) },
            ],
          },
        ]}
      >
        <GearsLoader size={gearsSize} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { zIndex: 10 },
  screen: { backgroundColor: color.bg.screen },
  area: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  gears: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
