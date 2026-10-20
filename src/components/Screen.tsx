import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, motion, radius, size, space, text } from '../theme/tokens';
import { ActionBar } from './ActionBar';
import { Cat, type CatMood } from './icons/Brand';
import { IconButton } from './IconButton';
import { NavigationBar } from './NavigationBar';

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
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <NavigationBar title={title} subtitle={subtitle} variant={navigation} onLeadingPress={onLeadingPress} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {children}
        </ScrollView>
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
}: HeroScreenProps) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const images = [image, ...(moreImages ?? [])];
  const [page, setPage] = useState(0);
  // Eingeklappt: Das Foto bekommt den Platz, das Blatt zeigt nur noch die Zusammenfassung.
  const [collapsed, setCollapsed] = useState(false);
  const heroHeight = collapsed ? Math.round(height * 0.62) : HERO_HEIGHT + insets.top;
  const toggle = () => {
    // Bewegung „Schranke“ (tokens.ts, motion): federnd statt linear
    LayoutAnimation.configureNext({
      duration: motion.barrier.duration,
      update: { type: LayoutAnimation.Types.spring, springDamping: 0.55 },
    });
    setCollapsed((c) => !c);
  };
  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          <View style={[styles.hero, { height: heroHeight }]}>
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
                      accessibilityLabel={`${imageLabel ?? 'Foto'}, ${i + 1} von ${images.length}`}
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
          </View>
          <View style={styles.sheet}>
            <Pressable
              onPress={toggle}
              accessibilityRole="button"
              accessibilityLabel={collapsed ? 'Details ausklappen' : 'Details einklappen'}
              accessibilityState={{ expanded: !collapsed }}
              hitSlop={{ top: 12, bottom: 4 }}
              style={styles.grabberArea}
            >
              <View style={styles.grabber} />
            </Pressable>
            {summary}
            {collapsed ? (
              <Pressable onPress={toggle} accessibilityRole="button" style={styles.more}>
                <Text style={styles.moreText}>Details zeigen</Text>
              </Pressable>
            ) : (
              children
            )}
          </View>
        </ScrollView>
        {actions ? <ActionBar>{actions}</ActionBar> : <View style={{ height: insets.bottom }} />}
      </KeyboardAvoidingView>
      <View style={[styles.heroButtons, { top: insets.top + space[8] }]} pointerEvents="box-none">
        <IconButton
          icon="chevron-left"
          iconSize={size.icon}
          accessibilityLabel="Zurück"
          onPress={onBackPress}
          style={styles.heroButton}
        />
        {onSharePress ? (
          <IconButton
            icon="send"
            iconSize={size.icon}
            accessibilityLabel="Teilen"
            onPress={onSharePress}
            style={styles.heroButton}
          />
        ) : null}
      </View>
    </View>
  );
}

const HERO_HEIGHT = 340;

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
  heroButton: { borderRadius: radius.full, backgroundColor: color.bg.glass },
});
