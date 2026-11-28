import { useLayoutEffect } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/**
 * Größte Breite der App im Browser. Breitere Fenster zeigen die App mittig in dieser Breite,
 * wie auf einem Telefon. Muss zu `max-width` von `#root` in `public/index.html` passen.
 */
export const WEB_MAX_WIDTH = 480;

/**
 * Größte Breite der öffentlichen Seiten im Browser (Daria, 2026-11-28): die Digitale Visitenkarte für Gäste unter
 * `s/[slug]/visitenkarte`. Hauptspalte 620 px, Abstand 40 px, rechte Spalte 340 px, außen je 40 px, wie die
 * Desktop-Fassung der App und kiezcoins.de/s/<kurzname>. Ab `WEB_WIDE_FROM` stehen Karte und Knöpfe nebeneinander.
 */
export const WEB_WIDE_MAX_WIDTH = 1080;
export const WEB_WIDE_FROM = 1040;
/** Klasse an `<html>`, die `#root` in `public/index.html` die volle Breite gibt */
const WIDE_CLASS = 'kc-breit';

const isWideWeb = () =>
  Platform.OS === 'web' && typeof document !== 'undefined' && document.documentElement.classList.contains(WIDE_CLASS);

/**
 * Gibt der App im Browser die volle Breite, solange die Seite offen ist. `public/index.html` setzt die Klasse schon vor
 * dem Laden, damit die Seite nicht erst schmal erscheint; beim Verlassen fällt die App auf `WEB_MAX_WIDTH` zurück.
 */
export function useWideWeb() {
  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.classList.add(WIDE_CLASS);
    return () => document.documentElement.classList.remove(WIDE_CLASS);
  }, []);
}

/** Wie `useWindowDimensions`, im Browser aber höchstens `WEB_MAX_WIDTH` breit (auf breiten Seiten `WEB_WIDE_MAX_WIDTH`). */
export function useAppDimensions() {
  const window = useWindowDimensions();
  if (Platform.OS !== 'web') return window;
  return { ...window, width: Math.min(window.width, isWideWeb() ? WEB_WIDE_MAX_WIDTH : WEB_MAX_WIDTH) };
}
