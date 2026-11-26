import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { t } from '../data/texts';
import { color, size, space, text } from '../theme/tokens';
import { FloatingMenu, type Rect } from './FloatingMenu';
import { Icon } from './icons/Icon';
import { Text } from './T';

export type ManageItem = { label: string; onPress: () => void };

/**
 * „Verwalten“ im Schaufenster (Daria, 2026-11-11): kleiner Knopf, öffnet ein Menü mit Post erstellen, Termin
 * erstellen und Schaufenster bearbeiten. Steht rechts in der Kopfzeile und ganz unten auf der Seite. Das Menü klappt
 * dahin auf, wo Platz ist (FloatingMenu).
 */
/** `dots`: drei Punkte statt „Verwalten“, z. B. auf den Aufgaben-Karten der Routine (Daria, 2026-11-13); Farbe der Punkte */
export function ManageButton({
  items,
  style,
  dots,
  label = 'Schaufenster verwalten',
  openRef,
}: {
  items: ManageItem[];
  style?: object;
  dots?: string;
  label?: string;
  /** Öffnet das Menü von außen, z. B. beim Tippen auf eine erledigte Karte (Daria, 2026-11-13) */
  openRef?: { current: (() => void) | null };
}) {
  const button = useRef<View>(null);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const open = () => button.current?.measureInWindow((x, y, w, h) => setAnchor({ x, y, w, h }));
  if (openRef) openRef.current = open;
  const close = () => setAnchor(null);
  if (!items.length) return null;
  return (
    <>
      <View ref={button} collapsable={false} style={style}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(label)}
          hitSlop={8}
          onPress={open}
          style={({ pressed }) => [dots ? styles.dots : styles.button, pressed && styles.pressed]}
        >
          {dots ? <Icon name="more" color={dots} size={14} /> : <Text style={styles.label}>Verwalten</Text>}
        </Pressable>
      </View>
      <Modal visible={!!anchor} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('Menü schließen')} />
        {anchor ? (
          <FloatingMenu anchor={anchor} minWidth={220}>
            {items.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="menuitem"
                onPress={() => {
                  close();
                  item.onPress();
                }}
                style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
              >
                <Text style={styles.menuText}>{item.label}</Text>
              </Pressable>
            ))}
          </FloatingMenu>
        ) : null}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: size.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: space[12],
  },
  dots: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  label: { ...text.captionStrong, color: color.text.primary, textDecorationLine: 'underline' },
  pressed: { opacity: 0.6 },
  menuItem: { position: 'relative', minHeight: size.touchTarget, justifyContent: 'center', paddingHorizontal: space[16] },
  menuText: { ...text.bodyLarge, color: color.text.primary },
});
