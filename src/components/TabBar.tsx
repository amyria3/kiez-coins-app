import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFrontSpace } from '../theme/signal';
import { color, radius, size, space, stroke } from '../theme/tokens';

import { Icon } from './icons/Icon';
import { useKeyboardHeight } from './Keyboard';
import { t } from '../data/texts';
import { refreshUnread, useFriendRequests, useUnreadMessages } from '../data/chat';
import { useStore } from '../data/store';

import { countButton } from '../data/remote';
import { isMono, look } from '../theme/look';
import { useRoutineEnabled } from '../data/routine';
import { usePageLeave } from '../lib/pageSlide';

/** `menu`: Dein Konto, dort ist der Burger markiert (Daria, 2026-11-11) */
export type TabKey = 'feed' | 'reise' | 'chat' | 'menu';

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
  /** Kiez-Look: Die Routine ist im Feed offen, dann ist der Kalender aktiv statt des Herzens */
  routineActive?: boolean;
  /** Kiez-Look: Kalender im Feed öffnet die Routine dort. Ohne: Der Feed öffnet mit der Routine. */
  onRoutinePress?: () => void;
  /** Routine: „Neue Erinnerung“ ist auf der Seite ganz zu sehen, dann fehlt das Plus (Daria, 2026-11-23) */
  hidePlus?: boolean;
};

/**
 * Schwebende Tab-Leiste (Upgrade „Nachtschicht“): Doppelherz = Feed (Daria, 26.10.2026), Sprechblase = Chats,
 * Burger = Menü (Konto). Die Krone für „Was Du so machst“ ist raus, das Logo oben im Feed führt dorthin (UX-Audit, 27.10.2026). Die aktive Seite liegt auf einer dezenten, halbtransparenten Pille.
 * Challenge erstellen sitzt als CameraButton oben rechts und in der Leiste zwischen Feed und Chats
 * (Daria, 30.10.2026). Beide Knöpfe zählen mit (`button_presses`), damit sich zeigt, welcher häufiger genutzt wird.
 */
export function TabBar(props: TabBarProps) {
  return <KiezTabBar {...props} />;
}

function KiezTabBar({ active, onFeedPress, onMenuPress, onCreatePress, routineActive = false, onRoutinePress, hidePlus = false }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode, currentUserId } = useStore();
  const routineOn = useRoutineEnabled();
  const feedOn = active === 'feed' && !routineActive;
  // Wechsel wie zwischen den Reitern im Feed: Seite gleitet hinaus, die neue kommt von ihrer Seite der Leiste (lib/pageSlide)
  const leave = usePageLeave();
  const awayFromFeed = active === 'chat' || active === 'menu';
  // Lila Pille im Feed wie üblich; in der Routine klein und ohne Fläche (Daria, 2026-11-12)
  const cameraPill = feedOn;
  // In „Me & Myself“ erstellt die Kamera einen privaten Post: Pille gelb statt lila (Daria, 2026-11-15)
  const cameraFill = useFrontSpace() === 'me' ? color.accent.private : color.nav.create;
  const unread = useUnreadMessages();
  const requests = useFriendRequests();
  useEffect(() => {
    if (currentUserId) refreshUnread(currentUserId, mode === 'live').catch(() => {});
  }, [currentUserId, mode]);
  // Bei offener Tastatur weg (Daria, 2026-11-17: Suche im Feed, die Leiste schwebte mitten im Bild)
  // Quick Button (Daria, 2026-11-23): In der Routine kommt ein Plus neben den Kalender ins selbe Oval. Die anderen
  // Knöpfe werden etwas kleiner und rutschen dabei zur Seite, das Plus ist das hervorgehobene Element.
  const plusOn = routineOn && routineActive && !hidePlus;
  const open = useRef(new Animated.Value(plusOn ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(open, { toValue: plusOn ? 1 : 0, ...NAV_SWAP_SPRING, useNativeDriver: false }).start();
  }, [plusOn, open]);
  const itemW = open.interpolate({ inputRange: [0, 1], outputRange: [ITEM_W, ITEM_W_SMALL] });
  const itemH = open.interpolate({ inputRange: [0, 1], outputRange: [ITEM_H, ITEM_H_SMALL] });
  const iconScale = open.interpolate({ inputRange: [0, 1], outputRange: [1, ICON_SMALL] });
  const plusW = open.interpolate({ inputRange: [0, 1], outputRange: [0, PLUS_W] });
  // Ohne Plus fällt auch sein Abstand weg, sonst springt die Leiste beim Auftauchen um diesen Abstand
  const plusGap = open.interpolate({ inputRange: [0, 1], outputRange: [-space[6], 0] });
  const plusScale = open.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const slot = (child: ReactNode, width: Animated.AnimatedInterpolation<number> | number = itemW) => (
    <Animated.View style={{ width, height: itemH }}>
      <Animated.View style={[styles.fill, { transform: [{ scale: iconScale }] }]}>{child}</Animated.View>
    </Animated.View>
  );
  const keyboard = useKeyboardHeight();
  if (keyboard > 0) return null;
  return (
    <View
      style={[styles.wrap, { bottom: tabBarBottom(insets.bottom) }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar} accessibilityRole="tablist">
        {/* Kalender ganz links öffnet die Routine (Daria, 2026-11-12). Nur, wenn die Routine eingeschaltet ist. */}
        {routineOn ? slot(
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel={t('Routine')}
            accessibilityState={{ selected: routineActive }}
            onPress={() => {
              if (routineActive) return;
              if (onRoutinePress) onRoutinePress();
              else leave(-1, () => router.dismissTo({ pathname: '/feed', params: { reiter: 'routine' } }));
            }}
            style={({ pressed }) => [styles.item, routineActive && styles.itemActive, pressed && styles.pressed]}
          >
            <Icon name="calendar" size={navSize(size.icon, routineActive)} color={routineActive ? color.nav.calendar : color.nav.icon} />
          </Pressable>,
        ) : null}
        {/* Quick Button: neue Erinnerung für heute (Daria, 2026-11-23). Senf wie der Kalender, als volle Pille. */}
        {routineOn ? (
          <Animated.View
            style={{ width: plusW, height: ITEM_H, marginLeft: plusGap, opacity: open, transform: [{ scale: plusScale }] }}
            pointerEvents={plusOn ? 'auto' : 'none'}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Neue Erinnerung')}
              accessibilityElementsHidden={!plusOn}
              importantForAccessibility={plusOn ? 'auto' : 'no-hide-descendants'}
              onPress={() => {
                countButton('plus-leiste', look);
                router.push('/routine/new');
              }}
              style={({ pressed }) => [styles.item, styles.plus, pressed && styles.pressed]}
            >
              <Icon name="plus" size={PLUS_ICON} color={color.nav.onCreate} />
            </Pressable>
          </Animated.View>
        ) : null}
        {/* Kamera auch in der Leiste (Daria, 30.10.2026). Im Feed als lila Pille, dort etwas größer; in der Routine klein und schlicht (Daria, 2026-11-12). In Nachrichten und „Was Du so machst“ schlicht wie Feed und Menü daneben:
            ohne Fläche, gleich breit, gedämpfte Farbe (Daria, 10.11.2026).
            Sitzt rechts neben dem Kalender, das Herz (Feed) kommt danach (Daria, 2026-11-12) */}
        {slot(
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Challenge erstellen')}
          onPress={() => {
            countButton('kamera-leiste', look);
            (onCreatePress ?? (() => router.dismissTo({ pathname: '/feed', params: { erstellen: '1' } })))();
          }}
          style={({ pressed }) => [styles.item, cameraPill && { backgroundColor: cameraFill }, pressed && styles.pressed]}
        >
          <Icon
            name="camera"
            size={cameraPill ? CAMERA_ICON_FEED : navSize(CAMERA_ICON_PLAIN, false)}
            color={cameraPill ? color.nav.onCreate : color.nav.icon}
          />
        </Pressable>,
          cameraPill ? CAMERA_PILL_W : itemW,
        )}
        {slot(
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={t('Feed')}
          accessibilityState={{ selected: feedOn }}
          onPress={() => (awayFromFeed ? leave(-1, onFeedPress) : onFeedPress())}
          style={({ pressed }) => [styles.item, feedOn && styles.itemActive, pressed && styles.pressed]}
        >
          <Icon name="feed" size={navSize(size.icon, feedOn)} color={feedOn ? color.nav.feed : color.nav.icon} />
        </Pressable>,
        )}
        {/* Chat und Freund:innen (Daria, 22.10.2026) */}
        {slot(
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={unread ? t('Chats, {n} ungelesen', { n: unread }) : requests ? t('Chats, neue Freundschaftsanfrage') : t('Chats')}
          accessibilityState={{ selected: active === 'chat' }}
          // Vom Konto aus liegt der Chat links, sonst rechts (Daria, 2026-11-17)
          onPress={() => {
            if (active === 'chat') return;
            if (active === 'menu') leave(-1, () => router.dismissTo('/chat'));
            else leave(1, () => router.push('/chat'));
          }}
          style={({ pressed }) => [styles.item, active === 'chat' && styles.itemActive, pressed && styles.pressed]}
        >
          <View>
            <Icon name="message" size={navSize(NAV_ICON.message, active === 'chat')} color={active === 'chat' ? color.nav.chat : color.nav.icon} />
            {unread || requests ? <View style={styles.dot} /> : null}
          </View>
        </Pressable>,
        )}
        {slot(
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={t('Menü')}
          accessibilityState={{ selected: active === 'menu' }}
          onPress={() => active !== 'menu' && leave(1, onMenuPress)}
          style={({ pressed }) => [styles.item, active === 'menu' && styles.itemActive, pressed && styles.pressed]}
        >
          <Icon name="burger" size={navSize(NAV_ICON.burger, active === 'menu')} color={active === 'menu' ? color.nav.menu : color.nav.icon} />
        </Pressable>,
        )}
      </View>
    </View>
  );
}

/** Kamera oben rechts: bleibt beim Scrollen stehen und erstellt eine Challenge. */
/** `inline`: im Fluss statt oben rechts angeheftet, z. B. in der Vorschau der Tour */
export function CameraButton({ onPress, inline = false }: { onPress: () => void; inline?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('Challenge erstellen')}
      onPress={() => {
        if (!inline) countButton('kamera-oben', look);
        onPress();
      }}
      hitSlop={4}
      style={({ pressed }) => [styles.camera, inline ? styles.cameraInline : { top: insets.top + space[8] }, pressed && styles.pressed]}
    >
      <Icon name="camera" size={24} color={color.bg.screen} />
    </Pressable>
  );
}

/**
 * Alle Icons der Leiste gleich hoch, gemessen an der sichtbaren Form (Daria, 2026-11-13). Kalender und Feed füllen
 * ihre Fläche ganz aus und sind der Maßstab (size.icon). Die Sprechblase füllt 30,3 von 35, die drei Striche 21,5
 * von 35; sie bekommen so viel mehr Größe, dass ihre Form genauso hoch ist.
 */
const NAV_ICON = isMono
  ? // Look Mono: Phosphor-Linien haben überall dieselbe Strichstärke. Der Ausgleich oben machte die drei Striche 1,6-mal
    // so dick wie die Nachbarn (Daria, 2026-11-27), daher hier ohne Ausgleich.
    { message: size.icon, burger: size.icon }
  : {
      message: Math.round(((size.icon * 35) / 30.3) * 10) / 10,
      burger: Math.round(((size.icon * 35) / 21.5) * 10) / 10,
    };
/** Kamera mit eigenem Maßstab (Icon.tsx, CAMERA_SCALE 1,2 statt 1,5): ohne Pille so hoch wie die anderen Icons */
const CAMERA_ICON_PLAIN = 25;
/** Nur im Feed größer, in der lila Pille (Daria, 2026-11-13) */
const CAMERA_ICON_FEED = 30;
/** Knöpfe der Leiste; mit Plus (Routine) etwas kleiner, damit alles in ein Oval passt (Daria, 2026-11-23) */
const ITEM_W = 56;
const ITEM_H = 48;
const ITEM_W_SMALL = 46;
const ITEM_H_SMALL = 42;
const ICON_SMALL = 0.88;
/** Kamera im Feed als breitere lila Pille */
const CAMERA_PILL_W = 72;
/** Feder für das Plus; „Neue Erinnerung“ in der Routine blendet mit derselben Feder um (Daria, 2026-11-23) */
export const NAV_SWAP_SPRING = { friction: 7, tension: 70 };
/** Plus: breiter als die Nachbarn und volle Höhe, das hervorgehobene Element */
const PLUS_W = 64;
const PLUS_ICON = 26;
/** Nicht gewählte Icons kleiner, das gewählte behält die volle Höhe (Daria, 2026-11-13) */
const NAV_IDLE = 0.8;
const navSize = (full: number, selected: boolean) => (selected ? full : Math.round(full * NAV_IDLE * 10) / 10);

/** Platz unter Listen, damit die schwebende Leiste nichts verdeckt. */
export const TAB_BAR_SPACE = 96;

/** Abstand der Leiste vom unteren Rand und ihre Höhe (Knopf 48 + Innenabstand), für Knöpfe direkt darüber */
export const tabBarBottom = (insetBottom: number) => Math.max(insetBottom, space[16]);
export const TAB_BAR_HEIGHT = 48 + 2 * space[6] + 2;

/** Breite der Kamera oben rechts; feed.tsx rückt die Pille um so viel ein */
export const CAMERA_W = 76;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    padding: space[6],
    borderRadius: radius.full,
    // Aubergine statt Grau (Daria, 2026-11-12)
    backgroundColor: color.nav.bar,
    borderWidth: stroke.ultraThin,
    borderColor: color.line.hairline,
  },
  item: {
    flex: 1,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { flex: 1 },
  // Quick Button in der Routine: Senf wie Kalender und Me & Myself (Daria, 2026-11-23)
  plus: { backgroundColor: color.nav.calendar },
  // Aktive Seite: graue Blase #303034 (Daria, 2026-11-12)
  itemActive: { backgroundColor: color.nav.bubble },
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
  cameraInline: { position: 'relative', right: 0 },
  pressed: { opacity: 0.7 },
  off: { opacity: 0.55 },
  // Dein Bild in der Leiste: aktiv mit dunklem Ring
  me: { borderRadius: 999, padding: 1.5, borderWidth: 1.5, borderColor: 'transparent' },
  meActive: { borderColor: color.text.primary },
  dot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.accent.signal,
    borderWidth: stroke.thin,
    borderColor: color.nav.bar,
  },
});
