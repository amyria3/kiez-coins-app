import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, PanResponder, Platform, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button';
import { IconButton } from './IconButton';
import { Text } from './T';
import { t } from '../data/texts';
import { useAppDimensions } from '../theme/layout';
import { color, space, text } from '../theme/tokens';

/**
 * Profilbild zuschneiden (Daria, 29.10.2026): Foto im Kreis verschieben und zoomen, dann „Übernehmen“.
 * Mit einem Finger verschieben, mit zwei Fingern zoomen, oder mit Minus und Plus. Gespeichert wird ein Quadrat
 * mit 640 px Kantenlänge; der Kreis entsteht erst in der Anzeige.
 */
const MAX_ZOOM = 4;
const OUT = 640;

type Size = { w: number; h: number };

export function AvatarCropper({
  uri,
  onDone,
  onCancel,
}: {
  /** Foto zum Zuschneiden; leer = geschlossen */
  uri?: string;
  onDone: (uri: string) => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useAppDimensions();
  const frame = Math.round(Math.min(screenW - 2 * space[24], screenH * 0.5, 360));
  const [size, setSize] = useState<Size>();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  // Natürliche Größe des Fotos; beim Öffnen steht es mittig und füllt den Kreis
  useEffect(() => {
    setSize(undefined);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    if (!uri) return;
    Image.getSize(
      uri,
      (w, h) => setSize({ w, h }),
      () => setSize({ w: 1, h: 1 }),
    );
  }, [uri]);

  const base = size ? frame / Math.min(size.w, size.h) : 1;
  const shown = size ? { w: size.w * base * zoom, h: size.h * base * zoom } : { w: frame, h: frame };
  // Das Foto deckt den Kreis immer ganz ab
  const clampOffset = (o: { x: number; y: number }, z: number) => {
    if (!size) return o;
    const maxX = Math.max(0, (size.w * base * z - frame) / 2);
    const maxY = Math.max(0, (size.h * base * z - frame) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
  };

  // Aktueller Stand für die Gesten, ohne die Gesten bei jeder Änderung neu anzulegen
  const live = useRef({ zoom, offset, clampOffset });
  live.current = { zoom, offset, clampOffset };
  const start = useRef({ x: 0, y: 0, zoom: 1, dist: 0, touches: 0 });

  const pan = useMemo(() => {
    const distance = (e: GestureResponderEvent) => {
      const touches = e.nativeEvent.touches;
      if (!touches || touches.length < 2) return 0;
      return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
    };
    const begin = (e: GestureResponderEvent, dx = 0, dy = 0) => {
      const c = live.current;
      start.current = {
        x: c.offset.x - dx,
        y: c.offset.y - dy,
        zoom: c.zoom,
        dist: distance(e),
        touches: e.nativeEvent.touches?.length ?? 1,
      };
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => begin(e),
      onPanResponderMove: (e, g) => {
        const c = live.current;
        const touches = e.nativeEvent.touches?.length ?? 1;
        // Ein Finger kommt dazu oder geht: neu ansetzen, sonst springt das Foto
        if (touches !== start.current.touches) begin(e, g.dx, g.dy);
        let z = c.zoom;
        if (touches >= 2 && start.current.dist > 0) {
          z = Math.min(MAX_ZOOM, Math.max(1, (start.current.zoom * distance(e)) / start.current.dist));
          setZoom(z);
        }
        setOffset(c.clampOffset({ x: start.current.x + g.dx, y: start.current.y + g.dy }, z));
      },
    });
  }, []);

  const zoomBy = (factor: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(1, zoom * factor));
    setZoom(z);
    setOffset(clampOffset({ x: offset.x * (z / zoom), y: offset.y * (z / zoom) }, z));
  };

  const confirm = async () => {
    if (!uri || !size || busy) return;
    setBusy(true);
    try {
      // Ausschnitt in Pixeln des Originals: Kreis-Mitte minus Verschiebung, Kantenlänge = Rahmen / Maßstab
      const scale = base * zoom;
      const side = Math.min(size.w, size.h, frame / scale);
      const cx = size.w / 2 - offset.x / scale;
      const cy = size.h / 2 - offset.y / scale;
      const originX = Math.max(0, Math.min(size.w - side, cx - side / 2));
      const originY = Math.max(0, Math.min(size.h - side, cy - side / 2));
      const result = await manipulateAsync(
        uri,
        [
          { crop: { originX: Math.round(originX), originY: Math.round(originY), width: Math.round(side), height: Math.round(side) } },
          { resize: { width: Math.min(OUT, Math.round(side)) } },
        ],
        { format: SaveFormat.JPEG, compress: 0.85 },
      );
      onDone(result.uri);
    } catch {
      // Zum Beispiel ein Foto von einem fremden Server, das der Browser nicht zuschneiden darf: dann unverändert
      onDone(uri);
    } finally {
      setBusy(false);
    }
  };

  const ring = `M0 0H${frame}V${frame}H0Z M${frame / 2} 0A${frame / 2} ${frame / 2} 0 1 0 ${frame / 2} ${frame}A${frame / 2} ${frame / 2} 0 1 0 ${frame / 2} 0Z`;

  return (
    <Modal visible={!!uri} animationType="fade" onRequestClose={onCancel} transparent>
      <View style={[styles.screen, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[16] }]}>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            Ausschnitt wählen
          </Text>
          <Text style={styles.hint}>Verschiebe das Foto mit dem Finger, zoome mit zwei Fingern oder mit Minus und Plus.</Text>
        </View>
        <View
          style={[styles.frame, { width: frame, height: frame }, Platform.OS === 'web' && (styles.webFrame as object)]}
          {...pan.panHandlers}
          accessibilityLabel={t('Ausschnitt des Profilbilds')}
        >
          {uri && size ? (
            <Image
              source={{ uri }}
              style={{
                position: 'absolute',
                width: shown.w,
                height: shown.h,
                left: (frame - shown.w) / 2 + offset.x,
                top: (frame - shown.h) / 2 + offset.y,
              }}
              resizeMode="cover"
            />
          ) : null}
          {/* Fängt den Finger ab; im Browser würde sonst das Bild selbst gezogen */}
          <View style={StyleSheet.absoluteFill} />
          {/* Außerhalb des Kreises abgedunkelt, damit man sieht, was im Profilbild landet */}
          <Svg width={frame} height={frame} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Path d={ring} fillRule="evenodd" fill="rgba(0,0,0,0.55)" />
          </Svg>
          <View style={[styles.circle, { width: frame, height: frame, borderRadius: frame / 2 }]} pointerEvents="none" />
        </View>
        <View style={styles.zoomRow}>
          <IconButton icon="minus" accessibilityLabel={t('Kleiner')} onPress={() => zoomBy(1 / 1.2)} />
          <Text style={styles.zoomText}>{Math.round(zoom * 100)} %</Text>
          <IconButton icon="plus" accessibilityLabel={t('Größer')} onPress={() => zoomBy(1.2)} />
        </View>
        <View style={styles.actions}>
          <Button label={busy ? 'Wird zugeschnitten …' : 'Übernehmen'} busy={busy} onPress={confirm} disabled={!size || busy} />
          <Button label="Abbrechen" variant="ghost" onPress={onCancel} disabled={busy} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[24] },
  head: { alignSelf: 'stretch', gap: space[8] },
  title: { ...text.headline, color: color.text.primary },
  hint: { ...text.body, color: color.text.secondary },
  frame: { overflow: 'hidden', backgroundColor: color.bg.surface },
  webFrame: { touchAction: 'none', userSelect: 'none' } as object,
  circle: { position: 'absolute', left: 0, top: 0, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: space[16] },
  zoomText: { ...text.caption, color: color.text.secondary, minWidth: 48, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: space[8] },
});
