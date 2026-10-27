import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, size, space, stroke, isFashionable, isPlayful, playfulColor, scheme } from '../theme/tokens';
import { SvgXml } from 'react-native-svg';
import { Icon } from './icons/Icon';
import { t } from '../data/texts';
import { refreshUnread, useUnreadMessages } from '../data/chat';
import { useStore } from '../data/store';
import { PH, phXml, useIconPt } from './icons/fashionableSvgs';

export type TabKey = 'feed' | 'reise' | 'chat';

type TabBarProps = {
  active: TabKey;
  onFeedPress: () => void;
  /** Menü: Dein Konto und Einstellungen */
  onMenuPress: () => void;
  /** Fashionable Look: Kamera in der Leiste. Ohne: Feed öffnet das Erstellen. */
  onCreatePress?: () => void;
  /** Fashionable Look: Gruppen und Freund:innen. Ohne: Feed öffnet den Reiter „Gruppen“. */
  onGroupsPress?: () => void;
  /** Fashionable Look: Reiter „Gruppen“ im Feed ist offen */
  groupsActive?: boolean;
};

/**
 * Schwebende Tab-Leiste (Upgrade „Nachtschicht“): Doppelherz = Feed (Daria, 26.10.2026), Sprechblase = Chats,
 * Burger = Menü (Konto). Die Krone für „Was Du so machst“ ist raus, das Logo oben im Feed führt dorthin (UX-Audit, 27.10.2026). Die aktive Seite liegt auf einer dezenten, halbtransparenten Pille.
 * Challenge erstellen sitzt als CameraButton oben rechts.
 */
export function TabBar(props: TabBarProps) {
  return isFashionable ? <FashionTabBar {...props} /> : <KiezTabBar {...props} />;
}

/**
 * Leiste im Look „Fashionable“ nach Darias Mockup „Vorher-Nachher“ (24.10.2026): vier gleich breite Felder,
 * Haus = Feed, Kamera = Beitrag erstellen, Sprechblase mit Zeilen = Chats, Burger = Menü (Icon-Regelwerk, 24.10.2026).
 * Icons in Icon-Größe mit derselben Linie; inaktiv mit 55 % Deckkraft, aktiv voll. „Was Du so machst“ öffnet
 * das Herz oben im Feed.
 */
function FashionTabBar({ active, onFeedPress, onMenuPress, onCreatePress }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode, currentUserId } = useStore();
  const unread = useUnreadMessages();
  useEffect(() => {
    if (currentUserId) refreshUnread(currentUserId, mode === 'live').catch(() => {});
  }, [currentUserId, mode]);
  const ICON_PT = useIconPt();
  const item = (on: boolean) => ({ pressed }: { pressed: boolean }) => [styles.itemFashionable, !on && styles.off, pressed && styles.pressed];
  return (
    <View style={[styles.wrapFlat, { paddingBottom: insets.bottom }]} pointerEvents="box-none">
      <View style={styles.barFashionable} accessibilityRole="tablist">
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={t('Feed')}
          accessibilityState={{ selected: active === 'feed' }}
          onPress={onFeedPress}
          style={item(active === 'feed')}
        >
          <SvgXml xml={phXml(PH.home, color.text.primary)} width={ICON_PT} height={ICON_PT} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Challenge erstellen')}
          onPress={onCreatePress ?? (() => router.dismissTo({ pathname: '/feed', params: { erstellen: '1' } }))}
          style={item(false)}
        >
          <SvgXml xml={phXml(PH.create, color.text.primary)} width={ICON_PT} height={ICON_PT} />
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={unread ? t('Chats, {n} ungelesen', { n: unread }) : t('Chats')}
          accessibilityState={{ selected: active === 'chat' }}
          onPress={() => active !== 'chat' && router.push('/chat')}
          style={item(active === 'chat')}
        >
          <View>
            <SvgXml xml={phXml(PH.chats, color.text.primary)} width={ICON_PT} height={ICON_PT} />
            {unread ? <View style={styles.dotFashionable} /> : null}
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Menü')} onPress={onMenuPress} style={item(false)}>
          <SvgXml xml={phXml(PH.menu, color.text.primary)} width={ICON_PT} height={ICON_PT} />
        </Pressable>
      </View>
    </View>
  );
}

function KiezTabBar({ active, onFeedPress, onMenuPress }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode, currentUserId } = useStore();
  const unread = useUnreadMessages();
  useEffect(() => {
    if (currentUserId) refreshUnread(currentUserId, mode === 'live').catch(() => {});
  }, [currentUserId, mode]);
  return (
    <View
      style={isFashionable ? [styles.wrapFlat, { paddingBottom: insets.bottom }] : [styles.wrap, { bottom: Math.max(insets.bottom, space[16]) }]}
      pointerEvents="box-none"
    >
      <View style={isFashionable ? styles.barFlat : styles.bar} accessibilityRole="tablist">
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={t('Feed')}
          accessibilityState={{ selected: active === 'feed' }}
          onPress={onFeedPress}
          style={({ pressed }) => [styles.item, active === 'feed' && styles.itemActive, pressed && styles.pressed]}
        >
          <Icon name="feed" size={size.icon} color={active === 'feed' ? color.text.primary : color.text.secondary} />
        </Pressable>
        {/* Chat und Freund:innen (Daria, 22.10.2026) */}
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={unread ? t('Chats, {n} ungelesen', { n: unread }) : t('Chats')}
          accessibilityState={{ selected: active === 'chat' }}
          onPress={() => active !== 'chat' && router.push('/chat')}
          style={({ pressed }) => [styles.item, active === 'chat' && styles.itemActive, pressed && styles.pressed]}
        >
          <View>
            <Icon name="message" size={size.icon} color={active === 'chat' ? color.text.primary : color.text.secondary} />
            {unread ? <View style={styles.dot} /> : null}
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Menü')}
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
      accessibilityLabel={t('Challenge erstellen')}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.camera, isFashionable && styles.cameraFlat, { top: insets.top + space[8] }, pressed && styles.pressed]}
    >
      <Icon name="camera" size={24} color={isFashionable ? color.text.primary : color.bg.screen} />
    </Pressable>
  );
}

/** Platz unter Listen, damit die schwebende Leiste nichts verdeckt. */
export const TAB_BAR_SPACE = 96;

/** Breite der Kamera oben rechts; feed.tsx rückt die Pille um so viel ein */
export const CAMERA_W = 76;

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
    ...(isPlayful ? { borderWidth: 1.5, borderBottomWidth: 3, borderColor: playfulColor.border } : null),
  },
  item: {
    width: 56,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Aktive Seite: dezente helle Fläche, damit der Kater nicht auf Weiß liegt
  itemActive: {
    backgroundColor: isFashionable ? 'transparent' : isPlayful ? playfulColor.tint : scheme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(240, 240, 240, 0.14)',
  },
  camera: {
    position: 'absolute',
    right: space[16],
    // Querformat in Höhe und Form der Pille daneben (Daria, 22.10.2026): 4 + 40 + 4
    width: CAMERA_W,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: color.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Pausenhof: 3D-Kante wie die Knöpfe
    ...(isPlayful ? { borderBottomWidth: 4, borderBottomColor: playfulColor.edgePrimary } : null),
  },
  pressed: { opacity: 0.7 },
  // Look „Fashionable“: Leiste über die ganze Breite am unteren Rand, Haarlinie oben, keine Pille
  wrapFlat: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.bg.screen,
    borderTopWidth: stroke.ultraThin,
    borderTopColor: color.line.hairline,
  },
  barFlat: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: space[2] },
  // Erstellen als schlichtes Icon ohne Fläche
  cameraFlat: { backgroundColor: 'transparent', width: 48 },
  // Mockup: 72 hoch mit Home-Balken, Icons 12 unter der Haarlinie
  barFashionable: { flexDirection: 'row', height: 50 },
  off: { opacity: 0.55 },
  itemFashionable: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dotFashionable: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.accent.affection,
  },
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
