import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/T';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthorRow } from '../../../components/AuthorRow';
import { KaterCard } from '../../../components/Content';
import { StatusBadge } from '../../../components/Badges';
import { Button } from '../../../components/Button';
import { DeadlineBadge } from '../../../components/Badges';
import { markComposeDone } from '../../../components/compose/compose';
import { CoinsIcon } from '../../../components/icons/Brand';
import { Icon } from '../../../components/icons/Icon';
import { HeroScreen } from '../../../components/Screen';
import { formatBountyShort, formatRemainingShort } from '../../../data/format';
import { useCurrentUser, useStore } from '../../../data/store';
import { color, font, motion, radius, size, space, stroke, text } from '../../../theme/tokens';
import { useAppDimensions } from '../../../theme/layout';
import { useDraft } from './_layout';

/** Breite des ausgeblurrten Rands links und rechts (schmal, Daria 22.10.2026) */
const EDGE = space[8];
const NO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 };
/** Rundung des scharfen Fensters innen */
const WINDOW_RADIUS = radius.card;

/** Rechteck mit abgerundetem Loch als SVG-Pfad (evenodd): außen der Bildschirm, innen das Fenster. */
function framePath(w: number, h: number, x: number, y: number, iw: number, ih: number, r: number) {
  const outer = `M0 0H${w}V${h}H0Z`;
  const inner =
    `M${x + r} ${y}H${x + iw - r}A${r} ${r} 0 0 1 ${x + iw} ${y + r}V${y + ih - r}` +
    `A${r} ${r} 0 0 1 ${x + iw - r} ${y + ih}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + ih - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  return `${outer} ${inner}`;
}
/** Höhe der Button-Leiste unten (Button 52 + Abstand oben) */
const BAR = 52 + space[12];

/**
 * Route `challenge/create/preview`. Vorschau vor dem Veröffentlichen: die Challenge so, wie sie im Detail
 * erscheint, mit ausgeblurrtem Rand. Unten ein langer Button „Veröffentlichen“, links daneben ein kleiner
 * „Bearbeiten“ zurück zu Schritt 2.
 */
export default function CreatePreview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [draft] = useDraft();
  const user = useCurrentUser();
  const { canOfferBounties, createChallenge, publishDraft } = useStore();
  const [busy, setBusy] = useState(false);

  const deadline = new Date(Date.now() + draft.durationDays * 24 * 60 * 60 * 1000).toISOString();
  const isPhoto = draft.type === 'photo';
  const bountyAmount = isPhoto ? undefined : draft.bountyAmount;
  const bottom = Math.max(insets.bottom, space[16]);
  const top = insets.top + space[8];
  const { width: screenW, height: screenH } = useAppDimensions();
  const windowBottom = BAR + bottom + space[8];
  // Fenster für die Vorschau: Der Post wird so verkleinert, dass er genau hineinpasst
  const iw = screenW - 2 * EDGE;
  const ih = screenH - top - windowBottom;
  const scale = iw / screenW;
  const innerH = ih / scale;
  const frame = framePath(screenW, screenH, EDGE, top, iw, ih, WINDOW_RADIUS);

  // Kater fragt oben nach, ob alles drin ist
  const ask = useRef(new Animated.Value(0)).current;
  const [asking, setAsking] = useState(true);
  useEffect(() => {
    Animated.spring(ask, { toValue: 1, delay: 350, useNativeDriver: true, ...motion.barrierSpring }).start();
  }, [ask]);
  const framePathUrl = `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${screenW}" height="${screenH}" viewBox="0 0 ${screenW} ${screenH}"><path d="${frame}" fill-rule="evenodd" fill="#000"/></svg>`,
  )}")`;

  // Innerhalb des Fensters lässt sich die Vorschau seitlich verschieben. Sie steht immer mittig und federt zurück.
  const shiftX = useRef(new Animated.Value(0)).current;
  const singlePhoto = draft.extras.length === 0;
  const pan = useMemo(() => {
    const clamp = (v: number) => Math.max(-EDGE, Math.min(EDGE, v));
    const horizontal = (dx: number, dy: number) => Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 2;
    return PanResponder.create({
      // Ein Foto: seitlich ziehen verschiebt die Vorschau. Mehrere Fotos: erst wischen die Fotos.
      onMoveShouldSetPanResponderCapture: (_, g) => singlePhoto && horizontal(g.dx, g.dy),
      onMoveShouldSetPanResponder: (_, g) => horizontal(g.dx, g.dy),
      onPanResponderMove: (_, g) => {
        const raw = g.dx;
        // Über den Rand hinaus nur mit Widerstand
        const over = raw - clamp(raw);
        shiftX.setValue(clamp(raw) + over * 0.2);
      },
      // Loslassen: zurück in die Mitte
      onPanResponderRelease: () =>
        Animated.spring(shiftX, { toValue: 0, useNativeDriver: true, ...motion.barrierSpring }).start(),
      onPanResponderTerminate: () =>
        Animated.spring(shiftX, { toValue: 0, useNativeDriver: true, ...motion.barrierSpring }).start(),
    });
  }, [shiftX, singlePhoto]);

  const publish = async () => {
    if (!draft.photo || busy) return;
    if (bountyAmount && !canOfferBounties) {
      Alert.alert(
        'Keine Coins möglich',
        'Nach einer Meldung wegen nicht gezahlter Coins kannst Du keine Coins mehr anbieten. Challenges ohne Coins gehen weiterhin.',
      );
      return;
    }
    setBusy(true);
    try {
      const id = draft.id
        ? await publishDraft(
            draft.id,
            {
              type: draft.type,
              title: draft.title,
              text: draft.text,
              location: draft.location,
              bountyAmount,
              photo: draft.imagePath ? undefined : draft.photo,
              imagePath: draft.imagePath,
              coords: draft.coords,
              extras: draft.extras,
            },
            deadline,
          )
        : await createChallenge({
            type: draft.type,
            title: draft.title.trim(),
            text: draft.text.trim(),
            location: draft.location.trim(),
            bountyAmount,
            photo: draft.photo,
            deadline,
            coords: draft.coords,
            extras: draft.extras,
          });
      markComposeDone();
      router.replace({ pathname: '/challenge/create/success', params: { id } });
    } catch (error) {
      Alert.alert('Nicht veröffentlicht', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!draft.photo) return null;

  const summary = (
    <>
      <View style={styles.statusRow}>
        <StatusBadge status="open" showOpen photo={isPhoto} />
        <Text style={styles.caption}>gerade eben</Text>
      </View>
      <Text style={styles.headline} accessibilityRole="header">
        {draft.title.trim()}
      </Text>
      <View style={styles.metrics}>
        {bountyAmount ? (
          <View style={styles.metric}>
            <CoinsIcon height={28} />
            <Text style={styles.metricLabel}>Coins</Text>
            <Text style={[styles.metricValue, styles.signal]}>{formatBountyShort(bountyAmount)}</Text>
          </View>
        ) : null}
        {isPhoto ? null : (
          <View style={styles.deadline}>
            <DeadlineBadge deadline={deadline} />
          </View>
        )}
      </View>
    </>
  );

  return (
    <View style={styles.screen}>
      <Animated.View
        style={[styles.window, { left: EDGE, top, width: iw, height: ih, transform: [{ translateX: shiftX }] }]}
        {...pan.panHandlers}
      >
      <View
        style={{
          width: screenW,
          height: innerH,
          transform: [{ translateX: (iw - screenW) / 2 }, { translateY: (ih - innerH) / 2 }, { scale }],
        }}
      >
      <SafeAreaInsetsContext.Provider value={NO_INSETS}>
      <HeroScreen
        image={draft.photo}
        moreImages={draft.extras.map((e) => e.photo)}
        imageLabel={draft.title}
        onBackPress={() => router.back()}
        summary={summary}
      >
        {draft.text.trim() ? <Text style={styles.description}>{draft.text.trim()}</Text> : null}
        <View style={styles.authorBlock}>
          <AuthorRow user={user} location={draft.location.trim()} />
        </View>
      </HeroScreen>
      </SafeAreaInsetsContext.Provider>
      </View>
      </Animated.View>

      {/* Ausgeblurrter Rand mit innen abgerundetem Fenster, ohne Tönung. Die Mitte bleibt scharf. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Platform.OS === 'web' ? (
          // Browser: Unschärfe per CSS, das Fenster schneidet eine SVG-Maske aus
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              maskImage: framePathUrl,
              WebkitMaskImage: framePathUrl,
              maskSize: '100% 100%',
              WebkitMaskSize: '100% 100%',
            }}
          />
        ) : (
          <MaskedView
            style={StyleSheet.absoluteFill}
            maskElement={
              // Nur die Deckkraft zählt: deckend = Unschärfe, Loch = scharfes Fenster
              <Svg width={screenW} height={screenH}>
                <Path d={frame} fillRule="evenodd" fill="#000" />
              </Svg>
            }
          >
            <BlurView intensity={40} tint="default" style={StyleSheet.absoluteFill} />
          </MaskedView>
        )}
      </View>

      {asking ? (
        <Animated.View
          style={[
            styles.ask,
            {
              top: top + space[8],
              opacity: ask,
              transform: [{ translateY: ask.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }, { scale: ask.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
            },
          ]}
        >
          <Pressable accessibilityRole="button" accessibilityLabel="Hinweis schließen" onPress={() => setAsking(false)}>
            <KaterCard>Alle Infos drin?</KaterCard>
          </Pressable>
        </Animated.View>
      ) : null}

      <View style={[styles.bar, { paddingBottom: bottom }]}>
        <Button label="Bearbeiten" variant="secondary" onPress={() => router.back()} disabled={busy} />
        <Button
          label={busy ? 'Wird veröffentlicht …' : 'Veröffentlichen'}
          onPress={publish}
          busy={busy}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  flex: { flex: 1 },
  window: { position: 'absolute', borderRadius: WINDOW_RADIUS, overflow: 'hidden' },
  // Rechts oben über der Vorschau, links bleibt der Zurück-Knopf frei
  ask: { position: 'absolute', left: EDGE + space[48] + space[8], right: EDGE + space[8] },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: space[8],
    paddingTop: space[12],
    paddingHorizontal: space[16],
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  caption: { ...text.caption, fontSize: 13, color: color.text.secondary },
  headline: { ...text.headline, color: color.text.primary },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    minHeight: size.touchTarget,
    paddingHorizontal: space[12],
    borderRadius: radius.lg,
    backgroundColor: color.bg.surface,
  },
  metricLabel: { ...text.caption, fontSize: 13, color: color.text.secondary },
  deadline: { justifyContent: 'center', minHeight: size.touchTarget },
  metricValue: { ...text.metric, fontSize: 17, lineHeight: 22, color: color.text.primary },
  signal: { color: color.accent.signal },
  description: { fontFamily: font.light, fontSize: 15, lineHeight: 22, color: color.text.secondary },
  authorBlock: { borderTopWidth: stroke.ultraThin, borderTopColor: color.line.hairline },
});
