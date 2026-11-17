import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import { whenUntouched } from '../../lib/touching';

import { localDate } from '../../data/reminders';
import { useCalendarShown } from '../../data/routineView';
import { type ShowcaseEvent } from '../../data/showcase';
import { styles } from './styles';

/**
 * Routine im Kiez-Look (Daria, 2026-11-12), nach der Vorlage „ListEasy“: oben der Kalender, darunter drei Gruppen
 * mit farbigen Karten, jede Gruppe waagerecht scrollbar, die Seite senkrecht.
 * Lila und das Grün des Systems bleiben der Bedienung vorbehalten, die Karten haben eigene Farben.
 * Der Kater rechts oben zeigt den Stand; später als kurzes Video (wartet, freut sich, sauer …).
 * Entwürfe: Projektordner routine-karte/2026-11-12_*.png
 */


export type Saved = ShowcaseEvent & { showcase: string };

export const noLock = () => {};

/**
 * Ist der Kalender oben offen, tritt der Kater zur Seite (Daria, 2026-11-14): Er gleitet nach links hinaus, die Zeile
 * schrumpft, danach ist er ganz weg (sonst bliebe der Abstand der Liste stehen). Klappt der Kalender zu, kommt er zurück.
 */
export function AsideWhenCalendar({ children }: { children: ReactNode }) {
  const shown = !useCalendarShown();
  const [mounted, setMounted] = useState(shown);
  const [height, setHeight] = useState(0);
  const anim = useRef(new Animated.Value(shown ? 1 : 0)).current;
  useEffect(() => {
    if (shown) setMounted(true);
    anim.stopAnimation();
    Animated.timing(anim, { toValue: shown ? 1 : 0, duration: 520, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }).start(({ finished }) => {
      if (finished && !shown) setMounted(false);
    });
  }, [shown, anim]);
  const style = useMemo(
    () => ({
      opacity: anim,
      height: height ? anim.interpolate({ inputRange: [0, 1], outputRange: [0, height] }) : undefined,
      transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }],
    }),
    [anim, height],
  );
  if (!mounted) return null;
  return (
    <Animated.View style={[styles.aside, style]}>
      <View onLayout={(e) => setHeight((h) => (h === e.nativeEvent.layout.height ? h : e.nativeEvent.layout.height))}>{children}</View>
    </Animated.View>
  );
}

/** Uhrzeit für Dringlichkeit und Sortierung; jede Minute neu */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Neu sortieren erst, wenn kein Finger liegt: sonst wandert eine Karte unter dem Finger weg (Daria, 2026-11-14)
    let cancel = () => {};
    const id = setInterval(() => {
      cancel();
      cancel = whenUntouched(() => setNow(new Date()));
    }, 60_000);
    return () => {
      clearInterval(id);
      cancel();
    };
  }, []);
  return now;
}

/**
 * „Später“ (Daria, 2026-11-13): Karte nach oben ziehen schiebt sie für eine Stunde ans Ende ihrer Gruppe, und sie
 * wackelt so lange nicht. Gilt nur auf diesem Gerät.
 */
const LATER_KEY = 'routine-spaeter';
const LATER_MS = 60 * 60 * 1000;
export function useLater() {
  const [later, setLater] = useState<Record<string, number>>({});
  useEffect(() => {
    AsyncStorage.getItem(LATER_KEY).then(
      (v) => v && setLater(JSON.parse(v) as Record<string, number>),
      () => {},
    );
  }, []);
  const snooze = useCallback(
    (id: string) =>
      setLater((all) => {
        const next = Object.fromEntries(Object.entries(all).filter(([, until]) => until > Date.now()));
        next[id] = Date.now() + LATER_MS;
        AsyncStorage.setItem(LATER_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      }),
    [],
  );
  return { later, snooze };
}

/** Solange eine Karte angehoben ist, scrollen weder die Reihe noch die Seite */
export const DragLock = createContext<(on: boolean) => void>(() => {});
/** Bewegte Karten an (Dein Konto › Funktionen): Schräge, Wackeln, Halten und Ziehen (Daria, 2026-11-13) */
export const Motion = createContext(true);
export const PageLock = createContext<(on: boolean) => void>(() => {});

/** Leichte, unregelmäßige Schräge je Karte (Daria, 2026-11-13); fest an der id, damit nichts springt */
const TILTS = [-1.4, 0.9, -0.5, 1.6, -1.1, 0.4, 1.2, -0.8];
export function tiltOf(key: string): number {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
  return TILTS[Math.abs(h) % TILTS.length];
}

/**
 * Wo der Stimmungs-Sticker am Kater klebt (Daria, 2026-11-14): nie über dem Gesicht, sondern darunter oder über den
 * Ohren, mal links, mittig oder rechts, mal schräg in die eine, mal in die andere Richtung. Wechselt jeden Tag und
 * bleibt innerhalb eines Tages gleich, damit nichts springt.
 */
const STICKERS: { above: boolean; avatar: 'flex-start' | 'center' | 'flex-end'; rotate: number }[] = [
  { above: false, avatar: 'flex-end', rotate: -7 },
  { above: false, avatar: 'flex-start', rotate: 6 },
  { above: false, avatar: 'center', rotate: -3 },
  { above: true, avatar: 'flex-end', rotate: 8 },
  { above: true, avatar: 'flex-start', rotate: -9 },
  { above: false, avatar: 'center', rotate: 9 },
];
export function stickerOf(key: string) {
  let h = 7;
  for (const c of `${key}${localDate()}`) h = (h * 33 + c.charCodeAt(0)) | 0;
  return STICKERS[Math.abs(h) % STICKERS.length];
}

/** Wer in den Systemeinstellungen weniger Bewegung wählt, bekommt kein Wackeln */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce, () => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

/** Überschrift mit Anzahl, darunter die Karten nebeneinander zum Wischen */
