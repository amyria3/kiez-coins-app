import { useLayoutEffect, useSyncExternalStore } from 'react';
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

/** Wer wissen will, ob gerade eine breite Seite offen ist (Desktop-Rahmen in _layout.tsx), hört hier mit */
const wideListeners = new Set<() => void>();
const notifyWide = () => wideListeners.forEach((l) => l());
const subscribeWide = (l: () => void) => {
  wideListeners.add(l);
  return () => wideListeners.delete(l);
};

/**
 * Gibt der App im Browser die volle Breite, solange die Seite offen ist. `public/index.html` setzt die Klasse schon vor
 * dem Laden, damit die Seite nicht erst schmal erscheint; beim Verlassen fällt die App auf `WEB_MAX_WIDTH` zurück.
 */
export function useWideWeb() {
  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.classList.add(WIDE_CLASS);
    notifyWide();
    return () => {
      document.documentElement.classList.remove(WIDE_CLASS);
      notifyWide();
    };
  }, []);
}

/**
 * Desktop-Fassung (Daria, 2026-11-28, Variante B aus dem Entwurf „KiezCoins am Desktop“): Ab `DESKTOP_FROM` Fensterbreite
 * steht links eine Seitenleiste statt der Tab-Leiste unten, der Inhalt hat eine feste Lesebreite von
 * `DESKTOP_CONTENT_WIDTH`. Ab `DESKTOP_WIDE_FROM` zeigt die Seitenleiste die Namen neben den Icons. Breite öffentliche
 * Seiten (`useWideWeb`) haben ihren eigenen Aufbau und keine Seitenleiste.
 */
export const DESKTOP_FROM = 900;
export const DESKTOP_WIDE_FROM = 1200;
export const DESKTOP_CONTENT_WIDTH = 620;
/** Muss zu `max-width` von `#root` in `public/index.html` passen: ab hier hat die App die volle Fensterbreite */
const isDesktopWidth = (width: number) => Platform.OS === 'web' && width >= DESKTOP_FROM;

/** `desktop`: Seitenleiste und Lesebreite. `wideNav`: Seitenleiste mit Namen. */
export function useDesktop() {
  const { width } = useWindowDimensions();
  const wide = useSyncExternalStore(subscribeWide, isWideWeb, () => false);
  const desktop = isDesktopWidth(width) && !wide;
  return { desktop, wideNav: desktop && width >= DESKTOP_WIDE_FROM };
}

/**
 * Wie `useWindowDimensions`, im Browser aber höchstens `WEB_MAX_WIDTH` breit (auf breiten Seiten `WEB_WIDE_MAX_WIDTH`,
 * in der Desktop-Fassung `DESKTOP_CONTENT_WIDTH`).
 */
export function useAppDimensions() {
  const window = useWindowDimensions();
  if (Platform.OS !== 'web') return window;
  const max = isWideWeb() ? WEB_WIDE_MAX_WIDTH : isDesktopWidth(window.width) ? DESKTOP_CONTENT_WIDTH : WEB_MAX_WIDTH;
  return { ...window, width: Math.min(window.width, max) };
}
