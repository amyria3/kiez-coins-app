import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AccessibilityInfo, Alert, Dimensions, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from './T';

import { revealDelta, revealInBrowser, visibleSpan } from '../data/reveal.mjs';
import { color, radius, space, stroke, text } from '../theme/tokens';
import { keyboardMetrics } from './keyboardMetrics';

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
type ScrollTarget = {
  scrollToView: (view: View | null, align?: ScrollAlign) => void;
  /** Führt `change` aus und hält die Ansicht dabei an ihrer Stelle auf dem Bildschirm. */
  holdView: (view: View | null, change: () => void) => void;
  /** iPhone und Android: aktives Feld und nächstes Feld nach der Regel in data/reveal.mjs ins Bild holen */
  revealField: (field: View, next: View | null) => void;
};

/**
 * Scrollflächen der offenen Screens mit ihren Formularfeldern, die jüngste oben. Die Screen-Komponente ruft useNudge()
 * außerhalb ihres SubScreen auf, deshalb läuft das über diese Liste und nicht über einen React-Kontext.
 */
const scrollTargets: { scroll: ScrollTarget; fields: FieldRegistry }[] = [];
const topTarget = () => scrollTargets[scrollTargets.length - 1];

const measureSpan = (view: View) =>
  new Promise<{ top: number; bottom: number }>((resolve) => view.measureInWindow((_x, y, _w, h) => resolve({ top: y, bottom: y + h })));

/** Browser: Feld mit Fokus, das die Tastatur öffnet */
function focusedEditable(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const el = document.activeElement as HTMLElement | null;
  if (!el) return null;
  if (el.tagName === 'INPUT') return /^(button|checkbox|color|file|hidden|image|radio|range|reset|submit)$/.test((el as HTMLInputElement).type) ? null : el;
  return el.tagName === 'TEXTAREA' || el.isContentEditable ? el : null;
}

/** Für Screens mit ScrollView: stellt bereit, dass Felder sich ins Bild scrollen lassen. */
export function useNudgeScroll(scrollRef: RefObject<ScrollView | null>) {
  const offset = useRef(0);
  const scrollToView = useCallback(
    (view: View | null, align: ScrollAlign = 'start') => {
      const scroll = scrollRef.current;
      if (!view || !scroll) return;
      // Steht in der Ansicht ein Feld mit offener Tastatur (aufgeklapptes Formular mit autoFocus), gilt die eine Regel
      // für Felder. Zwei Scrolls nacheinander liefen sonst gegeneinander (Daria, 2026-11-23, Visitenkarte).
      const active = Platform.OS === 'web' ? focusedEditable() : null;
      if (active && (view as unknown as HTMLElement).contains?.(active)) {
        revealFocused();
        return;
      }
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
  const holdView = useCallback(
    (view: View | null, change: () => void) => {
      const scroll = scrollRef.current;
      if (!view || !scroll) return change();
      // Erst messen, dann ändern: Das Messen läuft nicht sofort, sonst stünde der neue Inhalt schon da
      view.measureInWindow((_x, before) => {
        change();
        const restore = () =>
          view.measureInWindow((_x2, after) => {
            const delta = after - before;
            if (Math.abs(delta) < 1) return;
            offset.current = Math.max(0, offset.current + delta);
            scroll.scrollTo({ y: offset.current, animated: false });
          });
        // Einmal gleich nach dem neuen Layout, einmal später, falls noch etwas nachlädt
        setTimeout(restore, 50);
        setTimeout(restore, 400);
      });
    },
    [scrollRef],
  );
  const revealField = useCallback(
    (field: View, next: View | null) => {
      const scroll = scrollRef.current;
      if (!scroll) return;
      Promise.all([measureSpan(field), next ? measureSpan(next) : null, measureSpan(scroll as unknown as View)]).then(
        ([f, n, s]) => {
          // Die Tastatur verdeckt alles unterhalb von Bildschirmhöhe minus Tastaturhöhe
          const screen = Dimensions.get('window').height;
          const delta = revealDelta(f, visibleSpan(s, { top: 0, bottom: screen - keyboardMetrics.height }), n);
          if (Math.abs(delta) < 1) return;
          scroll.scrollTo({ y: Math.max(0, offset.current + delta), animated: true });
        },
      );
    },
    [scrollRef],
  );
  const onScroll = useCallback((y: number) => {
    offset.current = y;
  }, []);
  return useMemo(() => ({ scrollToView, holdView, revealField, onScroll }), [scrollToView, holdView, revealField, onScroll]);
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
  /** Angemeldetes Feld zu einem Eingabeelement und das Feld direkt darunter */
  locate: (input: unknown) => Promise<{ field: FieldEntry; below: FieldEntry | null } | null>;
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
              // Die Tastatur bleibt offen, also meldet sie sich nicht neu: hier selbst ins Bild holen
              revealFocused();
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
      locate: async (input) => {
        const list = fields.current.filter((f) => f.view.current && f.input.current);
        const field = list.find((f) => f.input.current === input);
        if (!field) return null;
        const ys = await Promise.all(list.map((f) => measureY(f.view)));
        const own = ys[list.indexOf(field)];
        const below = list
          .map((f, i) => ({ f, y: ys[i] }))
          .filter((e) => e.f !== field && e.y > own + 1)
          .sort((a, b) => a.y - b.y)[0];
        return { field, below: below?.f ?? null };
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

/**
 * Ansicht ins Bild scrollen, z. B. das Kommentarfeld, sobald die Tastatur da ist.
 * `end`: nur so weit, dass sie unten ganz zu sehen ist (Keyboard.tsx, aktives Feld über der Tastatur).
 */
export function scrollIntoView(view: View | null, align?: ScrollAlign) {
  topTarget()?.scroll.scrollToView(view, align);
}

/**
 * Das aktive Feld ins Bild holen, nach der einen Regel in data/reveal.mjs (Daria, 2026-11-23): Beschriftung, Feld und
 * das nächste Feld darunter stehen mit Luft über der Tastatur. Aufgerufen, sobald die Tastatur steht (Keyboard.tsx),
 * beim Sprung ins nächste Feld und beim Aufklappen eines Formulars. Felder außerhalb von TextField (Kommentare, Chat,
 * Suche) kommen ohne nächstes Feld ins Bild.
 */
export function revealFocused() {
  const input = Platform.OS === 'web' ? focusedEditable() : TextInput.State.currentlyFocusedInput();
  if (!input) return;
  const target = topTarget();
  (target?.fields.locate(input) ?? Promise.resolve(null)).then((found) => {
    const field = (found?.field.view.current ?? input) as unknown as View;
    const next = found?.below?.view.current ?? null;
    if (Platform.OS === 'web') revealInBrowser(field as unknown as HTMLElement, next as unknown as HTMLElement | null, keyboardMetrics.safeTop);
    else target?.scroll.revealField(field, next);
  });
}


/**
 * Ansicht an ihrer Stelle auf dem Bildschirm halten, während sich darüber etwas ändert, z. B. das Kommentarfeld
 * nach dem Abschicken (Daria, 2026-11-09). `change` führt die Änderung aus.
 */
export function holdInView(view: View | null, change: () => void) {
  const target = topTarget();
  if (target) target.scroll.holdView(view, change);
  else change();
}

/** Meldet die Scrollfläche eines Screens an, solange er offen ist. */
export function NudgeScrollProvider({ value, children }: { value: ScrollTarget; children: ReactNode }) {
  const registry = useFieldRegistry(value);
  useEffect(() => {
    const entry = { scroll: value, fields: registry };
    scrollTargets.push(entry);
    return () => {
      const i = scrollTargets.indexOf(entry);
      if (i >= 0) scrollTargets.splice(i, 1);
    };
  }, [value, registry]);
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
    topTarget()?.scroll.scrollToView(ref.current);
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

// Fehlende Pflichtangaben in der Fehlerfarbe (Daria, 2026-11-12 und 13.11.: „Fehlermeldung“), nicht mehr im Lila
export const nudgeStyles = StyleSheet.create({
  hint: { ...text.caption, color: color.accent.error },
});

const styles = StyleSheet.create({
  area: { gap: space[8], borderRadius: radius.md, borderWidth: stroke.thin, borderColor: 'transparent', margin: -space[8], padding: space[8] },
  areaActive: { borderColor: color.accent.error },
  hint: nudgeStyles.hint,
});
