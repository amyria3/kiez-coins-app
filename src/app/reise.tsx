import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { SpeechBubble } from '../components/Content';
import { Cat } from '../components/icons/Brand';
import { SubScreen } from '../components/Screen';
import { anrede } from '../data/format';
import { catVariant, reiseEntries, reiseMood, reiseMoodText, type ReiseEntry } from '../data/reise';
import { useStore } from '../data/store';
import { color, radius, space, stroke, text } from '../theme/tokens';

/**
 * Route `reise` (Push, Tipp auf den Kater im Feed oder „Deine Reise“ im Konto).
 * „Deine Reise“: Status-Katze oben, darunter alle eigenen Challenges als quadratische Kacheln
 * mit Bild und Etikett. Ein Punkt zeigt, wo Du dran bist. Keine Reiter.
 */
export default function Reise() {
  const router = useRouter();
  const { challenges, currentUserId, profile } = useStore();
  const entries = useMemo(() => reiseEntries(challenges, currentUserId), [challenges, currentUserId]);
  const mood = reiseMood(entries);

  return (
    <SubScreen title="Deine Reise" navigation="back" onLeadingPress={() => router.back()}>
      <View style={styles.kater}>
        <Cat mood={catVariant(mood)} height={64} />
        <SpeechBubble style={styles.flex}>{reiseMoodText(mood, anrede(profile))}</SpeechBubble>
      </View>
      <View style={styles.grid}>
        {entries.map((entry) => (
          <ReiseCard key={entry.challenge.id} entry={entry} onPress={() => router.push(entry.href)} />
        ))}
      </View>
    </SubScreen>
  );
}

function ReiseCard({ entry, onPress }: { entry: ReiseEntry; onPress: () => void }) {
  const { challenge, label, needsAction } = entry;
  const image = challenge.image ?? challenge.imageAfter ?? challenge.report?.photo;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={needsAction ? `${label}, Du bist dran` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {image ? <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      <View style={styles.label}>
        <Text style={styles.labelText} numberOfLines={2}>
          {label}
        </Text>
      </View>
      {needsAction ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  kater: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space[12] },
  card: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.bg.surface,
    justifyContent: 'flex-end',
    padding: space[8],
  },
  pressed: { opacity: 0.8 },
  // Etikett wie ein Schildchen unten links (Vorbild „el hombre“)
  label: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: color.accent.primary,
    borderRadius: radius.sm,
    paddingHorizontal: space[8],
    paddingVertical: space[4],
    transform: [{ rotate: '-2deg' }],
  },
  labelText: { ...text.labelXs, color: color.text.primary },
  dot: {
    position: 'absolute',
    top: space[8],
    right: space[8],
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: color.accent.signal,
    borderWidth: stroke.thin,
    borderColor: color.bg.screen,
  },
});
