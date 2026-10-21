import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

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

type ScrollTarget = { scrollToView: (view: View | null) => void };

/**
 * Scrollflächen der offenen Screens, die jüngste oben. Die Screen-Komponente ruft useNudge() außerhalb
 * ihres SubScreen auf, deshalb läuft das über diese Liste und nicht über einen React-Kontext.
 */
const scrollTargets: ScrollTarget[] = [];

/** Für Screens mit ScrollView: stellt bereit, dass Felder sich ins Bild scrollen lassen. */
export function useNudgeScroll(scrollRef: RefObject<ScrollView | null>) {
  const offset = useRef(0);
  const scrollToView = useCallback(
    (view: View | null) => {
      const scroll = scrollRef.current;
      if (!view || !scroll) return;
      // Lage des Felds relativ zur ScrollView berechnen, dann mit etwas Luft darüber hinscrollen
      const scrollNode = scroll as unknown as View;
      view.measureInWindow((_x, viewY) => {
        scrollNode.measureInWindow((_sx, scrollY) => {
          scroll.scrollTo({ y: Math.max(0, offset.current + (viewY - scrollY) - space[24]), animated: true });
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

/** Meldet die Scrollfläche eines Screens an, solange er offen ist. */
export function NudgeScrollProvider({ value, children }: { value: ScrollTarget; children: ReactNode }) {
  useEffect(() => {
    scrollTargets.push(value);
    return () => {
      const i = scrollTargets.indexOf(value);
      if (i >= 0) scrollTargets.splice(i, 1);
    };
  }, [value]);
  return <>{children}</>;
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
