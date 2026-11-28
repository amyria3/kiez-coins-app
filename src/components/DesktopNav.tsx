import { useCallback, useSyncExternalStore, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, usePathname, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { color, radius, size, space, stroke, text, withAlpha } from '../theme/tokens';
import { isMono, look } from '../theme/look';
import { DESKTOP_ASIDE_WIDTH, DESKTOP_CONTENT_WIDTH, useDesktop } from '../theme/layout';
import { t } from '../data/texts';
import { useStore } from '../data/store';
import { useFriendRequests, useUnreadMessages } from '../data/chat';
import { useRoutineEnabled } from '../data/routine';
import { countButton } from '../data/remote';
import { Icon, type IconName } from './icons/Icon';
import { CrownIcon } from './icons/Brand';
import { WORDMARK_BOTTOM, WORDMARK_LEFT, WORDMARK_LETTERS, WORDMARK_RIGHT, WORDMARK_TOP } from './icons/wordmarkLetters';
import { Text } from './T';
import type { TabKey } from './TabBar';

/**
 * Desktop-Fassung, Schritt 1 (Daria, 2026-11-28, Variante B aus dem Entwurf „KiezCoins am Desktop“): Ab 680 px
 * Fensterbreite steht links eine Seitenleiste statt der Tab-Leiste unten, der Inhalt hat 620 px Lesebreite in der
 * Mitte. Ab 880 px zeigt die Leiste die Namen neben den Icons, darunter nur die Icons. Ab 1200 px gibt es rechts eine
 * weitere Spalte, in die die Seite vorn etwas legen kann (DesktopAside).
 *
 * Eine Formensprache für beide Breiten, wie in der Tab-Leiste (Daria, 2026-11-28: „inkonsistent“): Jeder Eintrag ist
 * eine Pille, schmal ein Kreis. Der gewählte Eintrag trägt die Tönung seiner Farbe, „Posten“ ist voll gefüllt.
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

/** Rechte Spalte: Die Seite, die vorn ist, legt dort ihren Inhalt ab (DesktopAside.web.tsx) */
let asideHost: HTMLElement | null = null;
const asideListeners = new Set<() => void>();
const subscribeAside = (l: () => void) => {
  asideListeners.add(l);
  return () => asideListeners.delete(l);
};
const readAside = () => asideHost;
const setAsideHost = (el: unknown) => {
  const next = (el as HTMLElement | null) ?? null;
  if (next === asideHost) return;
  asideHost = next;
  asideListeners.forEach((l) => l());
};
export function useAsideHost(): HTMLElement | null {
  return useSyncExternalStore(subscribeAside, readAside, () => null);
}

/** Wie viele Seiten gerade etwas in die rechte Spalte legen: Ohne Inhalt nimmt sie keinen Platz ein */
let asideUsers = 0;
const readAsideUsed = () => asideUsers > 0;
export function claimAside() {
  asideUsers += 1;
  asideListeners.forEach((l) => l());
  return () => {
    asideUsers -= 1;
    asideListeners.forEach((l) => l());
  };
}

/**
 * Breite des Inhalts der Seite, die vorn ist. Ohne Angabe die Lesebreite `DESKTOP_CONTENT_WIDTH`; der Feed nimmt mehr,
 * damit zwei Spalten Posts nebeneinander passen.
 */
let contentWidth: number = DESKTOP_CONTENT_WIDTH;
const widthListeners = new Set<() => void>();
const subscribeWidth = (l: () => void) => {
  widthListeners.add(l);
  return () => widthListeners.delete(l);
};
const setContentWidth = (w: number) => {
  if (w === contentWidth) return;
  contentWidth = w;
  widthListeners.forEach((l) => l());
};
export function useDesktopContentWidth(width: number | undefined) {
  useFocusEffect(
    useCallback(() => {
      if (!width) return;
      setContentWidth(width);
      return () => setContentWidth(DESKTOP_CONTENT_WIDTH);
    }, [width]),
  );
}

/** Rahmen der App: auf dem Desktop Seitenleiste links und Inhalt in Lesebreite, sonst nur der Inhalt */
export function DesktopFrame({ children }: { children: ReactNode }) {
  const { desktop, wideNav, labels } = useDesktop();
  const { currentUserId } = useStore();
  const pathname = usePathname();
  const width = useSyncExternalStore(subscribeWidth, () => contentWidth, () => DESKTOP_CONTENT_WIDTH);
  const asideUsed = useSyncExternalStore(subscribeAside, readAsideUsed, () => false);
  if (!desktop) return <>{children}</>;
  // Ohne Konto (Anmeldung, Einstieg) gibt es nichts zu navigieren: nur die Lesebreite
  const nav = !!currentUserId && !pathname.startsWith('/onboarding');
  return (
    <View style={styles.frame}>
      {nav ? <Sidebar wide={labels} /> : null}
      <View style={styles.stage}>
        <View style={[styles.column, { maxWidth: width }]}>{children}</View>
        {/* Rechte Spalte ab 1200 px. Sie nimmt nur Platz ein, wenn die Seite vorn etwas hineinlegt. */}
        {nav && wideNav ? <View ref={setAsideHost} style={asideUsed ? styles.aside : styles.asideEmpty} /> : null}
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
  const toMe = () => (active === 'reise' ? undefined : router.push('/me'));
  const create = () => {
    countButton('kamera-seitenleiste', look);
    (state?.onCreatePress ?? (() => router.dismissTo({ pathname: '/feed', params: { erstellen: '1' } })))();
  };

  return (
    <View style={[styles.side, wide ? styles.sideWide : styles.sideRail]} accessibilityRole="tablist">
      <View style={styles.brand} accessibilityRole="header" accessibilityLabel="KiezCoins">
        <Wordmark initial={!wide} />
      </View>
      <NavItem wide={wide} filled icon="camera" label={t('Posten')} accessibilityLabel={t('Challenge erstellen')} role={color.nav.create} selected={false} onPress={create} />
      <View style={styles.gap} />
      {routineOn ? (
        <NavItem wide={wide} icon="calendar" label={t('Routine')} role={color.nav.calendar} selected={routineActive} onPress={toRoutine} />
      ) : null}
      {routineOn && routineActive ? (
        <NavItem
          wide={wide}
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
      {/* „Was Du so machst“: am Handy führt das Logo über dem Feed dorthin, hier steht es in der Leiste */}
      <NavItem
        wide={wide}
        glyph={(tint) => <CrownIcon height={30} fill={tint} />}
        label={t('Was Du so machst')}
        role={color.nav.calendar}
        selected={active === 'reise'}
        onPress={toMe}
      />
      <NavItem wide={wide} icon="burger" label={t('Menü')} role={color.nav.menu} selected={active === 'menu'} onPress={toMenu} />
    </View>
  );
}

function NavItem({
  wide,
  filled = false,
  icon,
  glyph,
  label,
  accessibilityLabel,
  role,
  selected,
  dot = false,
  onPress,
}: {
  wide: boolean;
  /** Hauptaktion: voll in ihrer Farbe gefüllt */
  filled?: boolean;
  icon?: IconName;
  /** Eigenes Zeichen statt eines Icons, bekommt die Farbe des Eintrags */
  glyph?: (tint: string) => ReactNode;
  label: string;
  accessibilityLabel?: string;
  role: string;
  selected: boolean;
  dot?: boolean;
  onPress: () => void;
}) {
  const tint = filled ? color.nav.onCreate : selected ? (isMono ? color.text.primary : role) : color.nav.icon;
  const ink = filled ? color.nav.onCreate : selected ? (isMono ? color.text.primary : role) : color.text.primary;
  return (
    <Pressable
      accessibilityRole={filled ? 'button' : 'tab'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={filled ? undefined : { selected }}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.item,
        wide ? styles.itemWide : styles.itemRail,
        filled && { backgroundColor: role },
        hovered && !selected && !filled && styles.itemHover,
        hovered && filled && styles.filledHover,
        selected && { backgroundColor: color.nav.selectedFill ?? withAlpha(role, 0.16), borderColor: color.nav.selectedLine ?? 'transparent' },
        pressed && styles.pressed,
      ]}
    >
      {/* Feste Breite für jedes Icon, damit die Namen bündig stehen: Die Kiez-Icons sind unterschiedlich breit */}
      <View style={styles.iconBox}>
        {glyph ? glyph(tint) : icon ? <Icon name={icon} size={size.icon} color={tint} /> : null}
        {dot ? <View style={styles.dot} /> : null}
      </View>
      {wide ? (
        <Text style={[styles.label, { color: ink }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * Flaches Logo ohne Kater (Daria, 2026-11-28: „flaches Logo, bitte Logo ohne Katzenbild, da der Kater ja rechts
 * rumschwirrt“): nur die Buchstaben der Wortbildmarke, in der Farbe des Schriftzugs im jeweiligen Look. In der schmalen
 * Leiste steht nur das K, in derselben Größe wie im ganzen Schriftzug.
 */
function Wordmark({ initial }: { initial: boolean }) {
  const letters = initial ? WORDMARK_LETTERS.slice(0, 1) : WORDMARK_LETTERS;
  const left = initial ? letters[0].x0 : WORDMARK_LEFT;
  const w = (initial ? letters[0].x1 : WORDMARK_RIGHT) - left;
  const h = WORDMARK_BOTTOM - WORDMARK_TOP;
  const fill = color.brand.wordmark ?? WORDMARK_INK;
  return (
    <Svg width={(WORDMARK_HEIGHT * w) / h} height={WORDMARK_HEIGHT} viewBox={`${left} ${WORDMARK_TOP} ${w} ${h}`}>
      {letters.map((l, i) => (
        <Path key={i} d={l.d} fill={fill} />
      ))}
    </Svg>
  );
}
/** Schriftfarbe wie in assets/marke/wortbildmarke.svg, wenn der Look keine eigene setzt */
const WORDMARK_INK = '#7E94FF';
const WORDMARK_HEIGHT = 30;

const SIDE_WIDE = 232;
const SIDE_RAIL = 80;
/** Höhe jedes Eintrags, schmal zugleich seine Breite */
const ITEM = 48;
/** Breite des Icon-Felds: Platz für das breiteste Kiez-Icon */
const ICON_BOX = 40;

const styles = StyleSheet.create({
  frame: { flex: 1, flexDirection: 'row', backgroundColor: color.bg.screen },
  stage: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  column: { flex: 1 },
  aside: { width: DESKTOP_ASIDE_WIDTH, marginLeft: space[32], marginRight: space[24], paddingTop: space[24] },
  asideEmpty: { width: 0, overflow: 'hidden' },
  side: {
    borderRightWidth: stroke.thin,
    borderRightColor: color.line.hairline,
    paddingVertical: space[20],
    gap: space[4],
  },
  sideWide: { width: SIDE_WIDE, paddingHorizontal: space[12] },
  sideRail: { width: SIDE_RAIL, alignItems: 'center' },
  brand: { height: ITEM, justifyContent: 'center', paddingHorizontal: space[8], marginBottom: space[8] },
  gap: { height: space[12] },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM,
    borderRadius: radius.full,
    borderWidth: stroke.thin,
    borderColor: 'transparent',
  },
  itemWide: { gap: space[8], paddingHorizontal: space[8] },
  itemRail: { width: ITEM, justifyContent: 'center' },
  itemHover: { backgroundColor: color.bg.surface },
  filledHover: { opacity: 0.9 },
  label: { ...text.bodyStrong, flex: 1 },
  pressed: { opacity: 0.6 },
  iconBox: { width: ICON_BOX, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: -2,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.accent.signal,
    borderWidth: stroke.thin,
    borderColor: color.bg.screen,
  },
});
