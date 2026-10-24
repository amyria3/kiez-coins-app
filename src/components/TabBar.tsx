import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, size, space, stroke, isFashionable } from '../theme/tokens';
import { SvgXml } from 'react-native-svg';
import { Icon } from './icons/Icon';
import { CrownIcon } from './icons/Brand';
import { t } from '../data/texts';
import { refreshUnread, useUnreadMessages } from '../data/chat';
import { useStore } from '../data/store';
import { PH, phXml, useIconPt } from './icons/fashionableSvgs';

/** Krone als Linie für den Look „Fashionable“ */
const crownLine = (c: string) =>
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="${c}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M3.5 8 8 12l4-6.5 4 6.5 4.5-4-1.8 10.5H5.3z"/><path d="M5.5 21h13"/></svg>`;

export type TabKey = 'feed' | 'reise' | 'chat';

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
  /** Fashionable Look: Kamera in der Leiste. Ohne: Feed öffnet das Erstellen. */
  onCreatePress?: () => void;
  /** Fashionable Look: Gruppen und Freund:innen. Ohne: Feed öffnet den Reiter „Gruppen“. */
  onGroupsPress?: () => void;
  /** Fashionable Look: Reiter „Gruppen“ im Feed ist offen */
  groupsActive?: boolean;
};

/**
 * Schwebende Tab-Leiste (Upgrade „Nachtschicht“): Stecknadel = Feed, Krone = Was Du so machst,
 * Burger = Menü (Konto). Die aktive Seite liegt auf einer dezenten, halbtransparenten Pille.
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
  const item = (on: boolean) => ({ pressed }: { pressed: boolean }) => [styles.itemInsta, !on && styles.off, pressed && styles.pressed];
  return (
    <View style={[styles.wrapFlat, { paddingBottom: insets.bottom }]} pointerEvents="box-none">
      <View style={styles.barInsta} accessibilityRole="tablist">
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
            {unread ? <View style={styles.dotInsta} /> : null}
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Menü')} onPress={onMenuPress} style={item(false)}>
          <SvgXml xml={phXml(PH.menu, color.text.primary)} width={ICON_PT} height={ICON_PT} />
        </Pressable>
      </View>
    </View>
  );
}

function KiezTabBar({ active, onFeedPress, onReisePress, onReiseLongPress, onMenuPress, hasTasks }: TabBarProps) {
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
          <Icon name="map-pin" size={size.icon} color={active === 'feed' ? color.text.primary : color.text.secondary} />
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={hasTasks ? t('Was Du so machst, Du bist dran') : t('Was Du so machst')}
          accessibilityState={{ selected: active === 'reise' }}
          onPress={onReisePress}
          onLongPress={onReiseLongPress}
          style={({ pressed }) => [styles.item, active === 'reise' && styles.itemActive, pressed && styles.pressed]}
        >
          <View>
            {isFashionable ? (
              <SvgXml xml={crownLine(active === 'reise' ? color.text.primary : color.text.secondary)} width={25} height={25} />
            ) : (
              <CrownIcon height={26} />
            )}
            {hasTasks ? <View style={styles.dot} /> : null}
          </View>
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
  },
  item: {
    width: 56,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Aktive Seite: dezente helle Fläche, damit der Kater nicht auf Weiß liegt
  itemActive: { backgroundColor: isFashionable ? 'transparent' : 'rgba(240, 240, 240, 0.14)' },
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
  barInsta: { flexDirection: 'row', height: 50 },
  off: { opacity: 0.55 },
  itemInsta: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dotInsta: {
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
