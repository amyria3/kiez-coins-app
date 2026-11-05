import { Pressable, type StyleProp, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { Text } from './T';
import { t } from '../data/texts';

/**
 * Zahl neben dem Herz als eigener Knopf: öffnet, wer den Post geliked hat (Daria, 2026-11-05).
 * Das Herz selbst bleibt der Knopf zum Liken.
 */
export function LikeCount({ challengeId, count, style }: { challengeId: string; count?: number; style: StyleProp<TextStyle> }) {
  const router = useRouter();
  if (!count) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('{likeCount} Likes ansehen', { likeCount: count })}
      onPress={() => router.push({ pathname: '/challenge/[id]/likes', params: { id: challengeId } })}
      hitSlop={{ top: 12, bottom: 12, left: 4, right: 12 }}
      // Rechts so viel Luft wie früher im gemeinsamen Knopf
      style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center', paddingRight: 6 }, pressed ? { opacity: 0.6 } : null]}
    >
      <Text style={style}>{count}</Text>
    </Pressable>
  );
}
