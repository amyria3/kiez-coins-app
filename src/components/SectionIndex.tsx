import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, Pressable, StyleSheet, View, type Text as RNText } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { color, radius, size, space, text } from '../theme/tokens';
import { useAccentColor } from '../theme/signal';
import { isRtl, t } from '../data/texts';
import { Frost } from './Glass';
import { phXml } from './icons/phosphor';
import { scrollIntoView } from './Nudge';
import { Text } from './T';

/**
 * Schnellsprung zu den Abschnitten einer Seite (Daria, 2026-11-18): Rechts im Kopf sitzt ein kleines Listen-Icon,
 * und auch ein Tipp auf den Seitentitel öffnet eine knappe Liste der Abschnitte. Ein Tipp auf einen Eintrag
 * scrollt dorthin, ein Tipp daneben schließt die Liste.
 *
 * Die Liste pflegt niemand von Hand: Jede Abschnittsüberschrift (`FieldGroup heading` in Content.tsx) meldet sich
 * hier mit ihrem Text an. So zeigt die Liste immer genau die Überschriften, die auf der Seite stehen, in derselben
 * Reihenfolge und Sprache. Abschnitte, die gerade nicht da sind, fehlen auch in der Liste.
 * `SubScreen` (Screen.tsx) stellt das bereit, `NavigationBar` zeigt Icon und Liste ab zwei Abschnitten.
 */

/** Die Überschrift selbst ist das Sprungziel */
type Entry = { key: number; title: string; view: RefObject<RNText | null> };
type Registry = { entries: Entry[]; add: (entry: Entry) => () => void; update: (key: number, title: string) => void };

const SectionIndexContext = createContext<Registry | null>(null);

/** Ab so vielen Abschnitten lohnt sich der Sprung */
const MIN_SECTIONS = 2;

export function SectionIndexProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const add = useCallback((entry: Entry) => {
    setEntries((list) => [...list, entry]);
    return () => setEntries((list) => list.filter((e) => e.key !== entry.key));
  }, []);
  const update = useCallback((key: number, title: string) => {
    setEntries((list) => list.map((e) => (e.key === key && e.title !== title ? { ...e, title } : e)));
  }, []);
  const value = useMemo(() => ({ entries, add, update }), [entries, add, update]);
  return <SectionIndexContext.Provider value={value}>{children}</SectionIndexContext.Provider>;
}

let nextKey = 1;

/** Für Abschnittsüberschriften: meldet den Abschnitt mit seinem Titel an und liefert die Ref für den Sprung. */
export function useSectionHeading(title: string, enabled: boolean): RefObject<RNText | null> {
  const registry = useContext(SectionIndexContext);
  const view = useRef<RNText>(null);
  const key = useRef(0);
  const add = registry?.add;
  const update = registry?.update;
  useEffect(() => {
    if (!enabled || !add) return;
    key.current = nextKey++;
    return add({ key: key.current, title, view });
    // Der Titel ändert sich über `update`, ohne den Abschnitt neu anzumelden
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, add]);
  useEffect(() => {
    if (enabled && update && key.current) update(key.current, title);
  }, [enabled, update, title]);
  return view;
}

/** Für den Kopf: die angemeldeten Abschnitte, oder `null`, wenn sich die Liste nicht lohnt */
export function useSectionIndex(): Entry[] | null {
  const registry = useContext(SectionIndexContext);
  if (!registry || registry.entries.length < MIN_SECTIONS) return null;
  return registry.entries;
}

/** Listen-Icon rechts im Kopf. Eigene Bedeutung „Abschnitte dieser Seite“, nicht das Menü (Icon-Regelwerk). */
export function SectionIndexButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('Abschnitte dieser Seite')}
      hitSlop={4}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <SvgXml xml={phXml('list-bullets', color.text.primary)} width={ICON} height={ICON} />
    </Pressable>
  );
}

type Measured = { entry: Entry; y: number };

/**
 * Die Liste unter dem Kopf: leicht und knapp, bewusst nicht wie die Zeilen einer Einstellungsseite. Keine Karten,
 * keine Icons, keine Pfeile. Eine feine Linie links wie ein Inhaltsverzeichnis, der Abschnitt, in dem man gerade
 * ist, trägt die Akzentfarbe des Bereichs.
 */
export function SectionIndexMenu({
  entries,
  anchor,
  onClose,
}: {
  entries: Entry[];
  /** Unterkante des Kopfs im Fenster */
  anchor: number;
  onClose: () => void;
}) {
  const accent = useAccentColor();
  const [items, setItems] = useState<Measured[] | null>(null);
  const appear = useRef(new Animated.Value(0)).current;

  // Lage aller Überschriften messen: Reihenfolge wie auf der Seite, und welcher Abschnitt gerade oben steht
  useEffect(() => {
    let alive = true;
    Promise.all(
      entries.map(
        (entry) =>
          new Promise<Measured | null>((resolve) => {
            const view = entry.view.current;
            if (!view) return resolve(null);
            view.measureInWindow((_x, y, w, h) => resolve(w || h ? { entry, y } : null));
          }),
      ),
    ).then((list) => {
      if (alive) setItems(list.filter((m): m is Measured => !!m).sort((a, b) => a.y - b.y));
    });
    return () => {
      alive = false;
    };
  }, [entries]);

  useEffect(() => {
    let reduce = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => (reduce = v))
      .catch(() => {})
      .finally(() =>
        Animated.timing(appear, {
          toValue: 1,
          duration: reduce ? 0 : 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(),
      );
  }, [appear]);

  // Aktuell: die letzte Überschrift, die schon im oberen Drittel unter dem Kopf steht
  const current = items ? items.filter((m) => m.y <= anchor + CURRENT_ZONE).pop()?.entry.key : undefined;

  const jump = (entry: Entry) => {
    onClose();
    // Erst nach dem Schließen scrollen, sonst misst die Seite unter der offenen Liste
    setTimeout(() => scrollIntoView(entry.view.current as unknown as View | null), 0);
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Tipp außerhalb schließt (UX-Regeln, Navigation) */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('Schließen')} />
      <Animated.View
        style={[
          styles.wrap,
          // Unter dem Icon: rechts, in Arabisch und Hebräisch links
          isRtl() ? { top: anchor, left: space[12] } : { top: anchor, right: space[12] },
          { opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] },
        ]}
        pointerEvents="box-none"
      >
        <Frost style={styles.card} contentStyle={styles.cardContent}>
          <Text style={styles.caption}>Auf dieser Seite</Text>
          <View accessibilityRole="menu">
            {(items ?? []).map(({ entry }) => {
              const active = entry.key === current;
              return (
                <Pressable
                  key={entry.key}
                  onPress={() => jump(entry)}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                >
                  <View style={[styles.rail, active && { backgroundColor: accent }]} />
                  <Text style={[styles.itemText, active && { color: accent }]} numberOfLines={2}>
                    {entry.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Frost>
      </Animated.View>
    </Modal>
  );
}

const ICON = 22;
/** Bis hierhin unter dem Kopf gilt ein Abschnitt als der, in dem man gerade ist */
const CURRENT_ZONE = 160;

const styles = StyleSheet.create({
  button: { width: size.touchTarget, height: size.touchTarget, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  wrap: { position: 'absolute' },
  card: {
    minWidth: 200,
    maxWidth: 280,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line.hairline,
  },
  cardContent: { paddingVertical: space[12], paddingHorizontal: space[16], gap: space[6] },
  caption: { ...text.captionStrong, color: color.text.secondary },
  item: { flexDirection: 'row', alignItems: 'center', minHeight: size.touchTarget, gap: space[12] },
  rail: { alignSelf: 'stretch', width: 2, borderRadius: 1, backgroundColor: color.line.hairline },
  itemText: { ...text.bodySm, color: color.text.primary, flexShrink: 1, paddingVertical: space[6] },
});
