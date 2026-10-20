import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, size, space, stroke } from '../theme/tokens';
import { Cat } from './icons/Brand';
import { Icon } from './icons/Icon';

export type TabKey = 'feed' | 'reise';

type TabBarProps = {
  active: TabKey;
  onFeedPress: () => void;
  onReisePress: () => void;
  /** Langes Drücken auf den Kater öffnet das Demo-Menü (nur Prototyp) */
  onReiseLongPress?: () => void;
  /** Menü: Dein Konto und Einstellungen */
  onMenuPress: () => void;
  /** Punkt am Kater: Bei einer Deiner Challenges bist Du dran. */
  hasTasks?: boolean;
};

/**
 * Schwebende Tab-Leiste (Upgrade „Nachtschicht“): Stecknadel = Feed, Kater = Deine Reise,
 * Burger = Menü (Konto). Die aktive Seite liegt auf einer dezenten, halbtransparenten Pille.
 * Challenge erstellen sitzt als CameraButton oben rechts.
 */
export function TabBar({ active, onFeedPress, onReisePress, onReiseLongPress, onMenuPress, hasTasks }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, space[16]) }]} pointerEvents="box-none">
      <View style={styles.bar} accessibilityRole="tablist">
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Feed"
          accessibilityState={{ selected: active === 'feed' }}
          onPress={onFeedPress}
          style={({ pressed }) => [styles.item, active === 'feed' && styles.itemActive, pressed && styles.pressed]}
        >
          <Icon name="map-pin" size={size.icon} color={active === 'feed' ? color.text.primary : color.text.secondary} />
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={hasTasks ? 'Deine Reise, Du bist dran' : 'Deine Reise'}
          accessibilityState={{ selected: active === 'reise' }}
          onPress={onReisePress}
          onLongPress={onReiseLongPress}
          style={({ pressed }) => [styles.item, active === 'reise' && styles.itemActive, pressed && styles.pressed]}
        >
          <View>
            <Cat height={22} />
            {hasTasks ? <View style={styles.dot} /> : null}
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Menü"
          onPress={onMenuPress}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
        >
          <Icon name="burger" size={size.icon} color={color.text.secondary} />
        </Pressable>
      </View>
    </View>
  );
}

/** Kamera oben rechts: bleibt beim Scrollen stehen und erstellt eine Challenge. */
export function CameraButton({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Challenge erstellen"
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.camera, { top: insets.top + space[8] }, pressed && styles.pressed]}
    >
      <Icon name="camera" size={size.icon} color={color.bg.screen} />
    </Pressable>
  );
}

/** Platz unter Listen, damit die schwebende Leiste nichts verdeckt. */
export const TAB_BAR_SPACE = 96;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    gap: space[6],
    padding: space[6],
    borderRadius: radius.full,
    backgroundColor: color.bg.glass,
    borderWidth: stroke.ultraThin,
    borderColor: color.line.hairline,
  },
  item: {
    width: 56,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Aktive Seite: dezente helle Fläche, damit der Kater nicht auf Weiß liegt
  itemActive: { backgroundColor: 'rgba(240, 240, 240, 0.14)' },
  camera: {
    position: 'absolute',
    right: space[16],
    width: 52,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: color.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  dot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.accent.signal,
    borderWidth: stroke.thin,
    borderColor: color.bg.screen,
  },
});
