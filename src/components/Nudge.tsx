import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AccessibilityInfo, Alert, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from './T';

import { color, radius, space, stroke, text } from '../theme/tokens';

/**
 * Hinweis an der richtigen Stelle, wenn ein Button deaktiviert ist (Daria, 21.10.2026):
 * - Fehlt eine Angabe, scrollt der Screen zum Feld, hebt es hervor und zeigt einen Hinweis darunter.
 *   Die Tastatur bleibt zu, damit die Person erst sieht, was fehlt.
 * - Liegt es an etwas anderem, erscheint eine Meldung (`explain`).
 *
 * Verwendung: `const title = useNudge();` → `<TextField nudge={title} …/>` oder `<NudgeArea nudge={title}>…</NudgeArea>`,
 * am Button `whyDisabled={() => title.nudge('Gib einen Titel ein.')}`.
 */

/** `start`: Ansicht oben mit etwas Luft (Felder). `end`: nur so weit, dass die Ansicht unten ganz zu sehen ist (Buttons). */
type ScrollAlign = 'start' | 'end';
type ScrollTarget = { scrollToView: (view: View | null, align?: ScrollAlign) => void };

/**
 * Scrollflächen der offenen Screens, die jüngste oben. Die Screen-Komponente ruft useNudge() außerhalb
 * ihres SubScreen auf, deshalb läuft das über diese Liste und nicht über einen React-Kontext.
 */
const scrollTargets: ScrollTarget[] = [];

/** Für Screens mit ScrollView: stellt bereit, dass Felder sich ins Bild scrollen lassen. */
export function useNudgeScroll(scrollRef: RefObject<ScrollView | null>) {
  const offset = useRef(0);
  const scrollToView = useCallback(
    (view: View | null, align: ScrollAlign = 'start') => {
      const scroll = scrollRef.current;
      if (!view || !scroll) return;
      // Lage der Ansicht relativ zur ScrollView berechnen, dann animiert hinscrollen
      const scrollNode = scroll as unknown as View;
      view.measureInWindow((_x, viewY, _w, viewH) => {
        scrollNode.measureInWindow((_sx, scrollY, _sw, scrollH) => {
          let y = offset.current + (viewY - scrollY) - space[24];
          if (align === 'end') {
            const hidden = viewY + viewH + space[24] - (scrollY + scrollH);
            if (hidden <= 0) return;
            y = offset.current + hidden;
          }
          scroll.scrollTo({ y: Math.max(0, y), animated: true });
        });
      });
    },
    [scrollRef],
  );
  const onScroll = useCallback((y: number) => {
    offset.current = y;
  }, []);
  return useMemo(() => ({ scrollToView, onScroll }), [scrollToView, onScroll]);
}

/**
 * Formulare (Daria, 21. und 27.10.2026): „Weiter“, „Fertig“ oder Enter in einem einzeiligen Feld springt ins
 * nächste Feld darunter und scrollt es animiert ins Bild. Nach dem letzten Feld geht es zum Absende-Button:
 * Die Tastatur geht zu, der Screen scrollt zum Button, im Browser bekommt er den Fokus. Ein zweites Enter schickt ab.
 * Die Reihenfolge ergibt sich aus der Lage auf dem Bildschirm.
 */
type FieldEntry = { input: RefObject<TextInput | null>; view: RefObject<View | null> };
type ButtonEntry = { view: RefObject<View | null>; fixed: boolean };
type FieldRegistry = {
  add: (f: FieldEntry) => () => void;
  addButton: (b: ButtonEntry) => () => void;
  next: (from: FieldEntry) => boolean;
};
const FieldContext = createContext<FieldRegistry | null>(null);

/** Buttons in der festen ActionBar unter dem Scrollbereich */
export const FixedBarContext = createContext(false);

const measureY = (view: RefObject<View | null>) =>
  new Promise<number>((resolve) => view.current!.measureInWindow((_x, y) => resolve(y)));

function focusButton(view: View) {
  if (Platform.OS === 'web') {
    (view as unknown as HTMLElement).focus?.();
    return;
  }
  // iPhone und Android: Buttons nehmen keinen Tastaturfokus. Der Screenreader springt aber hin.
  try {
    AccessibilityInfo.sendAccessibilityEvent(view, 'focus');
  } catch {
    // ohne Screenreader-Fokus geht es auch
  }
}

function useFieldRegistry(scroll: ScrollTarget): FieldRegistry {
  const fields = useRef<FieldEntry[]>([]);
  const buttons = useRef<ButtonEntry[]>([]);
  return useMemo(
    () => ({
      add: (f) => {
        fields.current.push(f);
        return () => {
          fields.current = fields.current.filter((x) => x !== f);
        };
      },
      addButton: (b) => {
        buttons.current.push(b);
        return () => {
          buttons.current = buttons.current.filter((x) => x !== b);
        };
      },
      // Nächstes Feld unterhalb suchen, fokussieren und hinscrollen, sonst den Absende-Button.
      next: (from) => {
        if (!from.view.current) return false;
        const list = fields.current.filter((f) => f.view.current && f.input.current);
        const targets = buttons.current.filter((b) => b.view.current);
        Promise.all([Promise.all(list.map((f) => measureY(f.view))), Promise.all(targets.map((b) => measureY(b.view)))]).then(
          ([ys, buttonYs]) => {
            const own = ys[list.indexOf(from)];
            const below = list
              .map((f, i) => ({ f, y: ys[i] }))
              .filter((e) => e.f !== from && e.y > own + 1)
              .sort((a, b) => a.y - b.y)[0];
            if (below) {
              below.f.input.current?.focus();
              scroll.scrollToView(below.f.view.current);
              return;
            }
            // Erst ein Button im Formular unterhalb, sonst der Haupt-Button der ActionBar (der oberste)
            const candidates = targets.map((b, i) => ({ b, y: buttonYs[i] })).filter((e) => e.y > own + 1);
            const pick = (fixed: boolean) => candidates.filter((e) => e.b.fixed === fixed).sort((a, b) => a.y - b.y)[0];
            const button = (pick(false) ?? pick(true))?.b;
            from.input.current?.blur();
            const view = button?.view.current;
            if (!button || !view) return;
            if (!button.fixed) scroll.scrollToView(view, 'end');
            focusButton(view);
          },
        );
        return true;
      },
    }),
    [scroll],
  );
}

/** Für TextField: meldet das Feld an und liefert „weiter zum nächsten Feld“. */
export function useNextField(input: RefObject<TextInput | null>, view: RefObject<View | null>) {
  const registry = useContext(FieldContext);
  const entry = useRef<FieldEntry>({ input, view }).current;
  useEffect(() => registry?.add(entry), [registry, entry]);
  return registry ? () => registry.next(entry) : undefined;
}

/** Für Button: meldet ihn als mögliches Ziel nach dem letzten Feld an. */
export function useSubmitTarget(view: RefObject<View | null>, enabled: boolean) {
  const registry = useContext(FieldContext);
  const fixed = useContext(FixedBarContext);
  const entry = useRef<ButtonEntry>({ view, fixed }).current;
  entry.fixed = fixed;
  useEffect(() => (enabled ? registry?.addButton(entry) : undefined), [registry, entry, enabled]);
}

/** Ansicht ins Bild scrollen, z. B. das Kommentarfeld, sobald die Tastatur da ist. */
export function scrollIntoView(view: View | null) {
  scrollTargets[scrollTargets.length - 1]?.scrollToView(view);
}

/** Meldet die Scrollfläche eines Screens an, solange er offen ist. */
export function NudgeScrollProvider({ value, children }: { value: ScrollTarget; children: ReactNode }) {
  const registry = useFieldRegistry(value);
  useEffect(() => {
    scrollTargets.push(value);
    return () => {
      const i = scrollTargets.indexOf(value);
      if (i >= 0) scrollTargets.splice(i, 1);
    };
  }, [value]);
  return <FieldContext.Provider value={registry}>{children}</FieldContext.Provider>;
}

export type Nudge = {
  ref: RefObject<View | null>;
  hint?: string;
  nudge: (hint: string) => void;
  clear: () => void;
};

/** Ein Feld, auf das ein deaktivierter Button zeigen kann. */
export function useNudge(): Nudge {
  const ref = useRef<View>(null);
  const [hint, setHint] = useState<string>();
  const nudge = useCallback((h: string) => {
    setHint(h);
    scrollTargets[scrollTargets.length - 1]?.scrollToView(ref.current);
  }, []);
  const clear = useCallback(() => setHint(undefined), []);
  return { ref, hint, nudge, clear };
}

/** Meldung für Buttons, die aus einem anderen Grund nicht gehen. */
export function explain(title: string, message?: string) {
  Alert.alert(title, message);
}

/**
 * Rahmen für Ziele, die kein Textfeld sind (Foto, Auswahl, Schalter): hebt sie hervor und zeigt den Hinweis darunter.
 */
export function NudgeArea({ nudge, children }: { nudge: Nudge; children: ReactNode }) {
  return (
    <View ref={nudge.ref} style={[styles.area, nudge.hint ? styles.areaActive : null]}>
      {children}
      {nudge.hint ? <Text style={styles.hint}>{nudge.hint}</Text> : null}
    </View>
  );
}

export const nudgeStyles = StyleSheet.create({
  hint: { ...text.caption, color: color.accent.primary },
});

const styles = StyleSheet.create({
  area: { gap: space[8], borderRadius: radius.md, borderWidth: stroke.thin, borderColor: 'transparent', margin: -space[8], padding: space[8] },
  areaActive: { borderColor: color.accent.primary },
  hint: nudgeStyles.hint,
});
