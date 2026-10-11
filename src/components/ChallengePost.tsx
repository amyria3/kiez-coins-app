import { memo } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import type { Challenge, User } from '../data/types';
import { color, radius, space, text } from '../theme/tokens';
import { AuthorRow } from './AuthorRow';
import { BountyBadge } from './Badges';
import { IconButton } from './IconButton';

const COMPLETED = new Set(['confirmed', 'payment_open', 'paid_marked', 'paid']);

type ChallengePostProps = {
  challenge: Challenge;
  author: User;
  onPress: () => void;
  onLike: () => void;
};

/** Figma „ChallengePost“ (Type=Individual|Wave, Completed?) – ein Beitrag im Feed. */
export const ChallengePost = memo(function ChallengePost({ challenge, author, onPress, onLike }: ChallengePostProps) {
  const isWave = challenge.type === 'wave';
  const completed = COMPLETED.has(challenge.status);

  return (
    <View style={styles.post}>
      <AuthorRow
        user={author}
        location={challenge.location}
        trailing={!isWave && challenge.bountyAmount ? <BountyBadge amount={challenge.bountyAmount} /> : undefined}
      />
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${challenge.title} öffnen`}>
        <View style={styles.media}>
          {isWave && completed && challenge.imageAfter ? (
            <>
              <Image source={challenge.imageAfter} style={styles.imageAfter} contentFit="cover" />
              {challenge.imageBefore ? (
                <Image source={challenge.imageBefore} style={styles.imageBefore} contentFit="cover" />
              ) : null}
            </>
          ) : (
            <Image source={challenge.image} style={styles.image} contentFit="cover" />
          )}
        </View>
      </Pressable>
      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          <IconButton
            icon="heart"
            accessibilityLabel="Gefällt mir"
            active={challenge.likedByMe}
            onPress={onLike}
          />
          <IconButton icon="gift" accessibilityLabel="Geschenk senden" onPress={comingSoon} />
          <IconButton icon="comment" accessibilityLabel="Kommentieren" onPress={comingSoon} />
        </View>
        <IconButton
          icon="send"
          accessibilityLabel="Teilen"
          onPress={() => Share.share({ message: `${challenge.title} – Kiez Coins` })}
        />
      </View>
      <Pressable onPress={onPress} style={styles.textBlock}>
        <Text style={styles.body} numberOfLines={2}>
          <WithMentions value={challenge.text} />
        </Text>
      </Pressable>
      {isWave && challenge.challengeText ? (
        <View style={[styles.textBlock, styles.challengeText]}>
          <Text style={styles.body} numberOfLines={2}>
            {challenge.challengeText}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

function comingSoon() {
  Alert.alert('Kommt bald', 'Geschenke und Kommentare folgen nach dem MVP.');
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
  post: { padding: space[12], backgroundColor: color.bg.screen },
  media: {
    gap: space[4],
    overflow: 'hidden',
    borderTopLeftRadius: 0,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    borderBottomLeftRadius: radius.lg,
  },
  image: { width: '100%', aspectRatio: 1 },
  imageAfter: { width: '100%', height: 293 },
  imageBefore: { width: '100%', height: 59 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: space[4] },
  actionsLeft: { flexDirection: 'row' },
  textBlock: { paddingVertical: space[8] },
  challengeText: { opacity: 0.6 },
  body: { ...text.body, color: color.text.primary },
});
