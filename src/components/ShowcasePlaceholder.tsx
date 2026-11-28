import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { ImageSource } from '../data/types';
import { isMono } from '../theme/look';
import { color, radius, space, text } from '../theme/tokens';
import { Text } from './T';

/**
 * Platzhalter für ein leeres Schaufenster (Daria, 2026-11-11): Verlauf statt Titelbild, schwarzer Kreis mit dem
 * Kater als Logo, ein erster Post zum Ansehen. Die öffentliche Seite (api/s.mjs) zeigt dasselbe.
 */

/** Verlauf aus den Markenfarben Lila, Rosa, Pfirsich, wie auf kiezcoins.de/s/<kurzname> */
export const COVER_GRADIENT = color.showcasePlaceholder.cover;

/** Darias Kater-Maske (Cat-Avatar-Mask.svg), 35 × 31 */
export const KATER_MASK =
  'M29.8389 4.32385C30.2718 4.51386 30.6554 4.74222 30.9434 5.01624C32.2062 6.21818 32.5338 6.31956 32.9248 6.68616C33.8973 7.59812 34.1006 9.62071 34.1006 11.3531C34.1006 15.5488 34.0681 14.3748 34.0869 16.9537C34.1004 18.81 34.1005 21.6209 31.6338 24.7985C23.8527 29.9038 21.9208 30.116 15.3193 30.0006L12.0439 29.8278C8.81613 29.0959 8.63087 29.6764 4.41895 26.6461C2.03591 24.282 2.1456 24.2364 1.42871 23.3541C-0.109269 20.2796 0.0537125 19.6386 0.0537109 14.9225C0.0536608 12.0929 -0.415933 9.49597 1.42871 7.37659L3.24023 5.79651L3.55273 1.68713L8.52539 2.83655C13.2778 1.69417 19.3517 2.45528 22.7344 2.99963L29.8389 0.0201416V4.32385ZM17.4287 19.9996V25.6403C17.0274 25.6499 14.9325 25.0144 14.4238 24.7799L13.5 26.4996C14.0792 26.7912 15.2601 27.3747 16.4121 27.6696C17.1297 27.8532 17.1206 27.7815 18.3096 27.6608C18.8564 27.4785 21.8033 27.0677 22.5 25.9996L21.5742 24.8951L18.3096 25.6403L18.1396 19.444L17.4287 19.9996ZM11.3252 10.5641C10.5048 10.504 8.81272 9.98065 7.48145 10.8131C6.65543 11.5079 6.67591 11.5295 6.4082 11.7975C5.70135 12.7796 5.67338 12.7945 5.48633 13.9449C5.2902 15.1509 6.00632 15.9637 6.16113 16.6969L14.1787 16.6276C14.892 15.7542 15.2723 15.579 15.0137 14.2301C14.1321 11.8204 13.5238 11.3916 12.0664 10.8131L11.3252 10.5641ZM26.8262 10.7799C25.6015 9.98107 24.0714 10.4465 23.3262 10.4908L22.6562 10.7135C21.34 11.2341 20.7935 11.6264 20.0312 13.8707C19.8182 15.1305 20.1677 15.3 20.8311 16.1285L28.125 16.3112C28.2536 15.6265 28.8918 14.8746 28.6934 13.7418C28.5043 12.6619 28.4786 12.6478 27.8193 11.7174C27.5714 11.4625 27.5892 11.4429 26.8262 10.7799Z';

/** Strich-Kater des Fashionable-Logos, 33 × 36, Pfade aus assets/brand/logo-mono.svg (Tag fashionable-archiv) */
const FASHIONABLE_CAT: { d: string; w: number; cap: 'square' | 'round' | 'butt' }[] = [
  { d: 'M30.6966 9.82143C30.6966 9.82143 31.3693 3 30.6966 3C30.0239 3 22.6237 9.10714 22.6237 9.10714H9.87188C9.87188 9.10714 2.47174 3 1.799 3C1.12626 3 1.799 9.82143 1.799 9.82143', w: 3, cap: 'square' },
  { d: 'M31.0602 28C31.0602 31.0769 27.7744 33 23.3934 33H16.8464H16.2741H9.72712C5.34605 33 2.06024 31.0769 2.06024 28', w: 4, cap: 'square' },
  { d: 'M1.79895 18.1633V20.8542C1.8426 22.2835 2.38954 22.7416 4.4597 22.8725H10.5144C12.298 22.6566 13.1072 22.3033 13.8781 20.8542V18.1633V16.1451C13.8781 14.1268 12.5326 13.4541 10.5144 13.4541H4.4597C2.38954 13.585 1.8426 14.043 1.79896 15.4723L1.79895 18.1633Z', w: 3, cap: 'round' },
  { d: 'M30.6965 18.1633V20.8542C30.6529 22.2835 30.1059 22.7416 28.0358 22.8725H21.9811C20.1975 22.6566 19.3882 22.3033 18.6174 20.8542V18.1633V16.1451C18.6174 14.1268 19.9629 13.4541 21.9811 13.4541H28.0358C30.1059 13.585 30.6529 14.043 30.6965 15.4723L30.6965 18.1633Z', w: 3, cap: 'round' },
  { d: 'M12.5325 28.9271C13.8463 27.997 14.8714 27.547 15.8962 27.5544C16.9215 27.5618 17.9465 28.027 19.2599 28.9271', w: 2, cap: 'butt' },
  { d: 'M17.2417 23.5453H15.8963H14.5508', w: 1, cap: 'butt' },
  { d: 'M15.8963 23.5453V26.909', w: 1, cap: 'butt' },
];

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
/** `tone`: Kreis und Kater in eigenen Farben, z. B. Signalfarbe mit Kater in Tinte im Kopf des Schaufensters */
export function ShowcaseLogo({
  image,
  size,
  style,
  tone,
}: {
  image?: ImageSource;
  size: number;
  style?: StyleProp<ViewStyle>;
  tone?: { circle: string; mask: string };
}) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (image) return <Image source={image} style={[round, style] as never} contentFit="cover" />;
  const w = size * 0.5;
  const ink = tone?.mask ?? color.showcasePlaceholder.mask;
  // Mono: der Strich-Kater aus dem Fashionable-Logo (assets/brand/logo-mono.svg im Tag fashionable-archiv),
  // Daria, 2026-11-28: „Bitte das Katzenbild nehmen, das wir ursprünglich als Logo für Fashionable entwickelt haben“
  if (isMono) {
    return (
      <View
        style={[round, style, styles.katerCircle, tone && { backgroundColor: tone.circle }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width={w} height={(w * 36) / 33} viewBox="0 0 33 36" fill="none">
          {FASHIONABLE_CAT.map((p, i) => (
            <Path key={i} d={p.d} stroke={ink} strokeWidth={p.w} strokeLinecap={p.cap} />
          ))}
        </Svg>
      </View>
    );
  }
  return (
    <View
      style={[round, style, styles.katerCircle, tone && { backgroundColor: tone.circle }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={w} height={(w * 31) / 35} viewBox="0 0 35 31">
        <Path d={KATER_MASK} fill={ink} />
      </Svg>
    </View>
  );
}

/**
 * Standard-Post (Daria, 2026-11-28: „Default-Posts, die erscheinen, bevor echte Posts erscheinen. Minimalistisch aber
 * modern. À la Grafikdesigner“): eine Karte wie ein kleines Plakat, Willkommen in Tinte mit Schrift in Gelbgrün. Ein
 * zweites Plakat mit den Services fiel weg, weil sie doppelt dastanden (Daria: „wieso gedoppelt?“). Die öffentliche
 * Seite (api/s.mjs, standardPosts) zeigt dasselbe.
 */
export function StandardPosts({ name, kiez }: { name: string; kiez?: string }) {
  return (
    <View style={styles.poster}>
      <Text style={styles.posterKicker}>Willkommen</Text>
      <Text noTranslate style={styles.posterTitle}>
        {kiez?.trim() ? `Neu in ${kiez.trim()}.` : 'Neu im Kiez.'}
      </Text>
      <Text style={styles.posterFoot}>{`${name} hat jetzt ein Schaufenster. Neues erscheint hier.`}</Text>
    </View>
  );
}

/** Graue Zeile für einen leeren Abschnitt, z. B. „Noch keine Termine“ */
export function PlaceholderText({ children }: { children: string }) {
  return <Text style={styles.empty}>{children}</Text>;
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  // Schwarz in beiden Looks (Daria, 2026-11-11)
  katerCircle: { backgroundColor: color.showcasePlaceholder.circle, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  poster: {
    minHeight: 300,
    padding: space[24],
    borderRadius: radius.post,
    gap: space[20],
    justifyContent: 'space-between',
    backgroundColor: color.showcasePlaceholder.posterInk,
  },
  posterKicker: { ...text.captionStrong, letterSpacing: 0.4, textTransform: 'uppercase', color: color.showcasePlaceholder.posterLime },
  posterTitle: { ...text.displayLarge, marginTop: 'auto', color: color.showcasePlaceholder.posterLime },
  posterFoot: { ...text.bodySm, opacity: 0.8, color: color.showcasePlaceholder.posterLime },
  empty: { ...text.caption, color: color.text.secondary, fontStyle: 'italic' },
});
