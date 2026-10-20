import { memo } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { formatRemainingShort } from '../data/format';
import type { Challenge, User } from '../data/types';
import { color, radius, size, space, stroke, text } from '../theme/tokens';
import { Avatar } from './AuthorRow';
import { BountyBadge } from './Badges';
import { IconButton } from './IconButton';

const COMPLETED = new Set(['confirmed', 'payment_open', 'paid_marked', 'paid']);

type ChallengePostProps = {
  challenge: Challenge;
  author: User;
  onPress: () => void;
  onLike: () => void;
};

/**
 * Figma „ChallengePost“ (Type=Individual|Wave, Completed?), Upgrade „Nachtschicht“:
 * Foto als Karte, Bounty oben rechts, Titel und Autor auf einer Glasleiste unten im Foto.
 */
export const ChallengePost = memo(function ChallengePost({ challenge, author, onPress, onLike }: ChallengePostProps) {
  const isWave = challenge.type === 'wave';
  const completed = COMPLETED.has(challenge.status);
  const image = isWave && completed && challenge.imageAfter ? challenge.imageAfter : challenge.image;
  const meta = [author.name, completed ? 'erledigt' : formatRemainingShort(challenge.deadline).replace('Noch', 'noch')]
    .filter(Boolean)
    .join(' · ');
  const commentCount = challenge.comments.length;

  return (
    <View style={styles.post}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${challenge.title} öffnen`}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        {image ? <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        {!isWave && challenge.bountyAmount ? (
          <View style={styles.bounty}>
            <BountyBadge amount={challenge.bountyAmount} />
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
              {meta}
            </Text>
          </View>
        </View>
      </Pressable>
      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          <IconButton
            icon="heart"
            iconSize={size.icon}
            accessibilityLabel="Gefällt mir"
            active={challenge.likedByMe}
            onPress={onLike}
          />
          <IconButton icon="gift" iconSize={size.icon} accessibilityLabel="Geschenk senden" onPress={comingSoon} />
          <IconButton icon="comment" iconSize={size.icon} accessibilityLabel="Kommentieren" onPress={onPress} />
          <IconButton
            icon="send"
            iconSize={size.icon}
            accessibilityLabel="Teilen"
            onPress={() => Share.share({ message: `${challenge.title} – Kiez Coins` })}
          />
        </View>
        {commentCount > 0 ? (
          <Text style={styles.count}>{commentCount === 1 ? '1 Kommentar' : `${commentCount} Kommentare`}</Text>
        ) : null}
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
  actionsLeft: { flexDirection: 'row' },
  count: { ...text.caption, fontSize: 13, color: color.text.secondary, paddingRight: space[4] },
  textBlock: { paddingHorizontal: space[4], paddingBottom: space[8] },
  body: { ...text.body, color: color.text.secondary },
});
