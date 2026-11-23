import { Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import type { Showcase } from '../../data/showcase';
import { CARD_PREVIEW_RATIO, cardPreviewUri } from '../../data/showcaseCard';
import { t } from '../../data/texts';
import { radius } from '../../theme/tokens';

/**
 * Vorschau der digitalen Visitenkarte (2026-11-23): überall dasselbe Bild wie in der Linkvorschau der Messenger,
 * in der Verwaltung, auf dem Visitenkarten-Bildschirm und auf der Webseite des Schaufensters. Die druckbare Karte
 * (vorne und hinten, 85 × 55 mm) zeigt nur ihr eigener Bildschirm, damit beides nicht verwechselt wird.
 */
export function CardPreview({ showcase, onPress }: { showcase: Showcase; onPress?: () => void }) {
  const image = (
    <Image
      source={{ uri: cardPreviewUri(showcase) }}
      style={styles.image}
      contentFit="cover"
      transition={150}
      accessibilityLabel={t('Visitenkarte von {name}', { name: showcase.name })}
    />
  );
  if (!onPress) return image;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t('Visitenkarte öffnen')}>
      {image}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Gelbgrün der Karte als Grund, bis das Bild geladen ist (Inhaltspalette der Visitenkarte)
  image: { width: '100%', aspectRatio: CARD_PREVIEW_RATIO, borderRadius: radius.md, backgroundColor: '#F0FFA6' },
});
