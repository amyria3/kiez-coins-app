import { memo, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, StyleSheet, View } from 'react-native';
import { shareText } from '../lib/share';
import { Text } from './T';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

import { formatRelative, formatRemainingShort } from '../data/format';
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
  const active = !closed && !completed;
  const image = isWave && completed && challenge.imageAfter ? challenge.imageAfter : challenge.image;
  const state = closed ? 'geschlossen' : completed ? 'erledigt' : formatRemainingShort(challenge.deadline).replace('Noch', 'noch');
  const hideName = useHideName(author);
  const router = useRouter();
  const meta = [distance, state].filter(Boolean).join(' · ');
  const commentCount = challenge.comments.length;

  // Einmal tippen zeigt, wer gepostet hat. Nochmal tippen (auch doppelt) oder lange drücken öffnet den Post.
  const [who, setWho] = useState(false);
  const whoAnim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    Animated.spring(whoAnim, { toValue: who ? 1 : 0, friction: 7, tension: 90, useNativeDriver: true }).start();
    clearTimeout(hideTimer.current);
    if (who) hideTimer.current = setTimeout(() => setWho(false), 4000);
    return () => clearTimeout(hideTimer.current);
  }, [who, whoAnim]);
  const tap = () => {
    if (who) {
      setWho(false);
      onPress();
    } else setWho(true);
  };
  const open = () => {
    setWho(false);
    onPress();
  };

  return (
    <View style={styles.post}>
      <Pressable
        onPress={tap}
        onLongPress={open}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={t('{title} öffnen', { title: challenge.title })}
        accessibilityHint={t('Einmal tippen zeigt, wer gepostet hat. Nochmal tippen öffnet den Post.')}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={open}
        style={({ pressed }) => [styles.card, !image && styles.cardNoPhoto, pressed && styles.pressed]}
      >
        {image ? <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        {!isWave && challenge.bountyAmount ? (
          <View style={[styles.bounty, image ? styles.onPhoto : styles.plain]}>
            {image ? (
              <View style={styles.badgeBlur}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              </View>
            ) : null}
            <BountyBadge amount={challenge.bountyAmount} small />
          </View>
        ) : null}
        {challenge.edensteine ? (
          <View style={[styles.bounty, styles.eden, image ? styles.onPhoto : styles.plain]} accessible accessibilityLabel={t('{edensteine} Edensteine', { edensteine: challenge.edensteine })}>
            {image ? (
              <View style={styles.badgeBlur}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              </View>
            ) : null}
            {/* Edenstein nur bei aktiven Aufgaben; geschlossen oder erledigt nur die Zahl in Grau */}
            {active ? (
              <View style={styles.edenCrystal}>
                <View style={styles.edenCrystalFloat}>
                  <LivingCrystal height={40} seed={challenge.id} />
                </View>
              </View>
            ) : null}
            <Text style={[styles.edenText, active ? null : styles.edenTextDone]}>{challenge.edensteine}</Text>
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
        {/* Wer hat gepostet: nach dem ersten Tippen oben links, Bild und Name wie bei Instagram */}
        <Animated.View
          pointerEvents={who ? 'box-none' : 'none'}
          style={[
            styles.who,
            {
              opacity: whoAnim,
              transform: [{ translateY: whoAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Profil von {name}', { name: author.name })}
            onPress={() => {
              setWho(false);
              router.push({ pathname: '/user/[id]', params: { id: author.id, challengeId: challenge.id } });
            }}
            style={({ pressed }) => [styles.whoRow, pressed && styles.pressed]}
          >
            <Avatar user={author} diameter={40} />
            <View style={styles.whoTexts}>
              <Text noTranslate style={[styles.whoName, hideName ? hiddenText : null]} numberOfLines={1}>
                {author.name}
              </Text>
              <Text style={styles.whoMeta} numberOfLines={1}>
                {formatRelative(challenge.createdAt)}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
        <View style={[styles.info, image ? styles.infoOnPhoto : styles.infoPlain]}>
          {image ? <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} /> : null}
          <Text style={styles.title} numberOfLines={2}>
            {challenge.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta} numberOfLines={1}>
              <Text noTranslate style={hideName ? hiddenText : undefined}>{author.name}</Text>
              {meta ? ` · ${meta}` : null}
            </Text>
          </View>
        </View>
      </Pressable>
      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          {/* Herz mit Anzahl; das Geschenk ist ausgeblendet (Daria, 22.10.2026) */}
          {/* Icon und Zahl als ein Knopf, Zahl mit festem Abstand rechts daneben (Daria, 22.10.2026) */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: !!challenge.likedByMe }}
            accessibilityLabel={challenge.likeCount ? t('Gefällt mir, {likeCount} Likes', { likeCount: challenge.likeCount }) : t('Gefällt mir')}
            onPress={onLike}
            style={({ pressed }) => [styles.countAction, pressed && styles.pressed]}
          >
            <Icon name="heart" size={size.icon} color={challenge.likedByMe ? color.accent.affection : color.text.primary} />
            {challenge.likeCount ? <Text style={styles.count}>{challenge.likeCount}</Text> : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={commentCount ? t('Kommentieren, {commentCount} Kommentare', { commentCount }) : t('Kommentieren')}
            onPress={onCommentPress ?? onPress}
            style={({ pressed }) => [styles.countAction, pressed && styles.pressed]}
          >
            <Icon name="comment" size={size.icon} color={color.text.primary} />
            {commentCount > 0 ? <Text style={styles.count}>{commentCount}</Text> : null}
          </Pressable>
          <IconButton
            icon="send"
            iconSize={size.icon}
            accessibilityLabel={t('Teilen')}
            onPress={() => shareText(t('{title} – Kiez Coins', { title: challenge.title }))}
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
    // Glasleiste mit Abstand zum Kartenrand (Daria, 22.10.2026)
    padding: space[12],
  },
  // Gruppenaufgabe ohne Foto: nur Glasleiste mit Titel
  cardNoPhoto: { height: 150 },
  eden: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  // Ein großer Edenstein, der oben und unten über das Badge ragt
  edenCrystal: { width: 22, height: 20, alignItems: 'center' },
  edenCrystalFloat: { position: 'absolute', top: (20 - 40) / 2 },
  edenText: { fontFamily: font.display, fontSize: 16, lineHeight: 20, color: color.accent.confirmation },
  edenTextDone: { color: color.text.secondary },
  pressed: { opacity: 0.9 },
  // Bounty rechts oben, Hinweise wie „Geschlossen“ links (Daria, 22.10.2026)
  bounty: {
    position: 'absolute',
    top: space[12],
    right: space[12],
    paddingVertical: space[4],
    paddingLeft: space[8],
    paddingRight: space[12],
  },
  // Auf dem Foto: wenig Farbe, viel Unschärfe, ohne Rand. Ohne Foto: gar keine Fläche (Daria, 22.10.2026).
  // Die Unschärfe liegt in einer eigenen Ebene, damit der Edenstein über das Badge ragen darf.
  onPhoto: {},
  badgeBlur: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: 'rgba(31, 33, 35, 0.25)',
  },
  plain: { paddingLeft: 0, paddingRight: 0 },
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
    overflow: 'hidden',
  },
  infoOnPhoto: {
    backgroundColor: 'rgba(31, 33, 35, 0.3)',
    borderWidth: stroke.ultraThin,
    borderColor: color.line.hairline,
  },
  infoPlain: { paddingHorizontal: space[4] },
  who: {
    position: 'absolute',
    top: space[12],
    left: space[12],
    right: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    zIndex: 2,
  },
  whoTexts: { flexShrink: 1 },
  whoRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  // Schatten statt Fläche, damit Name und Zeit auf jedem Foto lesbar bleiben
  whoName: { ...text.cardTitle, fontSize: 16, lineHeight: 20, color: color.text.primary, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  whoMeta: { ...text.caption, fontSize: 12, color: color.text.primary, opacity: 0.85, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  title: { ...text.cardTitle, color: color.text.primary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  meta: { ...text.caption, fontSize: 13, color: color.text.secondary, flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: space[4] },
  actionsLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
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
});
