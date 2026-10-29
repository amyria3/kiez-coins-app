import { useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import type { ImageSource, PhotoText as PhotoTextValue } from '../data/types';
import { t } from '../data/texts';
import { color, font, radius, space } from '../theme/tokens';
import { TextField } from './Form';
import { Text } from './T';

/**
 * Text auf dem Foto, nur bei „Nur ein Bild“ (Daria, 29.10.2026). Gespeichert sind Text und Lage als Anteil der
 * Fläche (x, y von 0 bis 1, Mitte des Texts). Das Foto bleibt unverändert; Feed, Detail und Vorschau legen den
 * Text darüber.
 */
export const PHOTO_TEXT_MAX = 80;

/** Text über dem Foto. Liegt absolut im Eltern-Element, das das Foto zeigt. */
export function PhotoTextOverlay({ value, size = 'feed' }: { value?: PhotoTextValue; size?: 'feed' | 'hero' }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [label, setLabel] = useState({ w: 0, h: 0 });
  if (!value?.text.trim()) return null;
  const left = clamp(value.x * box.w - label.w / 2, 0, Math.max(0, box.w - label.w));
  const top = clamp(value.y * box.h - label.h / 2, 0, Math.max(0, box.h - label.h));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <View
        style={[styles.label, { left, top, opacity: box.w && label.w ? 1 : 0, maxWidth: box.w * 0.86 || undefined }]}
        onLayout={(e) => setLabel({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        <Text style={[styles.text, size === 'hero' && styles.textHero]}>{value.text.trim()}</Text>
      </View>
    </View>
  );
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Eingabe und Vorschau: Text tippen, dann mit dem Finger auf dem Foto verschieben. */
export function PhotoTextEditor({
  photo,
  value,
  onChange,
}: {
  photo?: ImageSource;
  value?: PhotoTextValue;
  onChange: (value: PhotoTextValue | undefined) => void;
}) {
  const current = value ?? { text: '', x: 0.5, y: 0.5 };
  const box = useRef({ w: 1, h: 1 });
  const start = useRef({ x: 0.5, y: 0.5 });
  const latest = useRef(current);
  latest.current = current;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        start.current = { x: latest.current.x, y: latest.current.y };
      },
      onPanResponderMove: (_, g) => {
        onChange({
          ...latest.current,
          x: clamp(start.current.x + g.dx / box.current.w, 0.05, 0.95),
          y: clamp(start.current.y + g.dy / box.current.h, 0.05, 0.95),
        });
      },
    }),
  ).current;

  if (!photo) return null;
  const hasText = !!current.text.trim();
  return (
    <View style={styles.editor}>
      <TextField
        label="Text auf dem Foto"
        helperText={hasText ? t('Verschiebe den Text mit dem Finger.') : t('Freiwillig, höchstens {max} Zeichen.', { max: PHOTO_TEXT_MAX })}
        value={current.text}
        onChangeText={(v) => onChange(v ? { ...current, text: v.slice(0, PHOTO_TEXT_MAX) } : undefined)}
        maxLength={PHOTO_TEXT_MAX}
      />
      {hasText ? (
        <View
          style={styles.preview}
          onLayout={(e) => (box.current = { w: e.nativeEvent.layout.width || 1, h: e.nativeEvent.layout.height || 1 })}
          {...pan.panHandlers}
          accessibilityLabel={t('Vorschau mit Text auf dem Foto')}
        >
          <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
          <PhotoTextOverlay value={current} />
          {/* Fängt den Finger ab. Im Browser würde sonst das Foto gezogen oder Text markiert, das bricht das Verschieben ab. */}
          <View style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    paddingHorizontal: space[8],
    paddingVertical: space[4],
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  text: {
    fontFamily: font.semiBold,
    fontSize: 18,
    lineHeight: 22,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  textHero: { fontSize: 24, lineHeight: 29 },
  editor: { gap: space[8] },
  // Etwa wie die Karte im Feed
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: color.bg.surface,
    ...(Platform.OS === 'web' ? ({ userSelect: 'none', cursor: 'grab', touchAction: 'none' } as object) : {}),
  },
});
