import { useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, TextInput, View } from 'react-native';

import type { PhotoText as PhotoTextValue } from '../data/types';
import { t } from '../data/texts';
import { font, radius, space } from '../theme/tokens';
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
  // Ebene auf dem Foto beim Erstellen: im Browser ohne Markieren und ohne Scrollen beim Ziehen
  layer: Platform.OS === 'web' ? ({ cursor: 'text', userSelect: 'none', touchAction: 'pan-y' } as object) : {},
  labelGrab: Platform.OS === 'web' ? ({ cursor: 'grab', touchAction: 'none' } as object) : {},
  input: { padding: 0, minWidth: 40, outlineStyle: 'none' } as never,
});

/**
 * Text direkt auf dem Foto schreiben (Daria, 30.10.2026): Tippen aufs Foto setzt den Text an diese Stelle und
 * öffnet die Eingabe. Den fertigen Text verschiebt man mit dem Finger, Tippen darauf bearbeitet ihn.
 * Liegt als Ebene über dem Foto im `PhotoPicker`; der Titel liegt darüber.
 */
export function PhotoTextOnPhoto({
  value,
  onChange,
}: {
  value?: PhotoTextValue;
  onChange: (value: PhotoTextValue | undefined) => void;
}) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [label, setLabel] = useState({ w: 0, h: 0 });
  const [editing, setEditing] = useState(false);
  const layer = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });
  const measure = () => layer.current?.measure((_x, _y, _w, _h, px, py) => (origin.current = { x: px, y: py }));
  const latest = useRef({ value, box, label, editing, onChange });
  latest.current = { value, box, label, editing, onChange };
  const start = useRef({ x: 0.5, y: 0.5, onLabel: false, moved: false });

  // Eine Geste für die ganze Ebene: kurz tippen setzt den Text (oder bearbeitet ihn, wenn man ihn trifft),
  // ziehen auf dem Text verschiebt ihn. Im Browser fehlen bei Pressable die Koordinaten, daher hier selbst gerechnet.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.editing,
      onMoveShouldSetPanResponder: () => !latest.current.editing,
      // Nur wer den Text zieht, behält die Geste; sonst darf die Seite scrollen
      onPanResponderTerminationRequest: () => !start.current.onLabel,
      onPanResponderGrant: (_, g) => {
        measure();
        const { value: v, box: b, label: l } = latest.current;
        const px = g.x0 - origin.current.x;
        const py = g.y0 - origin.current.y;
        const lx = v ? clamp(v.x * b.w - l.w / 2, 0, Math.max(0, b.w - l.w)) : -1;
        const ly = v ? clamp(v.y * b.h - l.h / 2, 0, Math.max(0, b.h - l.h)) : -1;
        const onLabel = !!v?.text.trim() && px >= lx - 8 && px <= lx + l.w + 8 && py >= ly - 8 && py <= ly + l.h + 8;
        start.current = { x: v?.x ?? 0.5, y: v?.y ?? 0.5, onLabel, moved: false };
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) + Math.abs(g.dy) > 4) start.current.moved = true;
        const { value: v, box: b, onChange: change } = latest.current;
        if (!start.current.moved || !start.current.onLabel || !v) return;
        change({ ...v, x: clamp(start.current.x + g.dx / (b.w || 1), 0.05, 0.95), y: clamp(start.current.y + g.dy / (b.h || 1), 0.05, 0.95) });
      },
      onPanResponderRelease: (_, g) => {
        if (start.current.moved) return;
        if (start.current.onLabel) {
          setEditing(true);
          return;
        }
        const { value: v, box: b, onChange: change } = latest.current;
        if (!b.w || !b.h) return;
        const x = (g.x0 - origin.current.x) / b.w;
        const y = (g.y0 - origin.current.y) / b.h;
        change({ text: v?.text ?? '', x: clamp(x, 0.05, 0.95), y: clamp(y, 0.05, 0.95) });
        setEditing(true);
      },
    }),
  ).current;

  const finish = () => {
    setEditing(false);
    if (!latest.current.value?.text.trim()) onChange(undefined);
  };

  const hasText = !!value?.text.trim();
  const left = value ? clamp(value.x * box.w - label.w / 2, 0, Math.max(0, box.w - label.w)) : 0;
  const top = value ? clamp(value.y * box.h - label.h / 2, 0, Math.max(0, box.h - label.h)) : 0;
  return (
    <View
      ref={layer}
      style={[StyleSheet.absoluteFill, styles.layer]}
      onLayout={(e) => {
        setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
        measure();
      }}
      accessibilityRole="button"
      accessibilityLabel={hasText ? t('Text auf dem Foto hierhin verschieben') : t('Text aufs Foto schreiben')}
      {...pan.panHandlers}
    >
      {value && (editing || hasText) ? (
        <View
          style={[styles.label, styles.labelGrab, { left, top, maxWidth: box.w * 0.86 || undefined, opacity: label.w ? 1 : 0 }]}
          onLayout={(e) => setLabel({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        >
          {editing ? (
            <TextInput
              autoFocus
              value={value.text}
              onChangeText={(v) => onChange({ ...value, text: v.slice(0, PHOTO_TEXT_MAX) })}
              onBlur={finish}
              onSubmitEditing={finish}
              blurOnSubmit
              maxLength={PHOTO_TEXT_MAX}
              placeholder={t('Text')}
              placeholderTextColor="rgba(255,255,255,0.7)"
              selectionColor="#FFFFFF"
              accessibilityLabel={t('Text auf dem Foto')}
              style={[styles.text, styles.input]}
            />
          ) : (
            <Text style={styles.text}>{value.text.trim()}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}
