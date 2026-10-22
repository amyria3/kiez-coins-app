import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './T';
import { Image } from 'expo-image';

import { challengeTypes, isTypeActive } from '../data/features';
import type { Challenge } from '../data/types';
import { color, font, motion, radius, size, space, stroke, text } from '../theme/tokens';
import { KaterCard } from './Content';
import { Logo } from './icons/Brand';
import { SkeletonTopItem } from './Skeleton';
import { t } from '../data/texts';

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
export function AppHeader({ onLogoPress, onLogoLongPress, hasTasks }: AppHeaderProps) {
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
          <Logo height={30} />
          {hasTasks ? <View style={[styles.taskDot, styles.taskDotLogo]} /> : null}
        </View>
      </Pressable>
      <View style={styles.spacer} />
    </View>
  );
}

/** Begrüßung über dem Feed: Tageszeit, Ansprache, Kiez und Anzahl offener Challenges. */
export function FeedGreeting({ name, kiez, count }: { name: string; kiez?: string; count: number }) {
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend';
  const countText = count === 1 ? '1 Challenge in Deiner Nähe' : t('{count} Challenges in Deiner Nähe', { count });
  return (
    <View style={styles.greeting}>
      <Text style={styles.greetingTitle} accessibilityRole="header">
        {greeting}, {name}
      </Text>
      <Text style={styles.greetingSub}>{kiez ? `${kiez} · ${countText}` : countText}</Text>
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

export type FeedTab = 'nearby' | 'wave' | 'completed' | 'groups';

// Wave und Pleasure sind raus aus der Leiste (Daria, 22.10.2026). Die Filter in feed.tsx bleiben für später.
const tabs: { key: FeedTab; label: string; planned?: boolean }[] = [
  { key: 'nearby', label: 'In der Nähe' },
  { key: 'groups', label: 'Gruppen' },
];

type TabsNavigationProps = {
  selectedKey: FeedTab;
  onChange: (key: FeedTab) => void;
};

/**
 * Figma „TabsNavigation“, Upgrade „Nachtschicht“: Segmente auf einer Pille; die Auswahl filtert den Feed.
 * Abgeschaltete Challenge-Typen (data/features.ts) sind gedimmt, lassen sich aber öffnen:
 * Der Feed zeigt dann einen Hinweis und vorhandene Challenges dieses Typs.
 */
export function TabsNavigation({ selectedKey, onChange }: TabsNavigationProps) {
  return <Segments tabs={tabs} selectedKey={selectedKey} onChange={onChange} />;
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
export function Segments<K extends string>({ tabs, selectedKey, onChange, progress }: SegmentsProps<K>) {
  // Helle Pille gleitet zum gewählten Reiter (Bewegung „Schranke“, etwas langsamer)
  const [layouts, setLayouts] = useState<Partial<Record<K, { x: number; width: number }>>>({});
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);
  const target = layouts[selectedKey];
  const all = tabs.map((t) => layouts[t.key]);
  const measured = all.every(Boolean) ? (all as { x: number; width: number }[]) : undefined;
  // Mit `progress`: Lage und Breite der Pille direkt aus der Wischbewegung
  const follow =
    progress && measured && measured.length > 1
      ? {
          left: progress.interpolate({ inputRange: measured.map((_, i) => i), outputRange: measured.map((l) => l.x), extrapolate: 'clamp' }),
          width: progress.interpolate({ inputRange: measured.map((_, i) => i), outputRange: measured.map((l) => l.width), extrapolate: 'clamp' }),
        }
      : undefined;
  useEffect(() => {
    if (!target || follow) return;
    if (!placed.current) {
      pillX.setValue(target.x);
      pillW.setValue(target.width);
      placed.current = true;
      return;
    }
    const timing = (value: Animated.Value, toValue: number) =>
      Animated.timing(value, {
        toValue,
        duration: motion.tabSwitch.duration,
        easing: Easing.bezier(...motion.barrier.bezier),
        useNativeDriver: false,
      });
    Animated.parallel([timing(pillX, target.x), timing(pillW, target.width)]).start();
  }, [target?.x, target?.width, pillX, pillW, follow]);
  const left = follow?.left ?? pillX;

  return (
    <View style={styles.segments} accessibilityRole="tablist">
      {target ? (
        <Animated.View pointerEvents="none" style={[styles.pill, { left, width: follow?.width ?? pillW }]} />
      ) : null}
      {tabs.map((tab) => {
        const selected = tab.key === selectedKey;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.planned ? t('{label}, kommt später', { label: tab.label }) : tab.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              setLayouts((l) => (l[tab.key]?.x === x && l[tab.key]?.width === width ? l : { ...l, [tab.key]: { x, width } }));
            }}
            style={[styles.segment, !target && selected && styles.segmentSelected]}
          >
            <View style={styles.segmentInner}>
              <Animated.Text
                numberOfLines={1}
                style={[
                  styles.segmentText,
                  selected && styles.segmentTextSelected,
                  tab.planned && !selected && styles.planned,
                  // Schrift wird dunkel, während die Pille darübergleitet
                  layouts[tab.key] ? { color: labelColor(left, layouts[tab.key]!) } : null,
                ]}
              >
                {t(tab.label)}
              </Animated.Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Farbe eines Reiters je nach Lage der Pille: dunkel darunter, grau daneben. */
const labelColor = (pillX: Animated.Value | Animated.AnimatedInterpolation<number>, l: { x: number; width: number }) =>
  pillX.interpolate({
    inputRange: [l.x - l.width * 0.6, l.x, l.x + l.width * 0.6],
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
    paddingVertical: space[8],
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
  greeting: { paddingHorizontal: space[16], paddingTop: space[12], paddingBottom: space[8], gap: space[4] },
  greetingTitle: { ...text.display, color: color.text.primary },
  greetingSub: { fontFamily: font.light, fontSize: 15, lineHeight: 20, color: color.text.secondary },
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
  segment: { flexGrow: 1, flexShrink: 1, paddingHorizontal: space[8], minHeight: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  segmentSelected: { backgroundColor: color.text.primary },
  segmentText: { fontFamily: font.regular, fontSize: 14, lineHeight: 18, color: color.text.secondary },
  segmentTextSelected: { fontFamily: font.medium, color: color.bg.screen },
  segmentInner: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  planned: { opacity: 0.6 },
  hint: { paddingHorizontal: space[16] },
});
