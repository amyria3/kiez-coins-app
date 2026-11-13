import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';

import { beforeAfterDuration, formatHoursMinutes, formatRelative } from '../data/format';
import { t } from '../data/texts';
import type { ImageSource } from '../data/types';
import { useShareChallenge } from '../data/shareChallenge';

import { color, font, motion, radius, size, space, stroke, text } from '../theme/tokens';
import { hiddenText, useHideName } from './AuthorRow';
import type { ChallengePostProps } from './ChallengePost';
import { Icon } from './icons/Icon';
import { IconButton } from './IconButton';
import { Text } from './T';
import { LikeCount } from './LikeCount';
import { BeforeAfterText } from './WithMentions';

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
          accessibilityHint={single ? t('Öffnet den Beitrag') : t('Tippen vergrößert das Vorher-Foto, noch mal tippen stellt zurück.')}
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
            accessibilityHint={t('Tippen vergrößert das Nachher-Foto, noch mal tippen stellt zurück.')}
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
          <Icon name="clock-filled" size={12} color={color.text.primary} />
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
  return <KiezBeforeAfter {...props} />;
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
  const share = useShareChallenge();
  const commentCount = challenge.comments.length;
  const countStyle = styles.count;
  const manage = onManage && true ? (
    <IconButton icon="settings" iconSize={size.icon} accessibilityLabel={t('Deine Posts verwalten')} onPress={onManage} />
  ) : null;
  return (
    <View style={styles.actions}>
      {/* Kiez-Look: Knöpfe rechtsbündig, Verwalten links (Daria, 2026-11-09) */}
      {(
        <>
          {manage}
          {end}
          <View style={styles.flex} />
        </>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: !!challenge.likedByMe }}
        accessibilityLabel={challenge.likeCount ? t('Gefällt mir, {likeCount} Likes', { likeCount: challenge.likeCount }) : t('Gefällt mir')}
        onPress={onLike}
        style={({ pressed }) => [styles.countAction, pressed && styles.pressed]}
      >
        <Icon name="heart" size={size.icon} color={challenge.likedByMe ? color.accent.affection : color.text.primary} />
      </Pressable>
      <LikeCount challengeId={challenge.id} count={challenge.likeCount} style={countStyle} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={commentCount ? t('Kommentieren, {commentCount} Kommentare', { commentCount }) : t('Kommentieren')}
        onPress={onCommentPress ?? onPress}
        style={({ pressed }) => [styles.countAction, pressed && styles.pressed]}
      >
        <Icon name="comment-filled" size={size.icon} color={color.text.primary} />
        {commentCount > 0 ? <Text style={countStyle}>{commentCount}</Text> : null}
      </Pressable>
      <IconButton
        icon="send"
        iconSize={size.icon}
        accessibilityLabel={t('Teilen')}
        onPress={() => share(challenge)}
      />

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
          {/* Me-Challenge: #vorher und #nachher zusammen höchstens drei Zeilen (Daria, 2026-11-09) */}
          <BeforeAfterText value={challenge.text} style={styles.body} />
        </Pressable>
      ) : null}
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
  rounded: { borderRadius: radius.post },
  half: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
  dim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.25)' },
  seam: { position: 'absolute', left: 0, right: 0, height: 2, marginTop: -1, backgroundColor: color.bg.screen },
  tag: {
    position: 'absolute',
    top: space[12],
    left: space[12],
    paddingVertical: space[4],
    paddingHorizontal: space[8],
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: color.overlay.medium,
  },
  tagText: {
    ...text.tag,
    letterSpacing: 0.4,
    textTransform: 'none',
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
    borderRadius: radius.full,
    backgroundColor: color.bg.screen,
    zIndex: 2,
  },
  // Ohne Nachher-Foto: oben rechts
  durationBottom: { top: space[12], marginTop: 0 },
  durationText: { ...text.captionStrong, color: color.text.primary, fontVariant: ['tabular-nums'] },
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
  meta: { ...text.meta, color: color.text.secondary },
  // Look „Kiez“
  post: { paddingHorizontal: space[16] },
  actions: { flexDirection: 'row', alignItems: 'center', paddingTop: space[4] },
  count: { ...text.bodyLarge, color: color.text.primary, fontVariant: ['tabular-nums'] },
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
  name: { ...text.bodyStrong, color: color.text.primary },
  place: { ...text.small, color: color.text.primary },
  caption: { paddingHorizontal: space[12], gap: space[4] },
  captionText: { ...text.bodySm, color: color.text.primary },
  captionTitle: { fontFamily: font.semiBold },
  time: { ...text.caption, color: color.text.secondary },
});
