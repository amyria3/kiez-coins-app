import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { challengeTypes, isTypeActive } from '../data/features';
import type { Challenge } from '../data/types';
import { color, font, radius, size, space, stroke, text } from '../theme/tokens';
import { Cat, Wordmark } from './icons/Brand';
import { SkeletonTopItem } from './Skeleton';

type AppHeaderProps = {
  /** Tipp auf Logo und Kater öffnet „Deine Reise“. */
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
      <View style={styles.spacer} />
      <Pressable
        onPress={onLogoPress}
        onLongPress={onLogoLongPress}
        accessibilityRole="button"
        accessibilityLabel={hasTasks ? 'Deine Reise, Du bist dran' : 'Deine Reise'}
        style={styles.logo}
      >
        <Wordmark />
        <View>
          <Cat height={30} />
          {hasTasks ? <View style={styles.taskDot} /> : null}
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
  const countText = count === 1 ? '1 Challenge in Deiner Nähe' : `${count} Challenges in Deiner Nähe`;
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

export type FeedTab = 'nearby' | 'wave' | 'completed';

const tabs: { key: FeedTab; label: string; planned?: boolean }[] = [
  { key: 'nearby', label: 'In der Nähe' },
  { key: 'wave', label: challengeTypes.wave.label, planned: !isTypeActive('wave') },
  { key: 'completed', label: 'Erledigt' },
];

type TabsNavigationProps = {
  selectedKey: FeedTab;
  onChange: (key: FeedTab) => void;
  /** Tipp auf einen geplanten Reiter: Hinweis zeigen, Auswahl bleibt. */
  onPlannedPress?: (key: FeedTab) => void;
};

/**
 * Figma „TabsNavigation“, Upgrade „Nachtschicht“: Segmente auf einer Pille; die Auswahl filtert den Feed.
 * Abgeschaltete Challenge-Typen (data/features.ts) sind gedimmt und tragen „bald“.
 */
export function TabsNavigation({ selectedKey, onChange, onPlannedPress }: TabsNavigationProps) {
  return (
    <View style={styles.segments} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = tab.key === selectedKey;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.planned ? `${tab.label}, geplant` : tab.label}
            accessibilityState={{ selected, disabled: tab.planned }}
            onPress={() => (tab.planned ? onPlannedPress?.(tab.key) : onChange(tab.key))}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <View style={styles.segmentInner}>
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected, tab.planned && styles.planned]}>
                {tab.label}
              </Text>
              {tab.planned ? <Text style={styles.soon}>bald</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Hinweis unter den Segmenten: Der Reiter ist geplant. */
export function PlannedHint({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <Pressable
      onPress={onClose}
      accessibilityRole="button"
      accessibilityLabel={`${message} Hinweis schließen`}
      style={styles.hint}
    >
      <Cat height={30} />
      <Text style={styles.hintText}>{message}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  noGrow: { flexGrow: 0, flexShrink: 0 },
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
  greeting: { paddingHorizontal: space[20], paddingTop: space[16], paddingBottom: space[12], gap: space[4] },
  greetingTitle: { ...text.display, color: color.text.primary },
  greetingSub: { fontFamily: font.light, fontSize: 15, lineHeight: 20, color: color.text.secondary },
  topBar: { paddingHorizontal: space[16], paddingBottom: space[16], gap: space[12] },
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
    marginHorizontal: space[16],
    marginBottom: space[12],
    padding: space[4],
    borderRadius: radius.full,
    backgroundColor: color.bg.surface,
  },
  segment: { flex: 1, minHeight: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  segmentSelected: { backgroundColor: color.text.primary },
  segmentText: { fontFamily: font.regular, fontSize: 14, lineHeight: 18, color: color.text.secondary },
  segmentTextSelected: { fontFamily: font.medium, color: color.bg.screen },
  segmentInner: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  planned: { opacity: 0.6 },
  soon: {
    fontFamily: font.medium,
    fontSize: 10,
    lineHeight: 14,
    color: color.accent.signal,
    borderWidth: stroke.thin,
    borderColor: color.accent.signal,
    borderRadius: radius.full,
    paddingHorizontal: space[6],
    overflow: 'hidden',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    marginHorizontal: space[16],
    marginBottom: space[12],
    paddingVertical: space[12],
    paddingHorizontal: space[16],
    borderRadius: radius.xl,
    backgroundColor: color.bg.surface,
  },
  hintText: { flex: 1, fontFamily: font.light, fontSize: 14, lineHeight: 20, color: color.text.primary },
});
