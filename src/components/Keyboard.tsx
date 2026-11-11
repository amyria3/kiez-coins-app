import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { scrollIntoView } from './Nudge';

/**
 * Eine Lösung für die Tastatur auf allen Plattformen (Daria, 2026-11-11): Geht die Tastatur auf, rückt die Seite
 * nach oben. Das aktive Feld und die ActionBar stehen über der Tastatur, nichts verschiebt sich unter dem Finger.
 *
 * - `KeyboardProvider` (einmal in `_layout.tsx`): kennt die Tastaturhöhe, scrollt das aktive Feld ins Bild und
 *   nimmt den Abstand zum Home-Balken weg, solange die Tastatur ihn verdeckt.
 * - `KeyboardArea` (in SubScreen, HeroScreen, ComposeSheet, Chat, Tour, Umfrage): der Bereich, der über der
 *   Tastatur bleibt. Auf iPhone und Android als KeyboardAvoidingView. Android zeichnet seit Android 16 immer
 *   randlos (edge-to-edge), das Fenster wird dort nicht mehr kleiner. Deshalb rückt der Bereich auf beiden
 *   Plattformen selbst nach oben (`padding`).
 * - Browser: Die Tastatur verkleinert dort nur den sichtbaren Ausschnitt (`visualViewport`), nicht die Seite.
 *   Safari schob deshalb die ganze Seite nach oben und ließ sie nach dem Schließen verschoben stehen. Ein
 *   Tippen landete dann auf dem Element darüber. Jetzt wird die Seite so hoch wie der sichtbare Ausschnitt
 *   (`--keyboard-inset` in `public/index.html`) und bleibt oben stehen.
 *
 * Neue Screens mit Eingabefeldern nutzen SubScreen oder HeroScreen, eigene Aufbauten `KeyboardArea`.
 * Nie direkt `KeyboardAvoidingView` verwenden.
 */

/** Unterschiede bis zu dieser Höhe kommen im Browser von der Adressleiste, nicht von der Tastatur */
const MIN_KEYBOARD_HEIGHT = 120;

const KeyboardHeightContext = createContext(0);

/** Höhe der offenen Tastatur in Punkten, 0 wenn sie zu ist */
export function useKeyboardHeight() {
  return useContext(KeyboardHeightContext);
}

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const [height, setHeight] = useState(0);
  useNativeKeyboard(setHeight);
  useWebKeyboard(setHeight);
  const insets = useSafeAreaInsets();
  // Die Tastatur liegt über dem Home-Balken: Ohne diese Korrektur bliebe über ihr ein leerer Streifen
  const value = height > 0 && insets.bottom > 0 ? { ...insets, bottom: 0 } : insets;
  return (
    <KeyboardHeightContext.Provider value={height}>
      <SafeAreaInsetsContext.Provider value={value}>{children}</SafeAreaInsetsContext.Provider>
    </KeyboardHeightContext.Provider>
  );
}

type KeyboardAreaProps = {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  /**
   * Liegt über der Seite (Modal), statt in ihr. Im Browser wird nur die Seite kleiner, ein Overlay rückt
   * deshalb selbst um die Tastaturhöhe nach oben.
   */
  overlay?: boolean;
};

/** Bereich, der über der Tastatur bleibt. Siehe Kommentar oben. */
export function KeyboardArea({ style, children, overlay }: KeyboardAreaProps) {
  const height = useKeyboardHeight();
  if (Platform.OS === 'web') {
    return <View style={[style, overlay && height ? { paddingBottom: height } : null]}>{children}</View>;
  }
  return (
    <KeyboardAvoidingView style={style} behavior="padding">
      {children}
    </KeyboardAvoidingView>
  );
}

/** iPhone und Android: Höhe aus den Tastatur-Ereignissen, danach das aktive Feld ins Bild scrollen */
function useNativeKeyboard(setHeight: (height: number) => void) {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    // iOS meldet die Tastatur schon vor der Animation, Android erst danach
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subs = [
      Keyboard.addListener(show, (e) => setHeight(e.endCoordinates.height)),
      Keyboard.addListener(hide, () => setHeight(0)),
      // Erst wenn die Tastatur steht und der Bereich nach oben gerückt ist, liegt das Feld an seiner neuen Stelle
      Keyboard.addListener('keyboardDidShow', () => {
        clearTimeout(timer);
        timer = setTimeout(revealFocusedInput, 80);
      }),
    ];
    return () => {
      clearTimeout(timer);
      subs.forEach((s) => s.remove());
    };
  }, [setHeight]);
}

function revealFocusedInput() {
  const input = TextInput.State.currentlyFocusedInput();
  // Nur so weit scrollen, dass das Feld unten ganz zu sehen ist. Steht es schon frei, bleibt alles stehen.
  if (input) scrollIntoView(input as unknown as View, 'end');
}

/** Browser: Höhe aus dem sichtbaren Ausschnitt, Seite darauf verkleinern und oben halten */
function useWebKeyboard(setHeight: (height: number) => void) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const root = document.documentElement;
    // Höchster sichtbarer Ausschnitt bei geschlossener Tastatur, je Fensterbreite (Drehen setzt ihn neu)
    let full = { width: window.innerWidth, height: viewport.height };
    let current = 0;
    let frame = 0;
    const update = () => {
      if (window.innerWidth !== full.width) full = { width: window.innerWidth, height: viewport.height };
      // Manche Browser verkleinern innerHeight mit, andere nicht. Der größere Wert ist die Tastatur.
      const covered = Math.round(Math.max(window.innerHeight - viewport.height, full.height - viewport.height));
      const next = covered > MIN_KEYBOARD_HEIGHT ? covered : 0;
      if (!next) full.height = Math.max(full.height, viewport.height);
      if (next !== current) {
        current = next;
        root.style.setProperty('--keyboard-inset', `${next}px`);
        setHeight(next);
        if (next) {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            revealFocusedElement();
            window.scrollTo(0, 0);
          });
        }
      }
      // Safari schiebt beim Fokus die ganze Seite hoch. Sie gehört oben hin, auch nach dem Schließen.
      if (window.scrollY !== 0 || viewport.offsetTop !== 0) window.scrollTo(0, 0);
    };
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('focusout', update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('focusout', update);
      root.style.removeProperty('--keyboard-inset');
    };
  }, [setHeight]);
}

function revealFocusedElement() {
  const el = document.activeElement as HTMLElement | null;
  if (!el || !(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
  // Abstand zum Rand über scroll-margin in public/index.html
  el.scrollIntoView({ block: 'nearest' });
}
