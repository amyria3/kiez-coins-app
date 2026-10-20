import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import type { Challenge } from '../data/types';
import { color, radius, size, space, stroke, text } from '../theme/tokens';
import { Cat, Wordmark } from './icons/Brand';
import { IconButton } from './IconButton';
import { SkeletonTopItem } from './Skeleton';

type AppHeaderProps = {
  onMenuPress: () => void;
  onCreatePress: () => void;
  /** Tipp auf Logo und Kater öffnet „Deine Reise“. */
  onLogoPress?: () => void;
  /** Langes Drücken aufs Logo öffnet das Demo-Menü (nur für Tests mit Beispieldaten). */
  onLogoLongPress?: () => void;
  /** Punkt am Kater: Bei einer Deiner Challenges bist Du dran. */
  hasTasks?: boolean;
};

/** Figma „AppHeader“: Burger-Menü links (Konto), Logo mit Kater in der Mitte, Kamera rechts. */
export function AppHeader({ onMenuPress, onCreatePress, onLogoPress, onLogoLongPress, hasTasks }: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <IconButton icon="burger" accessibilityLabel="Dein Konto" onPress={onMenuPress} />
      <Pressable
        onPress={onLogoPress}
        onLongPress={onLogoLongPress}
        accessibilityRole="button"
        accessibilityLabel={hasTasks ? 'Deine Reise, Du bist dran' : 'Deine Reise'}
        style={styles.logo}
      >
        <Wordmark />
        <View>
          <Cat height={36} />
          {hasTasks ? <View style={styles.taskDot} /> : null}
        </View>
      </Pressable>
      <IconButton icon="camera" accessibilityLabel="Challenge erstellen" onPress={onCreatePress} />
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

const tabs: { key: FeedTab; label: string }[] = [
  { key: 'nearby', label: 'Challenges in Deiner Nähe' },
  { key: 'wave', label: 'Wave Challenges' },
  { key: 'completed', label: 'Completed Challenges' },
];

/** Figma „TabsNavigation“ aus „TabItem“; die Auswahl filtert den Feed. */
export function TabsNavigation({ selectedKey, onChange }: { selectedKey: FeedTab; onChange: (key: FeedTab) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.noGrow}
      contentContainerStyle={styles.tabs}
      accessibilityRole="tablist"
    >
      {tabs.map((tab) => {
        const selected = tab.key === selectedKey;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={styles.tab}
          >
            <Text style={[text.body, { color: selected ? color.accent.primary : color.text.secondary }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  noGrow: { flexGrow: 0, flexShrink: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[8],
  },
  logo: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  taskDot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: color.accent.signal,
    borderWidth: stroke.thin,
    borderColor: color.bg.screen,
  },
  topBar: { paddingHorizontal: space[12], paddingVertical: space[6], gap: space[12] },
  topItem: { width: size.thumbnail, alignItems: 'center', gap: space[4] },
  thumbnail: {
    width: size.thumbnail,
    height: size.thumbnail,
    borderRadius: radius.full,
    borderWidth: stroke.thin,
    borderColor: color.accent.signal,
  },
  topTitle: { ...text.labelXs, color: color.accent.signal, textAlign: 'center', alignSelf: 'stretch' },
  tabs: { paddingHorizontal: space[4] },
  tab: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space[8], paddingVertical: space[12] },
});
