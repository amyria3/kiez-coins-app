import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { NameWithTestMark } from './Badges';

import { beforeAfterDuration, formatHoursMinutes, formatRelative } from '../data/format';
import { t } from '../data/texts';
import type { ImageSource } from '../data/types';
import { shareText } from '../lib/share';
import { useAppDimensions } from '../theme/layout';
import { color, font, isFashionable, motion, radius, size, space, stroke, text } from '../theme/tokens';
import { Avatar, hiddenText, useHideName } from './AuthorRow';
import type { ChallengePostProps } from './ChallengePost';
import { Icon } from './icons/Icon';
import { IconButton } from './IconButton';
import { Text } from './T';
import { WithMentions } from './WithMentions';

/** Anteil des Vorher-Fotos an der Höhe: im Ruhezustand 1/3, vergrößert 5/6 (Daria, 23.10.2026) */
const SPLIT = { none: 1 / 3, before: 5 / 6, after: 1 / 6 } as const;
/** Vergrößert wächst die Karte um 25 % */
const GROW = 1.25;

type Focus = keyof typeof SPLIT;

type PairProps = {
  before?: ImageSource;
  after?: ImageSource;
  /** Höhe im Ruhezustand */
  height: number;
  /** Dauer an der Naht, z. B. „2 h 14 min“ */
  duration?: string;
  /** Glasleiste unten im Bild (Look „Kiez“). Verschwindet, solange Vorher vergrößert ist. */
  overlay?: ReactNode;
  /** Langes Drücken öffnet den Beitrag */
  onLongPress?: () => void;
  rounded?: boolean;
  /** Ohne Nachher-Foto: tippen öffnet den Beitrag */
  onPress?: () => void;
};

/**
 * Vorher oben, Nachher unten. Ein Tipp auf eine Hälfte vergrößert sie auf 5/6 der Höhe, die Karte wächst um 25 %.
 * Ein zweiter Tipp stellt zurück. Bewegung „Schranke“.
 */
export function BeforeAfterPair({ before, after, height, duration, overlay, onLongPress, rounded, onPress }: PairProps) {
  const [focus, setFocus] = useState<Focus>('none');
  const split = useRef(new Animated.Value(SPLIT.none)).current;
  const grow = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const easing = Easing.bezier(...motion.barrier.bezier);
    Animated.parallel([
      Animated.timing(split, { toValue: SPLIT[focus], duration: motion.barrier.duration, easing, useNativeDriver: false }),
      Animated.timing(grow, { toValue: focus === 'none' ? 1 : GROW, duration: motion.barrier.duration, easing, useNativeDriver: false }),
    ]).start();
  }, [focus, split, grow]);

  const single = !after;
  const cardHeight = Animated.multiply(grow, height);
  const beforeHeight = single ? cardHeight : Animated.multiply(cardHeight, split);
  const tap = (half: Exclude<Focus, 'none'>) => setFocus((f) => (f === 'none' ? half : 'none'));
  const dimBefore = focus === 'after';
  const dimAfter = focus === 'before';

  return (
    <Animated.View style={[styles.pair, rounded && styles.rounded, { height: cardHeight }]}>
      <Animated.View style={[styles.half, { top: 0, height: beforeHeight }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={single ? onPress : () => tap('before')}
          onLongPress={onLongPress}
          delayLongPress={350}
          accessibilityRole="button"
          accessibilityLabel={t('Vorher-Foto')}
          accessibilityHint={single ? t('Öffnet den Beitrag') : t('Tippen vergrößert das Vorher-Foto, nochmal tippen stellt zurück.')}
        >
          {before ? <Image source={before} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          {dimBefore ? <View style={styles.dim} /> : null}
          <Tag label="Vorher" />
        </Pressable>
      </Animated.View>
      {after ? (
        <Animated.View style={[styles.half, { top: beforeHeight, bottom: 0 }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => tap('after')}
            onLongPress={onLongPress}
            delayLongPress={350}
            accessibilityRole="button"
            accessibilityLabel={t('Nachher-Foto')}
            accessibilityHint={t('Tippen vergrößert das Nachher-Foto, nochmal tippen stellt zurück.')}
          >
            <Image source={after} style={StyleSheet.absoluteFill} contentFit="cover" />
            {dimAfter ? <View style={styles.dim} /> : null}
            <Tag label="Nachher" />
          </Pressable>
        </Animated.View>
      ) : null}
      {after ? <Animated.View pointerEvents="none" style={[styles.seam, { top: beforeHeight }]} /> : null}
      {duration ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.duration, single ? styles.durationBottom : { top: beforeHeight }]}
          accessible
          accessibilityLabel={t('Dauer {duration}', { duration })}
        >
          <Icon name="clock" size={12} color={color.text.primary} />
          <Text style={styles.durationText}>{duration}</Text>
        </Animated.View>
      ) : null}
      {overlay ? (
        <View pointerEvents={focus === 'before' ? 'none' : 'box-none'} style={[styles.overlay, focus === 'before' && styles.hidden]}>
          {overlay}
        </View>
      ) : null}
    </Animated.View>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <Text style={styles.tagText}>{t(label)}</Text>
    </View>
  );
}

/** Feed-Karte eines Vorher-Nachher-Beitrags in beiden Looks */
export function BeforeAfterPost(props: ChallengePostProps) {
  return isFashionable ? <FashionBeforeAfter {...props} /> : <KiezBeforeAfter {...props} />;
}

function useParts({ challenge }: ChallengePostProps) {
  const ms = beforeAfterDuration(challenge);
  return {
    before: challenge.imageBefore ?? challenge.image,
    after: challenge.imageAfter,
    duration: ms === undefined ? undefined : formatHoursMinutes(ms),
    commentCount: challenge.comments.length,
  };
}

function Actions({ challenge, onPress, onCommentPress, onLike, onManage, end }: ChallengePostProps & { end?: ReactNode }) {
  const commentCount = challenge.comments.length;
  const countStyle = isFashionable ? styles.countFashionable : styles.count;
  return (
    <View style={isFashionable ? styles.actionsFashionable : styles.actions}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: !!challenge.likedByMe }}
        accessibilityLabel={challenge.likeCount ? t('Gefällt mir, {likeCount} Likes', { likeCount: challenge.likeCount }) : t('Gefällt mir')}
        onPress={onLike}
        style={({ pressed }) => [styles.countAction, pressed && styles.pressed]}
      >
        <Icon name="heart" size={size.icon} color={challenge.likedByMe ? color.accent.affection : color.text.primary} />
        {challenge.likeCount ? <Text style={countStyle}>{challenge.likeCount}</Text> : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={commentCount ? t('Kommentieren, {commentCount} Kommentare', { commentCount }) : t('Kommentieren')}
        onPress={onCommentPress ?? onPress}
        style={({ pressed }) => [styles.countAction, pressed && styles.pressed]}
      >
        <Icon name="comment" size={size.icon} color={color.text.primary} />
        {commentCount > 0 ? <Text style={countStyle}>{commentCount}</Text> : null}
      </Pressable>
      <IconButton
        icon="send"
        iconSize={size.icon}
        accessibilityLabel={t('Teilen')}
        onPress={() => shareText(t('{title} – Kiez Coins', { title: challenge.title }))}
      />
      <View style={styles.flex} />
      {end}
      {onManage && !isFashionable ? (
        <IconButton icon="settings" iconSize={size.icon} accessibilityLabel={t('Deine Challenges verwalten')} onPress={onManage} />
      ) : null}
    </View>
  );
}

/** Look „Kiez“: Karte 360 hoch mit runden Ecken, Glasleiste mit Titel unten, Text unter den Aktionen */
function KiezBeforeAfter(props: ChallengePostProps) {
  const { challenge, author, distance, onPress } = props;
  const { before, after, duration } = useParts(props);
  const hideName = useHideName(author);
  const meta = [distance, formatRelative(challenge.createdAt)].filter(Boolean).join(' · ');
  const overlay = (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('{title} öffnen', { title: challenge.title })}
      style={styles.info}
    >
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      <Text style={styles.title} numberOfLines={2}>
        {challenge.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        <Text noTranslate style={hideName ? hiddenText : undefined}>
          {author.name}
        </Text>
        {meta ? ` · ${meta}` : null}
      </Text>
    </Pressable>
  );
  return (
    <View style={styles.post}>
      <BeforeAfterPair
        before={before}
        after={after}
        height={KIEZ_HEIGHT}
        duration={duration}
        overlay={overlay}
        onLongPress={onPress}
        onPress={onPress}
        rounded
      />
      <Actions {...props} />
      {challenge.text ? (
        <Pressable onPress={onPress} style={styles.textBlock}>
          <Text style={styles.body} numberOfLines={4}>
            <WithMentions value={challenge.text} />
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Look „Fashionable“: Kopfzeile, Bildpaar über die ganze Breite im Hochformat 4:5, Text mit fettem Titel */
function FashionBeforeAfter(props: ChallengePostProps) {
  const { challenge, author, distance, onPress, onManage } = props;
  const { before, after, duration } = useParts(props);
  const hideName = useHideName(author);
  const router = useRouter();
  const { width } = useAppDimensions();
  const place = [challenge.kiez?.split(',')[0] ?? challenge.location, distance].filter(Boolean).join(' · ');
  const time = [formatRelative(challenge.createdAt), duration ? t('in {duration} geschafft', { duration }) : '']
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={styles.postFashionable}>
      <View style={styles.head}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Profil von {name}', { name: author.name })}
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: author.id, challengeId: challenge.id } })}
          style={({ pressed }) => [styles.headWho, pressed && styles.pressed]}
        >
          <Avatar user={author} diameter={32} />
          <View style={styles.headTexts}>
            <NameWithTestMark test={author.test}>
              <Text noTranslate style={[styles.name, hideName ? hiddenText : null]} numberOfLines={1}>
                {author.name}
              </Text>
            </NameWithTestMark>
            {place ? (
              <Text style={styles.place} numberOfLines={1}>
                {place}
              </Text>
            ) : null}
          </View>
        </Pressable>
        {onManage ? (
          <IconButton icon="settings" iconSize={size.icon} accessibilityLabel={t('Deine Challenges verwalten')} onPress={onManage} />
        ) : null}
      </View>
      <BeforeAfterPair
        before={before}
        after={after}
        height={(width * 5) / 4}
        duration={duration}
        onLongPress={onPress}
        onPress={onPress}
      />
      <Actions {...props} />
      <Pressable onPress={onPress} style={styles.caption}>
        <Text style={styles.captionText} numberOfLines={5}>
          <Text style={styles.captionTitle}>{challenge.title} </Text>
          {challenge.text ? <WithMentions value={challenge.text} /> : null}
        </Text>
        <Text style={styles.time}>{time}</Text>
      </Pressable>
    </View>
  );
}

/** Höhe der Karte im Look „Kiez“, wie die anderen Beiträge */
const KIEZ_HEIGHT = 360;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.9 },
  hidden: { opacity: 0 },
  pair: { overflow: 'hidden', backgroundColor: color.bg.surface },
  rounded: { borderRadius: radius.card },
  half: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
  dim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.25)' },
  seam: { position: 'absolute', left: 0, right: 0, height: 2, marginTop: -1, backgroundColor: color.bg.screen },
  tag: {
    position: 'absolute',
    top: space[12],
    left: space[12],
    paddingVertical: space[4],
    paddingHorizontal: space[8],
    borderRadius: isFashionable ? radius.sm : radius.full,
    overflow: 'hidden',
    backgroundColor: 'rgba(31, 33, 35, 0.35)',
  },
  tagText: {
    fontFamily: isFashionable ? font.semiBold : font.medium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: isFashionable ? 0.6 : 0.4,
    textTransform: isFashionable ? 'uppercase' : 'none',
    color: color.text.onPhoto,
  },
  // Dauer an der Naht, rechts, halb über beiden Fotos
  duration: {
    position: 'absolute',
    right: space[12],
    marginTop: -13,
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    paddingLeft: space[8],
    paddingRight: space[12],
    borderRadius: isFashionable ? radius.sm : radius.full,
    backgroundColor: color.bg.screen,
    zIndex: 2,
  },
  // Ohne Nachher-Foto: oben rechts
  durationBottom: { top: space[12], marginTop: 0 },
  durationText: { fontFamily: font.medium, fontSize: 12, lineHeight: 14, color: color.text.primary, fontVariant: ['tabular-nums'] },
  overlay: { position: 'absolute', left: space[12], right: space[12], bottom: space[12], zIndex: 3 },
  info: {
    gap: space[6],
    paddingVertical: space[12],
    paddingHorizontal: space[16],
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: color.bg.onPhoto,
    borderWidth: stroke.ultraThin,
    borderColor: color.line.hairline,
  },
  title: { ...text.cardTitle, color: color.text.onPhoto },
  meta: { ...text.caption, fontSize: 13, color: color.text.secondary },
  // Look „Kiez“
  post: { paddingHorizontal: space[16] },
  actions: { flexDirection: 'row', alignItems: 'center', paddingTop: space[4] },
  count: { ...text.caption, fontSize: 15, lineHeight: 20, color: color.text.primary, fontVariant: ['tabular-nums'] },
  countAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    minHeight: size.touchTarget,
    minWidth: size.touchTarget,
    paddingHorizontal: space[6],
  },
  textBlock: { paddingHorizontal: space[4], paddingBottom: space[8] },
  body: { ...text.body, color: color.text.secondary },
  // Look „Fashionable“
  postFashionable: { paddingBottom: space[16] },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 54,
    paddingLeft: space[12],
    paddingRight: space[4],
    gap: space[8],
  },
  headWho: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  headTexts: { flexShrink: 1 },
  name: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 18, color: color.text.primary },
  place: { ...text.caption, fontSize: 12, color: color.text.primary },
  actionsFashionable: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: space[4] },
  countFashionable: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.text.primary, fontVariant: ['tabular-nums'] },
  caption: { paddingHorizontal: space[12], gap: space[4] },
  captionText: { fontFamily: font.regular, fontSize: 14, lineHeight: 18, color: color.text.primary },
  captionTitle: { fontFamily: font.semiBold },
  time: { ...text.caption, color: color.text.secondary },
});
