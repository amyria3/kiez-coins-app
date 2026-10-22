import { memo } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { Text } from './T';
import { Image } from 'expo-image';

import { formatRemainingShort } from '../data/format';
import type { Challenge, User } from '../data/types';
import { color, font, radius, size, space, stroke, text } from '../theme/tokens';
import { Avatar, hiddenText, useHideName } from './AuthorRow';
import { BountyBadge } from './Badges';
import { LivingCrystal } from './icons/Brand';
import { Icon } from './icons/Icon';
import { IconButton } from './IconButton';
import { t } from '../data/texts';

const COMPLETED = new Set(['confirmed', 'payment_open', 'paid_marked', 'paid']);

type ChallengePostProps = {
  challenge: Challenge;
  author: User;
  /** Entfernung, z. B. „300 m“, wenn Standort und Challenge-Punkt bekannt sind */
  distance?: string;
  onPress: () => void;
  /** Sprechblase: Detail mit den Kommentaren öffnen. Ohne: wie onPress */
  onCommentPress?: () => void;
  onLike: () => void;
  /** Nur bei eigenen Challenges: führt zu „Deine Challenges“ */
  onManage?: () => void;
};

/**
 * Figma „ChallengePost“ (Type=Individual|Wave, Completed?), Upgrade „Nachtschicht“:
 * Foto als Karte, Bounty oben rechts, Titel und Autor auf einer Glasleiste unten im Foto.
 */
export const ChallengePost = memo(function ChallengePost({
  challenge,
  author,
  distance,
  onPress,
  onCommentPress,
  onLike,
  onManage,
}: ChallengePostProps) {
  const isWave = challenge.type === 'wave';
  const completed = COMPLETED.has(challenge.status);
  const closed = challenge.status === 'closed';
  const image = isWave && completed && challenge.imageAfter ? challenge.imageAfter : challenge.image;
  const state = closed ? 'geschlossen' : completed ? 'erledigt' : formatRemainingShort(challenge.deadline).replace('Noch', 'noch');
  const hideName = useHideName(author);
  const meta = [distance, state].filter(Boolean).join(' · ');
  const commentCount = challenge.comments.length;

  return (
    <View style={styles.post}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('{title} öffnen', { title: challenge.title })}
        style={({ pressed }) => [styles.card, !image && styles.cardNoPhoto, pressed && styles.pressed]}
      >
        {image ? <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        {!isWave && challenge.bountyAmount ? (
          <View style={styles.bounty}>
            <BountyBadge amount={challenge.bountyAmount} />
          </View>
        ) : null}
        {challenge.edensteine ? (
          <View style={[styles.bounty, styles.eden]} accessible accessibilityLabel={t('{edensteine} Edensteine', { edensteine: challenge.edensteine })}>
            <View style={styles.edenCrystal}>
              <View style={styles.edenCrystalFloat}>
                <LivingCrystal height={46} amount={challenge.edensteine} />
              </View>
            </View>
            <Text style={styles.edenText}>{challenge.edensteine}</Text>
          </View>
        ) : null}
        {closed ? (
          <View style={[styles.waveTag, styles.closedTag]}>
            <Text style={styles.closedText}>Geschlossen</Text>
          </View>
        ) : null}
        {isWave ? (
          <View style={styles.waveTag}>
            <Text style={styles.waveText}>Wave</Text>
          </View>
        ) : null}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {challenge.title}
          </Text>
          <View style={styles.metaRow}>
            <Avatar user={author} diameter={20} />
            <Text style={styles.meta} numberOfLines={1}>
              <Text style={hideName ? hiddenText : undefined}>{author.name}</Text>
              {meta ? ` · ${meta}` : null}
            </Text>
          </View>
        </View>
      </Pressable>
      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          {/* Herz mit Anzahl; das Geschenk ist ausgeblendet (Daria, 22.10.2026) */}
          <View style={styles.commentAction}>
            <IconButton
              icon="heart"
              iconSize={size.icon}
              accessibilityLabel={challenge.likeCount ? t('Gefällt mir, {likeCount} Likes', { likeCount: challenge.likeCount }) : t('Gefällt mir')}
              active={challenge.likedByMe}
              onPress={onLike}
            />
            {challenge.likeCount ? <Text style={styles.count}>{challenge.likeCount}</Text> : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={commentCount ? t('Kommentieren, {commentCount} Kommentare', { commentCount }) : t('Kommentieren')}
            onPress={onCommentPress ?? onPress}
            style={({ pressed }) => [styles.commentAction, pressed && styles.pressed]}
          >
            <View style={styles.commentIcon}>
              <Icon name="comment" size={size.icon} color={color.text.primary} />
            </View>
            {commentCount > 0 ? <Text style={styles.count}>{commentCount}</Text> : null}
          </Pressable>
          <IconButton
            icon="send"
            iconSize={size.icon}
            accessibilityLabel={t('Teilen')}
            onPress={() => Share.share({ message: t('{title} – Kiez Coins', { title: challenge.title }) })}
          />
        </View>
        <View style={styles.actionsRight}>
          {onManage ? (
            // Zahnrad statt Text-Button (Daria, 22.10.2026)
            <IconButton
              icon="settings"
              iconSize={size.icon}
              accessibilityLabel={t('Deine Challenges verwalten')}
              onPress={onManage}
            />
          ) : null}
        </View>
      </View>
      {challenge.text ? (
        <Pressable onPress={onPress} style={styles.textBlock}>
          <Text style={styles.body} numberOfLines={2}>
            <WithMentions value={challenge.text} />
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
});

function comingSoon() {
  Alert.alert('Kommt bald', 'Geschenke folgen nach dem MVP.');
}

/** @-Namen in color/accent/signal hervorheben (verschachteltes Text). */
function WithMentions({ value }: { value: string }) {
  const parts = value.split(/(@[\p{L}\p{N}_]+)/u);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <Text key={i} style={{ color: color.accent.signal }}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </>
  );
}

const styles = StyleSheet.create({
  post: { paddingHorizontal: space[16] },
  card: {
    height: 360,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: color.bg.surface,
    justifyContent: 'flex-end',
    padding: space[8],
  },
  // Gruppenaufgabe ohne Foto: nur Glasleiste mit Titel
  cardNoPhoto: { height: 150 },
  eden: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  // Ein großer Edenstein, der oben und unten über das Badge ragt
  edenCrystal: { width: 26, height: 22, alignItems: 'center' },
  edenCrystalFloat: { position: 'absolute', top: (22 - 46) / 2 },
  edenText: { fontFamily: font.display, fontSize: 18, lineHeight: 22, color: color.accent.confirmation },
  pressed: { opacity: 0.9 },
  bounty: {
    position: 'absolute',
    top: space[12],
    right: space[12],
    paddingVertical: space[6],
    paddingLeft: space[8],
    paddingRight: space[12],
    borderRadius: radius.full,
    backgroundColor: color.bg.glass,
    borderWidth: stroke.ultraThin,
    borderColor: color.line.hairline,
  },
  waveTag: {
    position: 'absolute',
    top: space[12],
    left: space[12],
    paddingVertical: space[4],
    paddingHorizontal: space[12],
    borderRadius: radius.full,
    backgroundColor: color.bg.glass,
    borderWidth: stroke.ultraThin,
    borderColor: color.accent.affection,
  },
  waveText: { ...text.caption, color: color.accent.affection },
  closedTag: { borderColor: color.line.hairline },
  closedText: { ...text.caption, color: color.text.primary },
  // Verwalten bleibt immer ganz sichtbar rechts
  actionsRight: { flexDirection: 'row', alignItems: 'center', gap: space[8], flexShrink: 0, marginLeft: space[8] },
  commentAction: { flexDirection: 'row', alignItems: 'center', paddingRight: space[8] },
  commentIcon: { width: size.touchTarget, height: size.touchTarget, alignItems: 'center', justifyContent: 'center' },
  manage: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: space[12],
    borderRadius: radius.full,
    borderWidth: stroke.thin,
    borderColor: color.line.hairline,
  },
  manageText: { ...text.caption, color: color.text.primary },
  info: {
    gap: space[6],
    paddingVertical: space[12],
    paddingHorizontal: space[16],
    borderRadius: radius.xl,
    backgroundColor: color.bg.glass,
    borderWidth: stroke.ultraThin,
    borderColor: color.line.hairline,
  },
  title: { ...text.cardTitle, color: color.text.primary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  meta: { ...text.caption, fontSize: 13, color: color.text.secondary, flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: space[4] },
  actionsLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  count: { ...text.caption, fontSize: 13, color: color.text.secondary, marginLeft: -space[8] },
  textBlock: { paddingHorizontal: space[4], paddingBottom: space[8] },
  body: { ...text.body, color: color.text.secondary },
});
