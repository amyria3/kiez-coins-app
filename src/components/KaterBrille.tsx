import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';

import { t } from '../data/texts';

// Darias Kater aus Figma (Übergabe/KiezCoins Cat.svg und .mp4, 02.11.2026), Fläche 1300 × 1885.
// Körper mit Aussparung für die Gläser, darunter das Video der schimmernden Gläser.
const KOERPER = require('../../assets/kater/start-kater.png');
const GLAESER = require('../../assets/kater/start-kater-brille.png');
const VIDEO = require('../../assets/kater/start-brille.mp4');
const W = 1300;
const H = 1885;
// Ausschnitt des Videos auf der Fläche; das Video läuft vor und zurück, damit die Schleife nahtlos ist
const CLIP = { x: 430, y: 423, w: 374, h: 188 };

/**
 * Cat The Käptn mit Besen vor gelbem Kreis, die Gläser der Sonnenbrille schimmern (Daria, 02.11.2026).
 * Bis das Video sein erstes Bild zeigt und bei „Bewegung reduzieren“ stehen die Gläser still.
 */
export function KaterBrille({ width }: { width: number }) {
  const s = width / W;
  const height = H * s;
  const [still, setStill] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const player = useVideoPlayer(VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
  });
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => {});
  }, []);
  useEffect(() => {
    if (still) player.pause();
    else player.play();
  }, [still, player]);

  const flaeche = { position: 'absolute' as const, left: 0, top: 0, width, height };
  return (
    <View
      style={{ width, height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('Cat The Käptn mit Sonnenbrille, Schürze und Besen')}
    >
      <Image source={GLAESER} style={flaeche} contentFit="contain" />
      {still ? null : (
        <VideoView
          player={player}
          style={[
            styles.video,
            { left: CLIP.x * s, top: CLIP.y * s, width: CLIP.w * s, height: CLIP.h * s, opacity: laeuft ? 1 : 0 },
          ]}
          contentFit="fill"
          nativeControls={false}
          playsInline
          surfaceType="textureView"
          useExoShutter={false}
          allowsPictureInPicture={false}
          onFirstFrameRender={() => setLaeuft(true)}
        />
      )}
      <Image source={KOERPER} style={flaeche} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  video: { position: 'absolute' },
});
