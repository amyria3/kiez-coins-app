import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { SWIPE_DISTANCE } from '../components/feed/feedConstants';
import { useAppDimensions } from '../theme/layout';
import { motion } from '../theme/tokens';
import { cardSwipe, resetCardSwipe } from './cardSwipe';

/**
 * Wischen und Wechsel zwischen den großen Seiten wie zwischen den Reitern im Feed (Daria, 2026-11-17: „zwischen meine
 * Struktur und mein Feed, Gruppen, Kiez, Überall ist es perfekt, ich hätte das gern auch zu den Nachrichten und zu
 * meinen Einstellungen“). Reihenfolge wie in der Leiste: Feed (mit seinen Reitern), Nachrichten, Konto.
 *
 * Die Seiten haben im Stack keine eigene Animation (`animation: 'none'`). Die alte Seite gleitet hinaus
 * (`motion.tabSwitch.exit`), die neue kommt von der Seite herein und federt ein (`motion.tabSwitch.spring`), genau wie
 * im Feed. `slideNext` merkt sich, von welcher Seite die nächste Seite kommt: 1 von rechts, -1 von links.
 */
export type SlideDir = 1 | -1;

let pending: SlideDir | null = null;

/** Die nächste Seite, die den Fokus bekommt, kommt von dieser Seite herein */
export function slideNext(dir: SlideDir) {
  pending = dir;
}

/** Liest die gemerkte Richtung und löscht sie */
export function takeSlide(): SlideDir | null {
  const dir = pending;
  pending = null;
  return dir;
}

/** Wechsel mit Bewegung: die Seite gleitet hinaus, dann `go` (Navigation). Ohne Anbieter sofort. */
type Leave = (dir: SlideDir, go: () => void) => void;
const PageSlideContext = createContext<Leave>((dir, go) => {
  slideNext(dir);
  go();
});
export const PageSlideProvider = PageSlideContext.Provider;
export function usePageLeave(): Leave {
  return useContext(PageSlideContext);
}

/**
 * Für Nachrichten und Konto: Inhalt folgt dem Finger, Wischen nach links öffnet `next`, nach rechts `prev`.
 * Ohne Nachbarn gibt der Inhalt nur zäh nach und federt zurück, wie im Feed.
 */
export function usePageSlide({ prev, next }: { prev?: () => void; next?: () => void }) {
  const x = useRef(new Animated.Value(0)).current;
  const { width } = useAppDimensions();
  const widthRef = useRef(width);
  widthRef.current = width;
  const prevRef = useRef(prev);
  prevRef.current = prev;
  const nextRef = useRef(next);
  nextRef.current = next;

  // Beim Fokus: von der gemerkten Seite hereinfedern, sonst (z. B. Android-Zurück) gleich an Ort und Stelle
  useFocusEffect(
    useCallback(() => {
      const dir = takeSlide();
      if (!dir) {
        x.setValue(0);
        return;
      }
      x.setValue(dir * widthRef.current);
      Animated.spring(x, { toValue: 0, useNativeDriver: false, ...motion.tabSwitch.spring }).start();
    }, [x]),
  );

  const leave = useCallback<Leave>(
    (dir, go) => {
      slideNext(dir);
      Animated.timing(x, {
        toValue: -dir * widthRef.current,
        duration: motion.tabSwitch.exit,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start(() => go());
    },
    [x],
  );

  const springBack = useCallback(() => Animated.spring(x, { toValue: 0, useNativeDriver: false, ...motion.tabSwitch.spring }).start(), [x]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: resetCardSwipe,
        onMoveShouldSetPanResponderCapture: (_, g) => !cardSwipe.active && Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderGrant: () => x.stopAnimation(),
        onPanResponderMove: (_, g) => {
          const has = g.dx < 0 ? !!nextRef.current : !!prevRef.current;
          x.setValue(has ? g.dx : g.dx * 0.25);
        },
        onPanResponderRelease: (_, g) => {
          if ((g.dx < -SWIPE_DISTANCE || g.vx < -0.5) && nextRef.current) return leave(1, nextRef.current);
          if ((g.dx > SWIPE_DISTANCE || g.vx > 0.5) && prevRef.current) return leave(-1, prevRef.current);
          springBack();
        },
        onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: false, ...motion.barrierSpring }).start(),
      }),
    [x, leave, springBack],
  );

  return { panHandlers: pan.panHandlers, style: { transform: [{ translateX: x }] }, leave };
}
