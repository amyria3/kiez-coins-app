import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './T';
import { Image } from 'expo-image';

import { challengeTypes, isTypeActive } from '../data/features';
import type { Challenge } from '../data/types';
import { color, font, isFashionable, motion, radius, size, space, stroke, text } from '../theme/tokens';
import { KaterCard } from './Content';
import { Logo, MonoCat } from './icons/Brand';
import { Icon } from './icons/Icon';
import { useRouter } from 'expo-router';
import { useUnreadMessages } from '../data/chat';
import { SkeletonTopItem } from './Skeleton';
import { t } from '../data/texts';
import type { Mode } from '../data/features';

type AppHeaderProps = {
  /** Tipp auf Logo und Kater öffnet „Was Du so machst“. */
  onLogoPress?: () => void;
  /** Langes Drücken aufs Logo öffnet das Demo-Menü (nur für Tests mit Beispieldaten). */
  onLogoLongPress?: () => void;
  /** Punkt am Kater: Bei einer Deiner Challenges bist Du dran. */
  hasTasks?: boolean;
};

/**
 * Figma „AppHeader“, Upgrade „Nachtschicht“: Logo mit Kater in der Mitte. Das Menü liegt in der Tab-Leiste,
 * die Kamera schwebt oben rechts (CameraButton). Der Kopf scrollt mit dem Feed weg.
 */
export function AppHeader(props: AppHeaderProps) {
  return isFashionable ? <FashionHeader {...props} /> : <KiezHeader {...props} />;
}

/**
 * Kopf im Look „Fashionable“ nach Darias Mockup (24.10.2026): Schriftzug „KiezCoins“ als Text links,
 * Inter Tight halbfett 24/28, rechts die Sprechblase mit Zeilen (Chats). Dein Profilbild („Was Du so machst“) sitzt in der Leiste unten (Daria, 27.10.2026).
 * Abstände 4 oben, 12 rechts, 8 unten, 14 links.
 */
function FashionHeader({ onLogoLongPress }: AppHeaderProps) {
  const router = useRouter();
  const unread = useUnreadMessages();
  return (
    <View style={styles.fashionHead}>
      <Pressable onLongPress={onLogoLongPress} accessibilityRole="header">
        {/* Kater aus dem monochromen Logo (26) und Schriftzug „KiezCoins“, 8 Abstand (Daria, 24.10.2026, Variante B) */}
        <View style={styles.brand} accessible accessibilityLabel="KiezCoins">
          <MonoCat height={26} />
          <Text noTranslate style={styles.wordmark}>
            KiezCoins
          </Text>
        </View>
      </Pressable>
      <View style={styles.headIcons}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unread ? t('Chats, {n} ungelesen', { n: unread }) : t('Chats')}
          onPress={() => router.push('/chat')}
          hitSlop={10}
        >
          <Icon name="message" size={size.icon} />
          {unread ? <View style={styles.headDot} /> : null}
        </Pressable>
      </View>
    </View>
  );
}

function KiezHeader({ onLogoPress, onLogoLongPress, hasTasks }: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onLogoPress}
        onLongPress={onLogoLongPress}
        accessibilityRole="button"
        accessibilityLabel={hasTasks ? t('Was Du so machst, Du bist dran') : t('Was Du so machst')}
        style={styles.logo}
      >
        {/* Neues Logo mit Kater links (Daria, 22.10.2026); der Punkt sitzt am Kater */}
        <View>
          <Logo height={isFashionable ? 28 : 30} />
          {hasTasks ? <View style={[styles.taskDot, styles.taskDotLogo]} /> : null}
        </View>
      </Pressable>
      <View style={styles.spacer} />
    </View>
  );
}

/** Offene öffentliche Posts nach Art (ohne Gruppen und private Posts), für die Zeile unter der Begrüßung */
export type FeedCounts = { challenges: number; me: number; photos: number };

/** „2 Challenges, 1 Me-Challenge und 3 Bilder in Deiner Nähe“; Arten ohne Post fallen weg (Daria, 31.10.2026) */
function countLine(counts: FeedCounts): string {
  const parts = [
    counts.challenges ? t('{n, plural, one {# Challenge} other {# Challenges}}', { n: counts.challenges }) : '',
    counts.me ? t('{n, plural, one {# Me-Challenge} other {# Me-Challenges}}', { n: counts.me }) : '',
    counts.photos ? t('{n, plural, one {# Bild} other {# Bilder}}', { n: counts.photos }) : '',
  ].filter(Boolean);
  if (parts.length === 3) return t('{a}, {b} und {c} in Deiner Nähe', { a: parts[0], b: parts[1], c: parts[2] });
  if (parts.length === 2) return t('{a} und {b} in Deiner Nähe', { a: parts[0], b: parts[1] });
  if (parts.length === 1) return t('{a} in Deiner Nähe', { a: parts[0] });
  return t('Noch nichts in Deiner Nähe');
}

/**
 * Begrüßung über dem Feed: Tageszeit, Ansprache, Kiez und was es in der Nähe gibt, getrennt nach Art.
 * `counts` leer, solange der Feed lädt: Dann steht nur der Kiez da, nicht „Noch nichts“.
 */
export function FeedGreeting({ name, kiez, counts }: { name: string; kiez?: string; counts?: FeedCounts }) {
  // Fashionable Look: keine Begrüßung, der Schriftzug steht allein (Mockup)
  if (isFashionable) return null;
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend';
  const sub = [kiez, counts ? countLine(counts) : ''].filter(Boolean).join(' · ');
  return (
    <View style={styles.greeting}>
      <Text style={styles.greetingTitle} accessibilityRole="header">
        {greeting}, {name}
      </Text>
      {sub ? <Text style={styles.greetingSub}>{sub}</Text> : null}
    </View>
  );
}

type TopChallengeBarProps = {
  items: Challenge[];
  /** Während des Ladens Platzhalter zeigen; ohne Einträge danach gar nichts. */
  loading?: boolean;
  onItemPress: (id: string) => void;
};

/** Figma „TopChallengeBar“: horizontale Liste aus „TopChallengeItem“. */
export function TopChallengeBar({ items, loading, onItemPress }: TopChallengeBarProps) {
  if (items.length === 0 && !loading) return null;
  if (items.length === 0) {
    // Ladezustand (Figma FeedScreen State=Loading)
    return (
      <View style={[styles.topBar, styles.row]}>
        {[0, 1, 2].map((i) => (
          <SkeletonTopItem key={i} />
        ))}
      </View>
    );
  }
  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.topBar}
      style={styles.noGrow}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onItemPress(item.id)}
          hitSlop={{ top: 4, bottom: 4 }}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          style={styles.topItem}
        >
          <Image source={item.image} style={styles.thumbnail} contentFit="cover" />
          <Text style={styles.topTitle} numberOfLines={1}>
            {item.title}
          </Text>
        </Pressable>
      )}
    />
  );
}

export type FeedTab = 'private' | 'nearby' | 'everywhere' | 'wave' | 'completed' | 'groups';

/** Reiter je Modus (data/features.ts): Privat, Gruppe, Kiez, Überall */
export const TAB_OF_MODE: Record<Mode, FeedTab> = { private: 'private', groups: 'groups', kiez: 'nearby', everywhere: 'everywhere' };
export const MODE_OF_TAB: Partial<Record<FeedTab, Mode>> = { private: 'private', groups: 'groups', nearby: 'kiez', everywhere: 'everywhere' };

// Wave und Pleasure sind raus aus der Leiste (Daria, 22.10.2026). Die Filter in feed.tsx bleiben für später.
// Reihenfolge Privat, Gruppe, Kiez (Daria, 27.10.2026)
const tabs: { key: FeedTab; label: string; planned?: boolean }[] = [
  { key: 'private', label: 'Privat' },
  { key: 'groups', label: 'Gruppe' },
  { key: 'nearby', label: 'Kiez' },
  // Rechts im Umschalter (Daria, 29.10.2026)
  { key: 'everywhere', label: 'Überall' },
];

type TabsNavigationProps = {
  selectedKey: FeedTab;
  onChange: (key: FeedTab) => void;
  /** Sichtbare Modi (Auge in „Dein Konto › Funktionen“, Daria, 27.10.2026) */
  visible: Mode[];
};

/**
 * Figma „TabsNavigation“, Upgrade „Nachtschicht“: Segmente auf einer Pille; die Auswahl filtert den Feed.
 * Abgeschaltete Challenge-Typen (data/features.ts) sind gedimmt, lassen sich aber öffnen:
 * Der Feed zeigt dann einen Hinweis und vorhandene Challenges dieses Typs.
 */
export function TabsNavigation({ selectedKey, onChange, visible }: TabsNavigationProps) {
  const shown = tabs.filter((tab) => visible.some((mode) => TAB_OF_MODE[mode] === tab.key));
  // Nur ein Modus sichtbar: kein Umschalter
  if (shown.length < 2) return null;
  return <Segments tabs={shown} selectedKey={selectedKey} onChange={onChange} />;
}

type SegmentsProps<K extends string> = {
  tabs: { key: K; label: string; planned?: boolean }[];
  selectedKey: K;
  onChange: (key: K) => void;
  /**
   * Lage beim Wischen zwischen den Seiten, 0 = erster Reiter, 1 = zweiter usw.
   * Damit folgt die Pille dem Finger. Ohne: Die Pille gleitet nach dem Tippen zum Reiter.
   */
  progress?: Animated.Value | Animated.AnimatedInterpolation<number>;
};

/** Segmente mit gleitender Pille, z. B. Feed-Reiter oder „Aktuell / Archiv“ in „Deine Challenges“. */
export function Segments<K extends string>(props: SegmentsProps<K>) {
  return isFashionable ? <UnderlineTabs {...props} /> : <PillSegments {...props} />;
}

/**
 * Umschalter im Look „Fashionable“ (Daria, 23.10.2026), wie die Reiter in Profilen großer Foto-Apps: gleich breite Felder,
 * 44 pt hoch, Schrift 15 pt. Aktiv schwarz und halbfett, sonst Grau #737373. Unter dem aktiven Reiter liegt
 * ein schwarzer Strich, 1 pt stark und so breit wie das Feld; er gleitet mit „Schranke“ bzw. folgt dem Finger.
 * Darunter eine Haarlinie über die ganze Breite.
 */
function UnderlineTabs<K extends string>({ tabs, selectedKey, onChange, progress }: SegmentsProps<K>) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, tabs.findIndex((tab) => tab.key === selectedKey));
  const x = useRef(new Animated.Value(index)).current;
  useEffect(() => {
    if (progress) return;
    Animated.timing(x, {
      toValue: index,
      duration: motion.tabSwitch.duration,
      easing: Easing.bezier(...motion.barrier.bezier),
      useNativeDriver: true,
    }).start();
  }, [index, x, progress]);
  const at = progress ?? x;
  const w = tabs.length ? width / tabs.length : 0;
  return (
    <View style={styles.under} accessibilityRole="tablist" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {tabs.map((tab) => {
        const selected = tab.key === selectedKey;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.planned ? t('{label}, kommt später', { label: tab.label }) : tab.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [styles.underTab, pressed && styles.underPressed]}
          >
            <Text numberOfLines={1} style={[styles.underText, selected && styles.underTextSelected, tab.planned && !selected && styles.planned]}>
              {t(tab.label)}
            </Text>
          </Pressable>
        );
      })}
      {w ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.underBar,
            { width: w, transform: [{ translateX: Animated.multiply(at, w) }] },
          ]}
        />
      ) : null}
    </View>
  );
}

function PillSegments<K extends string>({ tabs, selectedKey, onChange, progress }: SegmentsProps<K>) {
  // Helle Pille gleitet zum gewählten Reiter (Bewegung „Schranke“, etwas langsamer).
  // Der gewählte Reiter bekommt seitlich mehr Polsterung; die Nachbarn rutschen mit (Daria, 31.10.2026).
  // Eine Lage `pos` (Index, auch Zwischenwerte) steuert Polsterung, Pille und Schriftfarbe gemeinsam.
  const index = Math.max(0, tabs.findIndex((tab) => tab.key === selectedKey));
  const [barWidth, setBarWidth] = useState(0);
  const [content, setContent] = useState<Partial<Record<K, number>>>({});
  const own = useRef(new Animated.Value(index)).current;
  const pos = progress ?? own;
  const placed = useRef(false);
  useEffect(() => {
    if (progress) return;
    if (!placed.current) {
      own.setValue(index);
      placed.current = true;
      return;
    }
    Animated.timing(own, {
      toValue: index,
      duration: motion.tabSwitch.duration,
      easing: Easing.bezier(...motion.barrier.bezier),
      useNativeDriver: false,
    }).start();
  }, [index, own, progress]);

  const widths = tabs.map((tab) => content[tab.key]);
  const rest = barWidth > 0 && widths.every((w) => w !== undefined) ? restLayouts(widths as number[], barWidth) : undefined;
  const steps = tabs.map((_, i) => i);
  const single = tabs.length < 2;
  const pill = rest
    ? {
        left: single ? rest[0].x : pos.interpolate({ inputRange: steps, outputRange: rest.map((l) => l.x), extrapolate: 'clamp' }),
        width: single ? rest[0].width : pos.interpolate({ inputRange: steps, outputRange: rest.map((l) => l.width), extrapolate: 'clamp' }),
      }
    : undefined;
  // Wie stark ein Reiter gerade gewählt ist: 1 unter der Pille, 0 daneben
  const weight = (i: number) =>
    single ? 1 : pos.interpolate({ inputRange: [i - 1, i, i + 1], outputRange: [0, 1, 0], extrapolate: 'clamp' });

  return (
    <View
      style={styles.segments}
      accessibilityRole="tablist"
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        setBarWidth((old) => (old === w ? old : w));
      }}
    >
      {pill ? <Animated.View pointerEvents="none" style={[styles.pill, pill]} /> : null}
      {tabs.map((tab, i) => {
        const selected = tab.key === selectedKey;
        const w = weight(i);
        const pad = typeof w === 'number' ? SEGMENT_PAD + PILL_EXTRA * w : w.interpolate({ inputRange: [0, 1], outputRange: [SEGMENT_PAD, SEGMENT_PAD + PILL_EXTRA] });
        return (
          <AnimatedPressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.planned ? t('{label}, kommt später', { label: tab.label }) : tab.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={[styles.segment, { paddingHorizontal: pad }, !pill && selected && styles.segmentSelected]}
          >
            <View
              style={styles.segmentInner}
              onLayout={(e) => {
                const cw = e.nativeEvent.layout.width;
                setContent((c) => (c[tab.key] === cw ? c : { ...c, [tab.key]: cw }));
              }}
            >
              <Animated.Text
                numberOfLines={1}
                style={[
                  styles.segmentText,
                  selected && styles.segmentTextSelected,
                  tab.planned && !selected && styles.planned,
                  // Schrift wird dunkel, während die Pille darübergleitet
                  pill ? { color: labelColor(pos, i) } : null,
                ]}
              >
                {t(tab.label)}
              </Animated.Text>
            </View>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Seitliche Polsterung je Reiter und Zuschlag für den gewählten Reiter */
const SEGMENT_PAD = space[8];
const PILL_EXTRA = space[8];
const BAR_PAD = space[4];

/**
 * Lage und Breite jedes Reiters, wenn er gewählt ist.
 * Rechnet wie Flexbox: Grundbreite = Inhalt + Polsterung, freier Platz zu gleichen Teilen (flexGrow 1),
 * fehlender Platz anteilig zur Grundbreite (flexShrink 1).
 */
function restLayouts(content: number[], barWidth: number) {
  const inner = barWidth - 2 * BAR_PAD;
  return content.map((_, k) => {
    const basis = content.map((c, j) => c + 2 * SEGMENT_PAD + (j === k ? 2 * PILL_EXTRA : 0));
    const sum = basis.reduce((a, b) => a + b, 0);
    const free = inner - sum;
    const width = (j: number) => (free >= 0 ? basis[j] + free / basis.length : basis[j] + (free * basis[j]) / sum);
    let x = BAR_PAD;
    for (let j = 0; j < k; j++) x += width(j);
    return { x, width: width(k) };
  });
}

/** Farbe eines Reiters je nach Lage der Pille: dunkel darunter, grau daneben. */
const labelColor = (pos: Animated.Value | Animated.AnimatedInterpolation<number>, i: number) =>
  pos.interpolate({
    inputRange: [i - 0.6, i, i + 0.6],
    outputRange: [color.text.secondary, color.bg.screen, color.text.secondary],
    extrapolate: 'clamp',
  });

/** Inhalt eines geplanten Reiters: Kater mit Hinweis, dass das Feature später kommt. */
export function PlannedHint({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.hint}>
      <KaterCard title={title}>{message}</KaterCard>
    </View>
  );
}

const styles = StyleSheet.create({
  taskDotLogo: { left: 28, right: undefined, top: -2 },
  row: { flexDirection: 'row' },
  noGrow: { flexGrow: 0, flexShrink: 0 },
  // Logo links; rechts sitzt die schwebende Kamera
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[16],
    paddingVertical: isFashionable ? 0 : space[8],
  },
  spacer: { width: size.touchTarget, height: size.touchTarget },
  logo: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  taskDot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.accent.signal,
    borderWidth: stroke.thin,
    borderColor: color.bg.screen,
  },
  // Fashionable Look: Kopf 44 hoch, Begrüßung kleiner und halbfett, 16 seitlich, 4 oben, 12 unten bis zum Umschalter
  greeting: isFashionable
    ? { paddingHorizontal: space[16], paddingTop: space[4], paddingBottom: space[12], gap: space[2] }
    : { paddingHorizontal: space[16], paddingTop: space[12], paddingBottom: space[8], gap: space[4] },
  greetingTitle: isFashionable
    ? { fontFamily: font.semiBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: color.text.primary }
    : { ...text.display, color: color.text.primary },
  greetingSub: isFashionable
    ? { fontFamily: font.regular, fontSize: 14, lineHeight: 18, color: color.text.secondary }
    : { fontFamily: font.light, fontSize: 15, lineHeight: 20, color: color.text.secondary },
  topBar: { paddingHorizontal: space[16], paddingTop: space[4], paddingBottom: space[4], gap: space[12] },
  topItem: { width: size.thumbnail, alignItems: 'center', gap: space[4] },
  thumbnail: {
    width: size.thumbnail,
    height: size.thumbnail,
    borderRadius: radius.full,
    borderWidth: stroke.thin,
    borderColor: color.accent.signal,
  },
  topTitle: { ...text.labelXs, color: color.accent.signal, textAlign: 'center', alignSelf: 'stretch' },
  segments: {
    flexDirection: 'row',
    width: '100%',
    padding: space[4],
    borderRadius: radius.full,
    backgroundColor: color.bg.surface,
  },
  pill: {
    position: 'absolute',
    top: space[4],
    bottom: space[4],
    borderRadius: radius.full,
    backgroundColor: color.text.primary,
  },
  // Breite nach Inhalt, damit vier Reiter neben die Kamera passen
  segment: { flexGrow: 1, flexShrink: 1, minHeight: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  segmentSelected: { backgroundColor: color.text.primary },
  segmentText: { fontFamily: font.regular, fontSize: 14, lineHeight: 18, color: color.text.secondary },
  segmentTextSelected: { fontFamily: font.medium, color: color.bg.screen },
  segmentInner: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  planned: { opacity: 0.6 },
  hint: { paddingHorizontal: space[16] },
  fashionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space[4],
    paddingRight: space[12],
    paddingBottom: space[8],
    paddingLeft: 14,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  wordmark: { fontFamily: font.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.4, color: color.text.primary },
  headIcons: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  headDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.accent.affection,
  },
  under: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: stroke.ultraThin,
    borderBottomColor: color.line.hairline,
  },
  // Mockup: Großbuchstaben halbfett 12, 0,5 Laufweite, 12 oben und 11 unten, Strich 1,5
  underTab: { flex: 1, paddingTop: 12, paddingBottom: 11, alignItems: 'center', justifyContent: 'center' },
  underPressed: { opacity: 0.5 },
  underText: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.5, textTransform: 'uppercase', color: color.text.secondary },
  underTextSelected: { color: color.text.primary },
  underBar: { position: 'absolute', left: 0, bottom: -stroke.ultraThin, height: 1.5, backgroundColor: color.text.primary },
});
