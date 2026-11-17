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
/** Browser: Teil der Tastatur, um den die Seite selbst noch nicht kleiner geworden ist (siehe useWebKeyboard) */
const KeyboardInsetContext = createContext(0);

/** Höhe der offenen Tastatur in Punkten, 0 wenn sie zu ist */
export function useKeyboardHeight() {
  return useContext(KeyboardHeightContext);
}

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const [height, setHeight] = useState(0);
  const [webInset, setWebInset] = useState(0);
  useNativeKeyboard(setHeight);
  useWebKeyboard(setHeight, setWebInset);
  const insets = useSafeAreaInsets();
  // Die Tastatur liegt über dem Home-Balken: Ohne diese Korrektur bliebe über ihr ein leerer Streifen
  const value = height > 0 && insets.bottom > 0 ? { ...insets, bottom: 0 } : insets;
  return (
    <KeyboardHeightContext.Provider value={height}>
      <KeyboardInsetContext.Provider value={webInset}>
        <SafeAreaInsetsContext.Provider value={value}>{children}</SafeAreaInsetsContext.Provider>
      </KeyboardInsetContext.Provider>
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
  const inset = useContext(KeyboardInsetContext);
  if (Platform.OS === 'web') {
    return <View style={[style, overlay && inset ? { paddingBottom: inset } : null]}>{children}</View>;
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
function useWebKeyboard(setHeight: (height: number) => void, setInset: (inset: number) => void) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const root = document.documentElement;
    // Höchster sichtbarer Ausschnitt bei geschlossener Tastatur, je Fensterbreite (Drehen setzt ihn neu)
    let full = { width: window.innerWidth, height: viewport.height, page: root.clientHeight };
    let current = 0;
    let currentInset = 0;
    let frame = 0;
    const update = () => {
      if (window.innerWidth !== full.width) full = { width: window.innerWidth, height: viewport.height, page: root.clientHeight };
      // Manche Browser verkleinern innerHeight mit, andere nicht. Der größere Wert ist die Tastatur.
      const covered = Math.round(Math.max(window.innerHeight - viewport.height, full.height - viewport.height));
      // Ohne aktives Feld ist keine Tastatur offen. Die Web-App auf dem iPhone-Home-Bildschirm meldet das Schließen
      // nicht immer; die Seite blieb dann halb so hoch, und Dialoge saßen oben fest (Daria, 2026-11-16).
      const next = covered > MIN_KEYBOARD_HEIGHT && isEditable(document.activeElement) ? covered : 0;
      if (!next) {
        full.height = Math.max(full.height, viewport.height);
        full.page = Math.max(full.page, root.clientHeight);
      }
      // Die Web-App auf dem iPhone-Home-Bildschirm verkleinert bei offener Tastatur manchmal schon die Seite selbst
      // (100 % von html). Zog die App die Tastatur dann noch einmal ab, blieb für den Inhalt fast nichts übrig, und
      // das Formular war leer (Daria, 2026-11-16). Abgezogen wird nur, was die Seite nicht schon selbst abgibt.
      const inset = next ? Math.max(0, next - Math.max(0, full.page - root.clientHeight)) : 0;
      if (inset !== currentInset) {
        currentInset = inset;
        root.style.setProperty('--keyboard-inset', `${inset}px`);
        setInset(inset);
      }
      if (next !== current) {
        current = next;
        setHeight(next);
        if (next) {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(revealFocusedElement);
        }
      }
      // Safari schiebt beim Fokus die ganze Seite hoch, damit das Feld über der Tastatur steht. Sie gehört oben hin,
      // aber erst wenn kein Feld mehr aktiv ist. Solange eins aktiv ist, scrollt hier nichts: In der Web-App auf dem
      // Home-Bildschirm meldet iOS die Tastatur nicht immer über `visualViewport`. Das Zurückscrollen schob das
      // Feld dann unter die Tastatur oder schloss sie sofort wieder (Daria, 2026-11-15). Das aktive und das nächste
      // Feld müssen immer zu sehen sein.
      if (!current && !isEditable(document.activeElement) && (window.scrollY !== 0 || viewport.offsetTop !== 0)) {
        window.scrollTo(0, 0);
      }
      // Feld ganz oben (Suche im Feed): Safari schob die Seite trotzdem hoch. Das Feld lag halb unter der Statusleiste
      // und die Tab-Leiste mitten im Bild (Daria, 2026-11-17: „Rollt weg“). Steht das Feld auch bei Seite ganz oben
      // frei über der Tastatur, kommt die Seite zurück. Höchstens zweimal je Fokus, damit nichts gegen Safari anläuft.
      const active = document.activeElement;
      if (current && isEditable(active) && pulls < 2 && (window.scrollY !== 0 || viewport.offsetTop !== 0)) {
        const rect = active.getBoundingClientRect();
        if (rect.bottom + window.scrollY + viewport.offsetTop <= viewport.height - 24) {
          pulls += 1;
          window.scrollTo(0, 0);
        }
      }
    };
    let pulls = 0;
    // Beim Verlassen eines Felds steht der neue Fokus erst nach dem Ereignis fest (z. B. Pfeil zum nächsten Feld)
    let later: ReturnType<typeof setTimeout> | undefined;
    const afterFocusChange = () => {
      clearTimeout(later);
      later = setTimeout(update, 0);
    };
    // Zum nächsten Feld bei offener Tastatur: Die Höhe ändert sich nicht, das Feld muss trotzdem ins Bild
    let settle: ReturnType<typeof setTimeout> | undefined;
    const onFocusIn = () => {
      pulls = 0;
      // Safari scrollt erst nach der Tastatur-Animation; danach noch einmal prüfen
      clearTimeout(settle);
      settle = setTimeout(update, 400);
      if (!current) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(revealFocusedElement);
    };
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('focusout', afterFocusChange);
    window.addEventListener('focusin', onFocusIn);
    update();
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(later);
      clearTimeout(settle);
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('focusout', afterFocusChange);
      window.removeEventListener('focusin', onFocusIn);
      root.style.removeProperty('--keyboard-inset');
    };
  }, [setHeight, setInset]);
}

/** Eingabe-Arten ohne Tastatur */
const NO_KEYBOARD = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit']);

/** Eingabefeld, das die Tastatur öffnet */
function isEditable(el: Element | null): el is HTMLElement {
  const node = el as HTMLElement | null;
  if (!node) return false;
  if (node.tagName === 'INPUT') return !NO_KEYBOARD.has((node as HTMLInputElement).type);
  return node.tagName === 'TEXTAREA' || node.isContentEditable;
}

function revealFocusedElement() {
  const el = document.activeElement;
  if (!isEditable(el)) return;
  // Abstand zum Rand über scroll-margin in public/index.html
  el.scrollIntoView({ block: 'nearest' });
}
