import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { ImageSource } from '../data/types';
import { color, font, radius, space, text } from '../theme/tokens';
import { Text } from './T';

/**
 * Platzhalter für ein leeres Schaufenster (Daria, 2026-11-11): Verlauf statt Titelbild, schwarzer Kreis mit dem
 * Kater als Logo, ein erster Post zum Ansehen. Die öffentliche Seite (api/s.mjs) zeigt dasselbe.
 */

/** Verlauf aus den Markenfarben Lila, Rosa, Pfirsich, wie auf kiezcoins.de/s/<kurzname> */
export const COVER_GRADIENT = ['#8F90FA', '#FFB2E5', '#FFAD7E'] as const;

/** Darias Kater-Maske (Cat-Avatar-Mask.svg), 35 × 31 */
export const KATER_MASKE =
  'M29.8389 4.32385C30.2718 4.51386 30.6554 4.74222 30.9434 5.01624C32.2062 6.21818 32.5338 6.31956 32.9248 6.68616C33.8973 7.59812 34.1006 9.62071 34.1006 11.3531C34.1006 15.5488 34.0681 14.3748 34.0869 16.9537C34.1004 18.81 34.1005 21.6209 31.6338 24.7985C23.8527 29.9038 21.9208 30.116 15.3193 30.0006L12.0439 29.8278C8.81613 29.0959 8.63087 29.6764 4.41895 26.6461C2.03591 24.282 2.1456 24.2364 1.42871 23.3541C-0.109269 20.2796 0.0537125 19.6386 0.0537109 14.9225C0.0536608 12.0929 -0.415933 9.49597 1.42871 7.37659L3.24023 5.79651L3.55273 1.68713L8.52539 2.83655C13.2778 1.69417 19.3517 2.45528 22.7344 2.99963L29.8389 0.0201416V4.32385ZM17.4287 19.9996V25.6403C17.0274 25.6499 14.9325 25.0144 14.4238 24.7799L13.5 26.4996C14.0792 26.7912 15.2601 27.3747 16.4121 27.6696C17.1297 27.8532 17.1206 27.7815 18.3096 27.6608C18.8564 27.4785 21.8033 27.0677 22.5 25.9996L21.5742 24.8951L18.3096 25.6403L18.1396 19.444L17.4287 19.9996ZM11.3252 10.5641C10.5048 10.504 8.81272 9.98065 7.48145 10.8131C6.65543 11.5079 6.67591 11.5295 6.4082 11.7975C5.70135 12.7796 5.67338 12.7945 5.48633 13.9449C5.2902 15.1509 6.00632 15.9637 6.16113 16.6969L14.1787 16.6276C14.892 15.7542 15.2723 15.579 15.0137 14.2301C14.1321 11.8204 13.5238 11.3916 12.0664 10.8131L11.3252 10.5641ZM26.8262 10.7799C25.6015 9.98107 24.0714 10.4465 23.3262 10.4908L22.6562 10.7135C21.34 11.2341 20.7935 11.6264 20.0312 13.8707C19.8182 15.1305 20.1677 15.3 20.8311 16.1285L28.125 16.3112C28.2536 15.6265 28.8918 14.8746 28.6934 13.7418C28.5043 12.6619 28.4786 12.6478 27.8193 11.7174C27.5714 11.4625 27.5892 11.4429 26.8262 10.7799Z';

function Gradient({ id }: { id: string }) {
  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 160 90" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={COVER_GRADIENT[0]} />
          <Stop offset="0.55" stopColor={COVER_GRADIENT[1]} />
          <Stop offset="1" stopColor={COVER_GRADIENT[2]} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="160" height="90" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Titelbild oder, ohne Bild, der Verlauf */
export function ShowcaseCover({ image, style }: { image?: ImageSource; style: StyleProp<ViewStyle> }) {
  if (image) return <Image source={image} style={style as never} contentFit="cover" accessibilityIgnoresInvertColors />;
  return (
    <View style={[style, styles.clip]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Gradient id="sf-cover" />
    </View>
  );
}

/** Logo oder, ohne Logo, der schwarze Kreis mit dem Kater */
export function ShowcaseLogo({ image, size, style }: { image?: ImageSource; size: number; style?: StyleProp<ViewStyle> }) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (image) return <Image source={image} style={[round, style] as never} contentFit="cover" />;
  const w = size * 0.5;
  return (
    <View style={[round, style, styles.katerKreis]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={w} height={(w * 31) / 35} viewBox="0 0 35 31">
        <Path d={KATER_MASKE} fill="#F0F0F0" />
      </Svg>
    </View>
  );
}

/** Ein erster Post zum Ansehen: zeigt, wie Posts hier aussehen werden */
export function PlaceholderPost() {
  return (
    <View style={styles.post}>
      <View style={styles.postImage}>
        <Gradient id="sf-post" />
      </View>
      <View style={styles.postBody}>
        <Text style={styles.kicker}>Post</Text>
        <Text style={styles.title}>Hier erscheint der erste Post</Text>
        <Text style={styles.sub}>Neuigkeiten, Angebote und Fotos aus dem Schaufenster.</Text>
      </View>
    </View>
  );
}

/** Graue Zeile für einen leeren Abschnitt, z. B. „Noch keine Termine“ */
export function PlaceholderText({ children }: { children: string }) {
  return <Text style={styles.leer}>{children}</Text>;
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  // Schwarz in beiden Looks (Daria, 2026-11-11)
  katerKreis: { backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  post: {
    borderRadius: radius.post,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.text.secondary,
    overflow: 'hidden',
    opacity: 0.75,
  },
  postImage: { width: '100%', aspectRatio: 16 / 9, opacity: 0.5 },
  postBody: { gap: space[4], padding: space[16] },
  kicker: { ...text.caption, fontFamily: font.medium, color: color.accent.signal },
  title: { ...text.cardTitle, color: color.text.primary },
  sub: { ...text.caption, color: color.text.secondary },
  leer: { ...text.caption, color: color.text.secondary, fontStyle: 'italic' },
});
