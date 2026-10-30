import { memo, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, StyleSheet, View } from 'react-native';
import { shareText } from '../lib/share';
import { Text } from './T';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

import { formatRelative, formatRemainingShort } from '../data/format';
import type { Challenge, User } from '../data/types';
import { color, font, isFashionable, radius, size, space, stroke, text } from '../theme/tokens';
import { Avatar, hiddenText, useHideName } from './AuthorRow';
import { BeforeAfterPair, BeforeAfterPost } from './BeforeAfterPost';
import { weChallengeAfter, joinedIds, maxParticipants, participationText } from '../data/weChallenge';
import { useAppDimensions } from '../theme/layout';
import { WithMentions, postText } from './WithMentions';
import { BountyBadge, NameWithTestMark } from './Badges';
import { LivingCrystal } from './icons/Brand';
import { Icon } from './icons/Icon';
import { IconButton } from './IconButton';
import { t } from '../data/texts';
import { PhotoTextOverlay } from './PhotoText';

const COMPLETED = new Set(['confirmed', 'payment_open', 'paid_marked', 'paid']);

export type ChallengePostProps = {
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
export const ChallengePost = memo(function ChallengePost(props: ChallengePostProps) {
  if (props.challenge.type === 'before_after') return <BeforeAfterPost {...props} />;
  return isFashionable ? <FashionPost {...props} /> : <KiezPost {...props} />;
});

/** Look „Kiez“ */
function KiezPost({
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
  // Erledigte We-Challenge: Aufgabenfoto als Vorher, Erledigungsfoto als Nachher (Daria, 27.10.2026)
  const after = image ? weChallengeAfter(challenge) : undefined;
  const body = postText(challenge);
  // Bild: Zeitstempel statt Restzeit, denn ein Bild läuft nicht ab (Daria, 30.10.2026)
  const isPhoto = challenge.type === 'photo';
  const state = closed
    ? 'geschlossen'
    : completed
      ? 'erledigt'
      : isPhoto
        ? formatRelative(challenge.createdAt)
        : formatRemainingShort(challenge.deadline).replace('Noch', 'noch');
  const hideName = useHideName(author);
  const router = useRouter();
  const meta = [distance, state, spotsText(challenge, active)].filter(Boolean).join(' · ');
  const commentCount = challenge.comments.length;

  // Einmal tippen zeigt, wer gepostet hat. Noch mal tippen (auch doppelt) oder lange drücken öffnet den Post.
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

  // Bounty und Edensteine oben rechts auf dem Foto
  const rewards = (
    <>
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
    </>
  );

  const infoBar = (
    <>
      <Text style={styles.title} numberOfLines={2}>
        {challenge.title}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta} numberOfLines={1}>
          <Text noTranslate style={hideName ? hiddenText : undefined}>{author.name}</Text>
          {meta ? ` · ${meta}` : null}
        </Text>
      </View>
    </>
  );

  return (
    <View style={styles.post}>
      {after ? (
        // Erledigte We-Challenge: Bildpaar wie bei der Me-Challenge, Glasleiste unten, Bounty und Edensteine oben rechts
        <View>
          <BeforeAfterPair
            before={image}
            after={after}
            height={360}
            rounded
            onLongPress={open}
            onPress={open}
            overlay={
              <Pressable
                onPress={open}
                accessibilityRole="button"
                accessibilityLabel={t('{title} öffnen', { title: challenge.title })}
                style={[styles.info, styles.infoOnPhoto]}
              >
                <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
                {infoBar}
              </Pressable>
            }
          />
          <View pointerEvents="none" style={styles.pairRewards}>
            {rewards}
          </View>
        </View>
      ) : (
        <Pressable
          onPress={tap}
          onLongPress={open}
          delayLongPress={350}
          accessibilityRole="button"
          accessibilityLabel={t('{title} öffnen', { title: challenge.title })}
          accessibilityHint={t('Tippe einmal, um den Namen anzuzeigen, oder zweimal oder lange, um den Post zu öffnen.')}
          accessibilityActions={[{ name: 'activate' }]}
          onAccessibilityAction={open}
          style={({ pressed }) => [styles.card, !image && styles.cardNoPhoto, pressed && styles.pressed]}
        >
          {image ? <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          {image && challenge.type === 'photo' ? <PhotoTextOverlay value={challenge.photoText} /> : null}
          {image ? rewards : null}
          {image && closed ? (
            <View style={[styles.waveTag, styles.closedTag]}>
              <Text style={styles.closedText}>Geschlossen</Text>
            </View>
          ) : null}
          {image && isWave ? (
            <View style={styles.waveTag}>
              <Text style={styles.waveText}>Wave</Text>
            </View>
          ) : null}
          {/* Wer hat gepostet: nach dem ersten Tippen oben links, Bild und Name wie bei großen Foto-Apps */}
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
                <NameWithTestMark test={author.test}>
                  <Text noTranslate style={[styles.whoName, hideName ? hiddenText : null]} numberOfLines={1}>
                    {author.name}
                  </Text>
                </NameWithTestMark>
                <Text style={styles.whoMeta} numberOfLines={1}>
                  {formatRelative(challenge.createdAt)}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
          {image ? (
            <View style={[styles.info, styles.infoOnPhoto]}>
              <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
              {infoBar}
            </View>
          ) : (
            // Ohne Foto (Daria, 30.10.2026): keine leere Fläche, Titel und Name links, Belohnung rechts daneben
            <View style={styles.plainRow}>
              <View style={[styles.info, styles.infoPlain, styles.plainInfo]}>
                {closed || isWave ? (
                  <View style={[styles.waveTag, styles.tagInline, closed && styles.closedTag]}>
                    <Text style={closed ? styles.closedText : styles.waveText}>{closed ? 'Geschlossen' : 'Wave'}</Text>
                  </View>
                ) : null}
                {infoBar}
              </View>
              <View style={styles.plainRewards}>{rewards}</View>
            </View>
          )}
        </Pressable>
      )}
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
            onPress={() => shareText(t('{title} – KiezCoins', { title: challenge.title }))}
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
      {body ? (
        <Pressable onPress={onPress} style={styles.textBlock}>
          <Text style={styles.body} numberOfLines={after ? 4 : 2}>
            <WithMentions value={body} />
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Mehrere Personen: „2 von 5 dabei“, solange die Challenge läuft (Daria, 27.10.2026) */
function spotsText(c: Challenge, active: boolean): string {
  if (!active || c.type !== 'individual') return '';
  return participationText(maxParticipants(c), c.joinMode, joinedIds(c).length);
}

/**
 * Look „Fashionable“ (Daria, 2026-10-23): Kopfzeile mit Bild, Name und Kiez über dem Foto, Foto quadratisch über die
 * ganze Breite, darunter Herz, Sprechblase, Teilen und der Text mit fettem Titel vorn. Ein Tipp aufs Foto öffnet den Post.
 */
function FashionPost({ challenge, author, distance, onPress, onCommentPress, onLike, onManage }: ChallengePostProps) {
  const isWave = challenge.type === 'wave';
  const completed = COMPLETED.has(challenge.status);
  const closed = challenge.status === 'closed';
  const active = !closed && !completed;
  const image = isWave && completed && challenge.imageAfter ? challenge.imageAfter : challenge.image;
  // Erledigte We-Challenge: Aufgabenfoto als Vorher, Erledigungsfoto als Nachher (Daria, 27.10.2026)
  const after = image ? weChallengeAfter(challenge) : undefined;
  const body = postText(challenge);
  // Bild: Zeitstempel statt Restzeit, denn ein Bild läuft nicht ab (Daria, 30.10.2026)
  const isPhoto = challenge.type === 'photo';
  const state = closed
    ? 'geschlossen'
    : completed
      ? 'erledigt'
      : isPhoto
        ? formatRelative(challenge.createdAt)
        : formatRemainingShort(challenge.deadline).replace('Noch', 'noch');
  const hideName = useHideName(author);
  const router = useRouter();
  const place = [challenge.kiez?.split(',')[0] ?? challenge.location, distance, spotsText(challenge, active)].filter(Boolean).join(' · ');
  const commentCount = challenge.comments.length;
  const { width } = useAppDimensions();

  return (
    <View style={fashion.post}>
      <View style={fashion.head}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Profil von {name}', { name: author.name })}
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: author.id, challengeId: challenge.id } })}
          style={({ pressed }) => [fashion.headWho, pressed && styles.pressed]}
        >
          <Avatar user={author} diameter={32} />
          <View style={styles.whoTexts}>
            <NameWithTestMark test={author.test}>
              <Text noTranslate style={[fashion.name, hideName ? hiddenText : null]} numberOfLines={1}>
                {author.name}
              </Text>
            </NameWithTestMark>
            {place ? (
              <Text style={fashion.place} numberOfLines={1}>
                {place}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <View style={fashion.headRight}>
          {!isWave && challenge.bountyAmount ? <BountyBadge amount={challenge.bountyAmount} small /> : null}
          {challenge.edensteine ? (
            // Angabe neben dem Namen, kein Knopf: Stein so hoch wie die Schrift, 4 pt bis zur Zahl, ohne Druckfläche
            <View style={fashion.eden} accessible accessibilityLabel={t('{edensteine} Edensteine', { edensteine: challenge.edensteine })}>
              <LivingCrystal height={30} seed={challenge.id} calm={!active} />
              <Text style={[fashion.edenText, active ? null : styles.edenTextDone]}>{challenge.edensteine}</Text>
            </View>
          ) : null}
          {onManage ? (
            // Zahnrad wie im Mockup oben rechts am Beitrag
            <IconButton icon="settings" iconSize={size.icon} accessibilityLabel={t('Deine Challenges verwalten')} onPress={onManage} />
          ) : null}
        </View>
      </View>
      {/* Ohne Foto keine Fläche: Der Titel steht fett im Text (Daria, 24.10.2026) */}
      {after ? (
        <BeforeAfterPair before={image} after={after} height={(width * 5) / 4} onLongPress={onPress} onPress={onPress} />
      ) : image ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={t('{title} öffnen', { title: challenge.title })}
          style={fashion.photo}
        >
          <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" />
          {challenge.type === 'photo' ? <PhotoTextOverlay value={challenge.photoText} /> : null}
          {isWave ? (
            <View style={styles.waveTag}>
              <Text style={styles.waveText}>Wave</Text>
            </View>
          ) : null}
        </Pressable>
      ) : (
        <View style={fashion.noPhotoLine} />
      )}
      <View style={fashion.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: !!challenge.likedByMe }}
          accessibilityLabel={challenge.likeCount ? t('Gefällt mir, {likeCount} Likes', { likeCount: challenge.likeCount }) : t('Gefällt mir')}
          onPress={onLike}
          style={({ pressed }) => [styles.countAction, pressed && styles.pressed]}
        >
          <Icon name="heart" size={size.icon} color={challenge.likedByMe ? color.accent.affection : color.text.primary} />
          {challenge.likeCount ? <Text style={fashion.count}>{challenge.likeCount}</Text> : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={commentCount ? t('Kommentieren, {commentCount} Kommentare', { commentCount }) : t('Kommentieren')}
          onPress={onCommentPress ?? onPress}
          style={({ pressed }) => [styles.countAction, pressed && styles.pressed]}
        >
          <Icon name="comment" size={size.icon} color={color.text.primary} />
          {commentCount > 0 ? <Text style={fashion.count}>{commentCount}</Text> : null}
        </Pressable>
        <IconButton
          icon="send"
          iconSize={size.icon}
          accessibilityLabel={t('Teilen')}
          onPress={() => shareText(t('{title} – KiezCoins', { title: challenge.title }))}
        />
        {/* Status rechts unter dem Bild, als Angabe in Grau (Daria, 24.10.2026) */}
        <Text style={[fashion.state, closed && fashion.stateClosed]} numberOfLines={1}>
          {closed ? 'Geschlossen' : completed ? 'Erledigt' : state.replace(/^noch/, 'Noch')}
        </Text>
      </View>
      <Pressable onPress={onPress} style={fashion.caption}>
        <Text style={fashion.captionText} numberOfLines={after ? 5 : 3}>
          <Text style={fashion.captionTitle}>{challenge.title} </Text>
          {body ? <WithMentions value={body} /> : null}
        </Text>
        {/* Beim Bild steht der Zeitstempel schon rechts neben den Knöpfen */}
        {isPhoto ? null : <Text style={fashion.time}>{formatRelative(challenge.createdAt)}</Text>}
      </Pressable>
    </View>
  );
}

function comingSoon() {
  Alert.alert('Kommt bald', 'Geschenke folgen nach dem MVP.');
}

/**
 * Maße im Look „Fashionable“ (Daria, 23.10.2026), in pt:
 * Kopf 54 hoch: links 12, rechts 4 (das Zahnrad bringt 44 Fläche mit), Bild 32, 10 bis zum Namen.
 * Foto über die ganze Breite im Hochformat 4:5 wie große Foto-Apps, ohne Foto 4:3 mit Titel.
 * Aktionen 44 hoch, links 4, Icons 24. Text links und rechts 12, 4 zwischen den Zeilen, 16 bis zum nächsten Beitrag.
 */
const fashion = StyleSheet.create({
  post: { paddingBottom: space[16] },
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
  headRight: { flexDirection: 'row', alignItems: 'center', gap: space[8], flexShrink: 0 },
  name: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 18, color: color.text.primary },
  place: { ...text.caption, fontSize: 12, color: color.text.primary },
  photo: { width: '100%', aspectRatio: 4 / 5, backgroundColor: color.bg.surface, overflow: 'hidden' },
  noPhotoLine: { height: stroke.ultraThin, backgroundColor: color.line.hairline, marginHorizontal: space[12] },
  state: { flex: 1, textAlign: 'right', paddingRight: space[8], fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.text.secondary },
  stateClosed: { color: color.text.primary, fontFamily: font.semiBold },
  actions: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: space[4] },
  count: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.text.primary, fontVariant: ['tabular-nums'] },
  caption: { paddingHorizontal: space[12], gap: space[4] },
  captionText: { fontFamily: font.regular, fontSize: 14, lineHeight: 18, color: color.text.primary },
  captionTitle: { fontFamily: font.semiBold },
  time: { ...text.caption, color: color.text.secondary },
  eden: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  edenText: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 18, color: color.text.primary, fontVariant: ['tabular-nums'] },
});

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
  // Ohne Foto: so hoch wie der Inhalt (Daria, 30.10.2026)
  cardNoPhoto: { height: 'auto', justifyContent: 'center' },
  plainRow: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  plainInfo: { flex: 1, alignItems: 'flex-start' },
  plainRewards: { alignItems: 'flex-end', gap: space[8] },
  tagInline: { position: 'relative', top: 0, left: 0, marginBottom: space[4] },
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
  // Ohne Foto: im Fluss rechts neben dem Titel statt absolut oben rechts
  plain: { paddingLeft: 0, paddingRight: 0, position: 'relative', top: 0, right: 0 },
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
  // Über dem Bildpaar: Bounty und Edensteine liegen über beiden Fotos, ohne Tipps abzufangen
  pairRewards: { position: 'absolute', top: 0, right: 0, left: 0, height: 64, zIndex: 4 },
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
