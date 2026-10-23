import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, size, space, stroke, isInstagram } from '../theme/tokens';
import { SvgXml } from 'react-native-svg';
import { Icon } from './icons/Icon';
import { CrownIcon } from './icons/Brand';
import { t } from '../data/texts';
import { refreshUnread, useUnreadMessages } from '../data/chat';
import { useStore } from '../data/store';
import { Avatar } from './AuthorRow';
import { CAMERA_PLUS, HOME, LINE, LINE_STRONG, PEOPLE, PLANE, line, strokeFor, useIconPt } from './icons/instagramSvgs';

/** Krone als Linie für den Look „Instagram“ */
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
  /** Instagram-Look: Kamera in der Leiste. Ohne: Feed öffnet das Erstellen. */
  onCreatePress?: () => void;
  /** Instagram-Look: Gruppen und Freund:innen. Ohne: Feed öffnet den Reiter „Gruppen“. */
  onGroupsPress?: () => void;
  /** Instagram-Look: Reiter „Gruppen“ im Feed ist offen */
  groupsActive?: boolean;
};

/**
 * Schwebende Tab-Leiste (Upgrade „Nachtschicht“): Stecknadel = Feed, Krone = Was Du so machst,
 * Burger = Menü (Konto). Die aktive Seite liegt auf einer dezenten, halbtransparenten Pille.
 * Challenge erstellen sitzt als CameraButton oben rechts.
 */
export function TabBar(props: TabBarProps) {
  return isInstagram ? <InstaTabBar {...props} /> : <KiezTabBar {...props} />;
}

/**
 * Leiste im Look „Instagram“ (Daria, 23.10.2026): fünf gleich breite Felder über die ganze Breite, 50 pt hoch,
 * Icons 24 pt. Haus = Feed, zwei Personen = Gruppen und Freund:innen, Kamera mit Plus = Beitrag erstellen (Mitte),
 * Papierflieger = Chats, eigenes Bild = Profil („Was Du so machst“). Das Menü sitzt oben rechts im Profil.
 * Aktiv: Haus und Personen gefüllt, Papierflieger kräftiger, Profilbild mit schwarzem Ring.
 */
function InstaTabBar({ active, onFeedPress, onReisePress, onReiseLongPress, hasTasks, onCreatePress, onGroupsPress, groupsActive }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode, currentUserId, users } = useStore();
  const unread = useUnreadMessages();
  useEffect(() => {
    if (currentUserId) refreshUnread(currentUserId, mode === 'live').catch(() => {});
  }, [currentUserId, mode]);
  const me = users.find((u) => u.id === currentUserId);
  const ICON_PT = useIconPt();
  const feedActive = active === 'feed' && !groupsActive;
  const groupsOn = active === 'feed' && !!groupsActive;
  const c = color.text.primary;
  const svg = (body: string, strong?: boolean) =>
    line(c, body, strokeFor(ICON_PT, strong ? LINE_STRONG : LINE));
  const filled = (body: string) => svg(body.replace('/>', ` fill="${c}"/>`));
  return (
    <View style={[styles.wrapFlat, { paddingBottom: insets.bottom }]} pointerEvents="box-none">
      <View style={styles.barInsta} accessibilityRole="tablist">
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={t('Feed')}
          accessibilityState={{ selected: feedActive }}
          onPress={onFeedPress}
          style={({ pressed }) => [styles.itemInsta, pressed && styles.pressed]}
        >
          <SvgXml xml={feedActive ? filled(HOME) : svg(HOME)} width={ICON_PT} height={ICON_PT} />
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={t('Gruppen und Freund:innen')}
          accessibilityState={{ selected: groupsOn }}
          onPress={onGroupsPress ?? (() => router.dismissTo({ pathname: '/feed', params: { reiter: 'gruppen' } }))}
          style={({ pressed }) => [styles.itemInsta, pressed && styles.pressed]}
        >
          <SvgXml xml={svg(PEOPLE, groupsOn)} width={ICON_PT} height={ICON_PT} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Challenge erstellen')}
          onPress={onCreatePress ?? (() => router.dismissTo({ pathname: '/feed', params: { erstellen: '1' } }))}
          style={({ pressed }) => [styles.itemInsta, pressed && styles.pressed]}
        >
          <SvgXml xml={svg(CAMERA_PLUS)} width={ICON_PT} height={ICON_PT} />
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={unread ? t('Chats, {n} ungelesen', { n: unread }) : t('Chats')}
          accessibilityState={{ selected: active === 'chat' }}
          onPress={() => active !== 'chat' && router.push('/chat')}
          style={({ pressed }) => [styles.itemInsta, pressed && styles.pressed]}
        >
          <View>
            <SvgXml xml={svg(PLANE, active === 'chat')} width={ICON_PT} height={ICON_PT} />
            {unread ? <View style={styles.dotInsta} /> : null}
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={hasTasks ? t('Was Du so machst, Du bist dran') : t('Was Du so machst')}
          accessibilityState={{ selected: active === 'reise' }}
          onPress={onReisePress}
          onLongPress={onReiseLongPress}
          style={({ pressed }) => [styles.itemInsta, pressed && styles.pressed]}
        >
          <View style={[styles.me, { width: ICON_PT + 6, height: ICON_PT + 6, borderRadius: (ICON_PT + 6) / 2 }, active === 'reise' && styles.meActive]}>
            {me ? <Avatar user={me} diameter={ICON_PT} /> : <SvgXml xml={svg(PEOPLE)} width={ICON_PT} height={ICON_PT} />}
          </View>
          {hasTasks ? <View style={styles.dotInsta} /> : null}
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
      style={isInstagram ? [styles.wrapFlat, { paddingBottom: insets.bottom }] : [styles.wrap, { bottom: Math.max(insets.bottom, space[16]) }]}
      pointerEvents="box-none"
    >
      <View style={isInstagram ? styles.barFlat : styles.bar} accessibilityRole="tablist">
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
            {isInstagram ? (
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
      style={({ pressed }) => [styles.camera, isInstagram && styles.cameraFlat, { top: insets.top + space[8] }, pressed && styles.pressed]}
    >
      <Icon name="camera" size={24} color={isInstagram ? color.text.primary : color.bg.screen} />
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
  itemActive: { backgroundColor: isInstagram ? 'transparent' : 'rgba(240, 240, 240, 0.14)' },
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
  // Look „Instagram“: Leiste über die ganze Breite am unteren Rand, Haarlinie oben, keine Pille
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
  barInsta: { flexDirection: 'row', height: 54 },
  itemInsta: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Profilbild so groß wie die Icons; aktiv mit 1,5 pt schwarzem Ring und 1,5 pt Luft
  me: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  meActive: { borderColor: color.text.primary },
  dotInsta: {
    position: 'absolute',
    top: 8,
    right: '30%',
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
