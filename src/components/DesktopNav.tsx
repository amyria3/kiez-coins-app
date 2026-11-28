import { useCallback, useSyncExternalStore, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, usePathname, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { color, radius, size, space, stroke, text, withAlpha } from '../theme/tokens';
import { isMono, look } from '../theme/look';
import { DESKTOP_CONTENT_WIDTH, useDesktop } from '../theme/layout';
import { t } from '../data/texts';
import { useStore } from '../data/store';
import { useFriendRequests, useUnreadMessages } from '../data/chat';
import { useRoutineEnabled } from '../data/routine';
import { countButton } from '../data/remote';
import { Icon, type IconName } from './icons/Icon';
import { WORDMARK_BOTTOM, WORDMARK_LEFT, WORDMARK_LETTERS, WORDMARK_RIGHT, WORDMARK_TOP } from './icons/wordmarkLetters';
import { Text } from './T';
import type { TabKey } from './TabBar';

/**
 * Desktop-Fassung, Schritt 1 (Daria, 2026-11-28, Variante B aus dem Entwurf „KiezCoins am Desktop“): Ab 900 px
 * Fensterbreite steht links eine Seitenleiste statt der Tab-Leiste unten, der Inhalt hat 620 px Lesebreite in der
 * Mitte. Ab 1200 px zeigt die Leiste die Namen neben den Icons, darunter nur die Icons mit kleinem Namen.
 *
 * Die Seiten bleiben, wie sie sind: Jede Seite mit Tab-Leiste meldet hier, welcher Tab aktiv ist und was ihre Knöpfe
 * tun (`useDesktopNavState` in TabBar). Die Seitenleiste zeigt den Stand der Seite, die gerade vorn ist.
 */

/** Was die vordere Seite der Leiste mitgibt, wie die Props der Tab-Leiste */
export type DesktopNavState = {
  active: TabKey;
  routineActive: boolean;
  onFeedPress: () => void;
  onMenuPress: () => void;
  onCreatePress?: () => void;
  onRoutinePress?: () => void;
};

let current: DesktopNavState | null = null;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const read = () => current;

/** Tab-Leiste in der Desktop-Fassung: zeigt nichts, meldet aber ihren Stand an die Seitenleiste, solange ihre Seite vorn ist */
export function useDesktopNavState(state: DesktopNavState, enabled: boolean) {
  const { active, routineActive, onFeedPress, onMenuPress, onCreatePress, onRoutinePress } = state;
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      current = { active, routineActive, onFeedPress, onMenuPress, onCreatePress, onRoutinePress };
      listeners.forEach((l) => l());
    }, [enabled, active, routineActive, onFeedPress, onMenuPress, onCreatePress, onRoutinePress]),
  );
}

/** Rahmen der App: auf dem Desktop Seitenleiste links und Inhalt in Lesebreite, sonst nur der Inhalt */
export function DesktopFrame({ children }: { children: ReactNode }) {
  const { desktop, wideNav } = useDesktop();
  const { currentUserId } = useStore();
  const pathname = usePathname();
  if (!desktop) return <>{children}</>;
  // Ohne Konto (Anmeldung, Einstieg) gibt es nichts zu navigieren: nur die Lesebreite
  const nav = !!currentUserId && !pathname.startsWith('/onboarding');
  return (
    <View style={styles.frame}>
      {nav ? <Sidebar wide={wideNav} /> : null}
      <View style={styles.stage}>
        <View style={styles.column}>{children}</View>
      </View>
    </View>
  );
}

function Sidebar({ wide }: { wide: boolean }) {
  const router = useRouter();
  const state = useSyncExternalStore(subscribe, read, read);
  const routineOn = useRoutineEnabled();
  const unread = useUnreadMessages();
  const requests = useFriendRequests();
  const active = state?.active ?? 'feed';
  const routineActive = state?.routineActive ?? false;
  const feedOn = active === 'feed' && !routineActive;

  const toRoutine = () => {
    if (routineActive) return;
    if (state?.onRoutinePress) state.onRoutinePress();
    else router.dismissTo({ pathname: '/feed', params: { reiter: 'routine' } });
  };
  const toFeed = () => (state ? state.onFeedPress() : router.dismissTo('/feed'));
  const toChat = () => {
    if (active === 'chat') return;
    if (active === 'menu') router.dismissTo('/chat');
    else router.push('/chat');
  };
  const toMenu = () => (active === 'menu' ? undefined : state ? state.onMenuPress() : router.push('/account'));
  const create = () => {
    countButton('kamera-seitenleiste', look);
    (state?.onCreatePress ?? (() => router.dismissTo({ pathname: '/feed', params: { erstellen: '1' } })))();
  };

  return (
    <View style={[styles.side, wide ? styles.sideWide : styles.sideRail]} accessibilityRole="tablist">
      <View style={[styles.brand, !wide && styles.brandRail]} accessibilityRole="header" accessibilityLabel="KiezCoins">
        <Wordmark width={wide ? 132 : 64} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Challenge erstellen')}
        onPress={create}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.post,
          !wide && styles.postRail,
          hovered && styles.postHover,
          pressed && styles.pressed,
        ]}
      >
        <Icon name="camera" size={size.icon} color={color.nav.onCreate} />
        {wide ? <Text style={[styles.label, { color: color.nav.onCreate }]}>{t('Posten')}</Text> : null}
      </Pressable>
      {routineOn ? (
        <NavItem wide={wide} icon="calendar" label={t('Routine')} role={color.nav.calendar} selected={routineActive} onPress={toRoutine} />
      ) : null}
      {routineOn && routineActive ? (
        <NavItem
          wide={wide}
          sub
          icon="plus"
          label={t('Neue Erinnerung')}
          role={color.nav.calendar}
          selected={false}
          onPress={() => {
            countButton('plus-seitenleiste', look);
            router.push('/routine/new');
          }}
        />
      ) : null}
      <NavItem wide={wide} icon="feed" label={t('Feed')} role={color.nav.feed} selected={feedOn} onPress={toFeed} />
      <NavItem
        wide={wide}
        icon="message"
        label={t('Chats')}
        accessibilityLabel={unread ? t('Chats, {n} ungelesen', { n: unread }) : requests ? t('Chats, neue Freundschaftsanfrage') : t('Chats')}
        role={color.nav.chat}
        selected={active === 'chat'}
        dot={!!(unread || requests)}
        onPress={toChat}
      />
      <NavItem wide={wide} icon="burger" label={t('Menü')} role={color.nav.menu} selected={active === 'menu'} onPress={toMenu} />
    </View>
  );
}

function NavItem({
  wide,
  sub = false,
  icon,
  label,
  accessibilityLabel,
  role,
  selected,
  dot = false,
  onPress,
}: {
  wide: boolean;
  sub?: boolean;
  icon: IconName;
  label: string;
  accessibilityLabel?: string;
  role: string;
  selected: boolean;
  dot?: boolean;
  onPress: () => void;
}) {
  const tint = selected ? role : color.nav.icon;
  return (
    <Pressable
      accessibilityRole={sub ? 'button' : 'tab'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={sub ? undefined : { selected }}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.item,
        wide ? styles.itemWide : styles.itemRail,
        sub && wide && styles.itemSub,
        hovered && !selected && styles.itemHover,
        selected && [styles.itemSelected, { backgroundColor: color.nav.selectedFill ?? (isMono ? undefined : withAlpha(role, 0.16)) }],
        pressed && styles.pressed,
      ]}
    >
      <View>
        <Icon name={icon} size={sub ? size.icon * 0.8 : size.icon} color={tint} />
        {dot ? <View style={styles.dot} /> : null}
      </View>
      {wide ? (
        <Text style={[sub ? styles.subLabel : styles.label, { color: selected ? role : color.text.primary }]}>{label}</Text>
      ) : sub ? null : (
        <Text style={[styles.railLabel, { color: selected ? role : color.text.secondary }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * Flaches Logo ohne Kater (Daria, 2026-11-28: „flaches Logo, bitte Logo ohne Katzenbild, da der Kater ja rechts
 * rumschwirrt“): nur die Buchstaben der Wortbildmarke, in der Farbe des Schriftzugs im jeweiligen Look.
 */
function Wordmark({ width }: { width: number }) {
  const w = WORDMARK_RIGHT - WORDMARK_LEFT;
  const h = WORDMARK_BOTTOM - WORDMARK_TOP;
  const fill = color.brand.wordmark ?? WORDMARK_INK;
  return (
    <Svg width={width} height={(width * h) / w} viewBox={`${WORDMARK_LEFT} ${WORDMARK_TOP} ${w} ${h}`}>
      {WORDMARK_LETTERS.map((l, i) => (
        <Path key={i} d={l.d} fill={fill} />
      ))}
    </Svg>
  );
}
/** Schriftfarbe wie in assets/marke/wortbildmarke.svg, wenn der Look keine eigene setzt */
const WORDMARK_INK = '#7E94FF';

const SIDE_WIDE = 232;
const SIDE_RAIL = 88;

const styles = StyleSheet.create({
  frame: { flex: 1, flexDirection: 'row', backgroundColor: color.bg.screen },
  stage: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: DESKTOP_CONTENT_WIDTH },
  side: {
    borderRightWidth: stroke.thin,
    borderRightColor: color.line.hairline,
    paddingVertical: space[20],
    gap: space[6],
  },
  sideWide: { width: SIDE_WIDE, paddingHorizontal: space[12] },
  sideRail: { width: SIDE_RAIL, paddingHorizontal: space[8], alignItems: 'center' },
  brand: { paddingHorizontal: space[8], paddingBottom: space[16] },
  brandRail: { paddingHorizontal: 0, paddingBottom: space[12] },
  post: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[8],
    height: 48,
    borderRadius: radius.full,
    backgroundColor: color.nav.create,
    marginBottom: space[12],
  },
  postRail: { width: 52, height: 52 },
  postHover: { opacity: 0.9 },
  item: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: stroke.thin, borderColor: 'transparent' },
  itemWide: { gap: space[12], paddingHorizontal: space[12], paddingVertical: space[8] + 2 },
  itemRail: { flexDirection: 'column', gap: space[4], width: 72, paddingVertical: space[8] },
  itemSub: { paddingLeft: space[24], paddingVertical: space[6] },
  itemHover: { backgroundColor: color.bg.surface },
  itemSelected: { borderColor: color.nav.selectedLine ?? 'transparent' },
  label: text.bodyStrong,
  subLabel: text.label,
  railLabel: { ...text.caption, textAlign: 'center' },
  pressed: { opacity: 0.6 },
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
