import { useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { t } from '../data/texts';
import { color, radius, scheme, size, space, stroke, text } from '../theme/tokens';
import { Icon } from './icons/Icon';
import { Text } from './T';

export type ManageItem = { label: string; onPress: () => void };

/**
 * „Verwalten“ im Schaufenster (Daria, 2026-11-11): kleiner Knopf, öffnet ein Menü mit Post erstellen, Termin
 * erstellen und Schaufenster bearbeiten. Steht rechts in der Kopfzeile und ganz unten auf der Seite. Unten in der
 * Hälfte des Bildschirms klappt das Menü nach oben auf.
 */
/** `dots`: drei Punkte statt „Verwalten“, z. B. auf den Aufgaben-Karten der Routine (Daria, 2026-11-13); Farbe der Punkte */
export function ManageButton({ items, style, dots, label = 'Schaufenster verwalten' }: { items: ManageItem[]; style?: object; dots?: string; label?: string }) {
  const button = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const { width, height } = useWindowDimensions();
  const close = () => setAnchor(null);
  if (!items.length) return null;
  const below = anchor ? anchor.y < height / 2 : true;
  return (
    <>
      <View ref={button} collapsable={false} style={style}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(label)}
          hitSlop={8}
          onPress={() => button.current?.measureInWindow((x, y, w, h) => setAnchor({ x, y, w, h }))}
          style={({ pressed }) => [dots ? styles.dots : styles.button, pressed && styles.pressed]}
        >
          {dots ? <Icon name="more" color={dots} size={14} /> : <Text style={styles.label}>Verwalten</Text>}
        </Pressable>
      </View>
      <Modal visible={!!anchor} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('Menü schließen')} />
        {anchor ? (
          <View
            style={[
              styles.menu,
              below ? { top: anchor.y + anchor.h + space[4] } : { bottom: height - anchor.y + space[4] },
              { right: Math.max(space[8], width - anchor.x - anchor.w) },
            ]}
            accessibilityRole="menu"
          >
            <BlurView intensity={40} tint={scheme} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={[StyleSheet.absoluteFill, styles.menuTint]} pointerEvents="none" />
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
          </View>
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
  menu: {
    position: 'absolute',
    minWidth: 220,
    borderRadius: radius.lg,
    borderWidth: stroke.ultraThin,
    borderColor: color.line.hairline,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  menuTint: { backgroundColor: color.bg.menu },
  menuItem: { position: 'relative', minHeight: size.touchTarget, justifyContent: 'center', paddingHorizontal: space[16] },
  menuText: { ...text.bodyLarge, color: color.text.primary },
});
