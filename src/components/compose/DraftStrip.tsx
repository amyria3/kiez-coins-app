import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { useRequireKiez } from '../../data/kiez';
import { useStore } from '../../data/store';
import { t } from '../../data/texts';
import type { Challenge } from '../../data/types';
import { color, radius, size, space, text } from '../../theme/tokens';
import { FieldGroup } from '../Content';
import { Icon } from '../icons/Icon';
import { Text } from '../T';

type Props = {
  /** 'private' (Reiter „Privat“), 'public' (Kiez und Überall) oder die id der Gruppe */
  target: 'private' | 'public' | string;
  /** Schließt das Erstellen-Blatt, bevor der Entwurf aufgeht */
  onClose: () => void;
};

/** Entwürfe, die zum gewählten Modus passen, neueste zuerst */
function useDrafts(target: Props['target']) {
  const { challenges, currentUserId } = useStore();
  return challenges
    .filter((c) => c.status === 'draft' && c.authorId === currentUserId)
    .filter((c) => (target === 'private' ? !!c.private : target === 'public' ? !c.private && !c.groupId : c.groupId === target))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Entwürfe beim Posten (Daria, 30.10.2026): oben im Erstellen-Blatt eine Zeile „Deine Entwürfe“ mit Kacheln
 * zum Wischen. Ein Tipp öffnet den Entwurf wie in „Deine Challenges“. Ohne Entwürfe fehlt die Zeile.
 */
export function DraftStrip({ target, onClose }: Props) {
  const router = useRouter();
  const requireKiez = useRequireKiez();
  const drafts = useDrafts(target);
  if (!drafts.length) return null;

  // Wie openDraft in manage.tsx
  const open = (c: Challenge) => {
    if (c.type === 'before_after') {
      onClose();
      router.push({ pathname: '/before-after/[id]', params: { id: c.id } });
    } else if (c.groupId) {
      onClose();
      router.push({ pathname: '/groups/[id]/task', params: { id: c.groupId, draftId: c.id } });
    } else if (requireKiez()) {
      onClose();
      router.push({ pathname: '/challenge/create/step-1', params: { draftId: c.id } });
    }
  };

  return (
    <FieldGroup label={`${t('Deine Entwürfe')} · ${drafts.length}`}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.bleed}>
        {drafts.map((c) => {
          const photo = c.image ?? c.imageBefore;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityLabel={t('{title} öffnen', { title: c.title || t('Ohne Titel') })}
              onPress={() => open(c)}
              style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
            >
              {photo ? (
                <Image source={photo} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]}>
                  <Icon name="camera" size={size.icon} color={color.text.secondary} />
                </View>
              )}
              <Text style={styles.title} numberOfLines={2}>
                {c.title || 'Ohne Titel'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </FieldGroup>
  );
}

const THUMB = 44;

const styles = StyleSheet.create({
  // Kacheln laufen bis an den Rand des Blatts
  bleed: { marginHorizontal: -space[16] },
  row: { gap: space[8], paddingHorizontal: space[16] },
  tile: {
    width: 176,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    padding: space[8],
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
  },
  pressed: { opacity: 0.7 },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.sm },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg.screen },
  title: { ...text.body, color: color.text.primary, flex: 1 },
});
