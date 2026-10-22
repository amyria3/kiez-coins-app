import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, LayoutAnimation, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Text } from './T';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, motion, radius, size, space, text } from '../theme/tokens';
import { useAppDimensions } from '../theme/layout';
import { ActionBar } from './ActionBar';
import { Cat, type CatMood } from './icons/Brand';
import { GlassIconButton } from './Glass';
import { NavigationBar } from './NavigationBar';
import { NudgeScrollProvider, useNudgeScroll } from './Nudge';
import { t } from '../data/texts';

type SubScreenProps = {
  title: string;
  subtitle?: string;
  navigation: 'back' | 'close';
  onLeadingPress: () => void;
  /** Buttons für die ActionBar */
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Aufbau aller Unterseiten aus Figma: NavigationBar (fest), Inhalt in `scroll-y-auto`
 * (Abstand 16, unten 24) und ActionBar (fest, bleibt über der Tastatur).
 */
export function SubScreen({ title, subtitle, navigation, onLeadingPress, actions, children }: SubScreenProps) {
  const insets = useSafeAreaInsets();
  // Deaktivierte Buttons können zu dem Feld scrollen, das noch fehlt (Nudge.tsx)
  const scrollRef = useRef<ScrollView>(null);
  const nudgeScroll = useNudgeScroll(scrollRef);
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <NavigationBar title={title} subtitle={subtitle} variant={navigation} onLeadingPress={onLeadingPress} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <NudgeScrollProvider value={nudgeScroll}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          scrollEventThrottle={32}
          onScroll={(e) => nudgeScroll.onScroll(e.nativeEvent.contentOffset.y)}
        >
          {children}
        </ScrollView>
        </NudgeScrollProvider>
        {actions ? <ActionBar>{actions}</ActionBar> : <View style={{ height: insets.bottom }} />}
      </KeyboardAvoidingView>
    </View>
  );
}

type ResultScreenProps = {
  mood?: CatMood;
  badge?: ReactNode;
  title: string;
  message: string;
  /** Kopfzeile „Zum Feed“ (Figma NavigationBar Variant=Feed). Fehlt sie, gibt es keine Kopfzeile. */
  onFeedPress?: () => void;
  /** Weitere Inhalte unter dem Text, z. B. Zahlungsdaten */
  children?: ReactNode;
  actions?: ReactNode;
};

/** Abschluss-Screens (`…/success`): Kater, Status, Titel und Text mittig, Buttons unten. */
export function ResultScreen({ mood = 'default', badge, title, message, onFeedPress, children, actions }: ResultScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {onFeedPress ? <NavigationBar variant="feed" onLeadingPress={onFeedPress} /> : null}
      <ScrollView style={styles.flex} contentContainerStyle={[styles.resultContent, children ? styles.resultTop : null]}>
        <View style={styles.resultHead}>
          <Cat mood={mood} height={86} />
          {badge}
          <Text style={styles.resultTitle} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.resultMessage}>{message}</Text>
        </View>
        {children ? <View style={styles.resultChildren}>{children}</View> : null}
      </ScrollView>
      {actions ? <ActionBar>{actions}</ActionBar> : <View style={{ height: insets.bottom }} />}
    </View>
  );
}

type HeroScreenProps = {
  image: ImageSourcePropType;
  /** Weitere Fotos: Mit mehr als einem Foto lässt sich das Foto seitlich wischen. */
  moreImages?: ImageSourcePropType[];
  imageLabel?: string;
  onBackPress: () => void;
  onSharePress?: () => void;
  /** Buttons für die ActionBar */
  actions?: ReactNode;
  /** Kleines Element über dem Foto unten links, z. B. das Etikett der Operation */
  imageOverlay?: ReactNode;
  /** Immer sichtbar: Status, Titel, Kennzahlen */
  summary: ReactNode;
  /** Details, die sich einklappen lassen */
  children: ReactNode;
  /** Beim Öffnen ans Ende scrollen, z. B. zu den Kommentaren */
  scrollToEndOnOpen?: boolean;
  /** Im Browser von rechts hereingleiten wie ein Overlay (iOS und Android machen das von selbst) */
  slideIn?: boolean;
};

/**
 * Upgrade „Nachtschicht“: Detailseite mit Foto über die volle Breite, runden Knöpfen darauf und einem Blatt,
 * das über das Foto geschoben ist. Darunter wie SubScreen die ActionBar.
 */
export function HeroScreen({
  image,
  moreImages,
  imageLabel,
  onBackPress,
  onSharePress,
  actions,
  imageOverlay,
  summary,
  children,
  scrollToEndOnOpen,
  slideIn,
}: HeroScreenProps) {
  const insets = useSafeAreaInsets();
  const { height, width } = useAppDimensions();
  const images = [image, ...(moreImages ?? [])];
  const [page, setPage] = useState(0);
  // Eingeklappt: Das Foto bekommt den Platz, das Blatt zeigt nur noch die Zusammenfassung.
  // So startet die Detailansicht (Daria, 22.10.2026). Mit Sprung zu den Kommentaren startet sie ausgeklappt.
  const [collapsed, setCollapsed] = useState(!scrollToEndOnOpen);
  // Eingeklappt füllt das Foto den ganzen Bildschirm. Das Blatt liegt als Glas unten darüber.
  const [viewportHeight, setViewportHeight] = useState(0);
  const [headHeight, setHeadHeight] = useState(0);
  // Ausgeklappt: Foto füllt gut die Hälfte des Bildschirms, das Blatt beginnt darunter (Daria, 21.10.2026)
  const heroHeight = collapsed ? viewportHeight || height : Math.max(HERO_HEIGHT + insets.top, Math.round(height * HERO_SHARE));
  const glassOffset = collapsed && headHeight ? { marginTop: -(headHeight + SHEET_PADDING) } : undefined;
  const collapsedRef = useRef(collapsed);
  collapsedRef.current = collapsed;
  const setCollapsedAnimated = (next: boolean) => {
    if (next === collapsedRef.current) return;
    // Bewegung „Schranke“ (tokens.ts, motion): federnd statt linear
    LayoutAnimation.configureNext({
      duration: motion.barrier.duration,
      update: { type: LayoutAnimation.Types.spring, springDamping: 0.55 },
    });
    setCollapsed(next);
  };
  const toggle = () => setCollapsedAnimated(!collapsedRef.current);
  const setRef = useRef(setCollapsedAnimated);
  setRef.current = setCollapsedAnimated;

  // Wischen: oben angekommen nach unten ziehen klappt die Details zu, nach oben ziehen klappt sie auf.
  // Das Blatt folgt dabei leicht dem Finger und federt zurück.
  const scrollY = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrolledToEnd = useRef(false);
  const slide = useRef(new Animated.Value(slideIn && Platform.OS === 'web' ? 1 : 0)).current;
  useEffect(() => {
    if (!(slideIn && Platform.OS === 'web')) return;
    Animated.timing(slide, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [slide, slideIn]);
  const drag = useRef(new Animated.Value(0)).current;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, g) => {
          if (Math.abs(g.dy) < 14 || Math.abs(g.dy) < Math.abs(g.dx) * 2) return false;
          return collapsedRef.current ? g.dy < 0 : g.dy > 0 && scrollY.current <= 0;
        },
        onPanResponderMove: (_, g) => drag.setValue(g.dy * 0.35),
        onPanResponderRelease: (_, g) => {
          if (g.dy > SWIPE || g.vy > 0.6) setRef.current(true);
          else if (g.dy < -SWIPE || g.vy < -0.6) setRef.current(false);
          Animated.spring(drag, { toValue: 0, useNativeDriver: true, ...motion.barrierSpring }).start();
        },
        onPanResponderTerminate: () =>
          Animated.spring(drag, { toValue: 0, useNativeDriver: true, ...motion.barrierSpring }).start(),
      }),
    [drag],
  );
  return (
    <Animated.View
      style={[styles.screen, { transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, width] }) }] }]}
    >
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          onContentSizeChange={() => {
            if (!scrollToEndOnOpen || scrolledToEnd.current) return;
            scrolledToEnd.current = true;
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 350);
          }}
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          scrollEventThrottle={16}
          onScroll={(e) => (scrollY.current = e.nativeEvent.contentOffset.y)}
          onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
        >
          <Animated.View {...pan.panHandlers} style={{ transform: [{ translateY: drag }] }}>
          {/* Tippen aufs Foto klappt die Details zu oder auf */}
          <Pressable
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? t('Details ausklappen') : t('Foto groß ansehen')}
            style={[styles.hero, { height: heroHeight }]}
          >
            {images.length > 1 ? (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={StyleSheet.absoluteFill}
                  scrollEventThrottle={32}
                  onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
                >
                  {images.map((source, i) => (
                    <Image
                      key={i}
                      source={source}
                      style={{ width, height: heroHeight }}
                      contentFit="cover"
                      accessibilityLabel={t('{imageLabel}, {i} von {images}', { imageLabel: imageLabel ?? t('Foto'), i: i + 1, images: images.length })}
                    />
                  ))}
                </ScrollView>
                <View style={styles.dots} pointerEvents="none">
                  {images.map((_, i) => (
                    <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
                  ))}
                </View>
              </>
            ) : (
              <Image
                source={image}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                accessibilityLabel={imageLabel}
              />
            )}
            {imageOverlay ? <View style={styles.heroOverlay}>{imageOverlay}</View> : null}
          </Pressable>
          <View style={[styles.sheet, collapsed && styles.sheetGlass, glassOffset]}>
            {collapsed ? (
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            ) : null}
            <View style={styles.sheetHead} onLayout={(e) => setHeadHeight(e.nativeEvent.layout.height)}>
            <Pressable
              onPress={toggle}
              accessibilityRole="button"
              accessibilityLabel={collapsed ? t('Details ausklappen') : t('Details einklappen')}
              accessibilityState={{ expanded: !collapsed }}
              hitSlop={{ top: 12, bottom: 4 }}
              style={styles.grabberArea}
            >
              <View style={styles.grabber} />
            </Pressable>
            {/* Eingeklappt klappt Tippen auf die Zusammenfassung die Details auf */}
            <Pressable
              onPress={toggle}
              disabled={!collapsed}
              accessibilityLabel={collapsed ? t('Details ausklappen') : undefined}
              style={styles.sheetHead}
            >
              {summary}
            </Pressable>
            </View>
            {collapsed ? null : children}
          </View>
          </Animated.View>
        </ScrollView>
        {actions ? <ActionBar>{actions}</ActionBar> : <View style={{ height: insets.bottom }} />}
      </KeyboardAvoidingView>
      <View style={[styles.heroButtons, { top: insets.top + space[8] }]} pointerEvents="box-none">
        <GlassIconButton icon="chevron-left" accessibilityLabel={t('Zurück')} onPress={onBackPress} />
        {onSharePress ? <GlassIconButton icon="send" accessibilityLabel={t('Teilen')} onPress={onSharePress} /> : null}
      </View>
    </Animated.View>
  );
}

const HERO_HEIGHT = 340;
/** Anteil der Bildschirmhöhe, den das Foto ausgeklappt mindestens einnimmt */
const HERO_SHARE = 0.6;
/** Innenabstand des Blatts oben und unten */
const SHEET_PADDING = space[8] + space[16];
/** Mindestweg in Punkten, ab dem ein Wischen die Details auf- oder zuklappt */
const SWIPE = 48;

const styles = StyleSheet.create({
  dots: {
    position: 'absolute',
    bottom: space[48],
    alignSelf: 'center',
    flexDirection: 'row',
    gap: space[6],
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(240,240,240,0.45)' },
  dotActive: { backgroundColor: color.text.primary, width: 16 },
  screen: { flex: 1, backgroundColor: color.bg.screen },
  flex: { flex: 1 },
  content: {
    paddingTop: space[16],
    paddingHorizontal: space[16],
    paddingBottom: space[24],
    gap: space[16],
  },
  resultContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: space[32],
    paddingHorizontal: space[24],
    gap: space[16],
  },
  resultTop: { justifyContent: 'flex-start', paddingTop: space[8], alignItems: 'stretch' },
  resultHead: { alignItems: 'center', gap: space[16] },
  resultChildren: { gap: space[12], alignSelf: 'stretch' },
  resultTitle: { ...text.title, color: color.text.primary, textAlign: 'center' },
  resultMessage: { ...text.body, color: color.text.secondary, textAlign: 'center' },
  hero: { backgroundColor: color.bg.surface },
  heroOverlay: { position: 'absolute', left: space[16], bottom: space[48] },
  sheet: {
    marginTop: -space[32],
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: color.bg.screen,
    paddingTop: space[8],
    paddingHorizontal: space[20],
    paddingBottom: space[16],
    gap: space[12],
  },
  sheetHead: { gap: space[12] },
  // Eingeklappt: durchscheinend wie Glas, das Foto liegt darunter
  sheetGlass: { backgroundColor: 'rgba(31,33,35,0.45)', overflow: 'hidden' },
  grabberArea: { alignSelf: 'center', paddingHorizontal: space[24], paddingVertical: space[6] },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: color.line.hairline },
  more: { alignSelf: 'flex-start', minHeight: size.touchTarget, justifyContent: 'center' },
  moreText: { ...text.body, color: color.accent.primary },
  heroButtons: {
    position: 'absolute',
    left: space[16],
    right: space[16],
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
