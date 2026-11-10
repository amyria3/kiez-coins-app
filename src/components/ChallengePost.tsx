import { RoutinePill } from './RoutinePill';
import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useShareChallenge } from '../data/shareChallenge';
import { Text } from './T';
import { LikeCount } from './LikeCount';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

import { formatBountyShort, formatRelative, formatRemainingShort } from '../data/format';
import { isPostOnly, type Challenge, type User } from '../data/types';
import { color, font, isFashionable, radius, size, space, stroke, text } from '../theme/tokens';
import { Avatar, hiddenText, useHideName } from './AuthorRow';
import { BeforeAfterPair, BeforeAfterPost } from './BeforeAfterPost';
import { weChallengeAfter, joinedIds, maxParticipants, participationText } from '../data/weChallenge';
import { useAppDimensions } from '../theme/layout';
import { BeforeAfterText, PHOTO_TAG, WithMentions, postText, tagColor } from './WithMentions';
import { BountyBadge, DoneReward, NameWithTestMark } from './Badges';
import { LivingCrystal } from './icons/Brand';
import { Icon } from './icons/Icon';
import { IconButton } from './IconButton';
import { t } from '../data/texts';
import { PhotoTextOverlay } from './PhotoText';
import { SheetPager, isTextPost } from './TextSheets';

const isWeb = Platform.OS === 'web';

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
  /** Umhüllt das Herz, z. B. mit dem lila Ring der Tour (TourDemo) */
  wrapLike?: (heart: ReactNode) => ReactNode;
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
  wrapLike = (heart) => heart,
}: ChallengePostProps) {
  const share = useShareChallenge();
  const isWave = challenge.type === 'wave';
  const completed = COMPLETED.has(challenge.status);
  const closed = challenge.status === 'closed';
  const active = !closed && !completed;
  const image = isWave && completed && challenge.imageAfter ? challenge.imageAfter : challenge.image;
  // Erledigte We-Challenge: Aufgabenfoto als Vorher, Erledigungsfoto als Nachher (Daria, 27.10.2026)
  const after = image ? weChallengeAfter(challenge) : undefined;
  const textPages = isTextPost(challenge) ? challenge.pages : undefined;
  // Bild: Zeitstempel statt Restzeit, denn ein Bild läuft nicht ab (Daria, 30.10.2026)
  const isPhoto = challenge.type === 'photo';
  // Bild mit Foto: #InDiesemMoment steht unten links auf dem Foto, unter den Knöpfen nur der eigene Text (Daria, 2026-11-09)
  const tagOnPhoto = isPhoto && !!image && !textPages;
  const body = tagOnPhoto ? (challenge.text?.trim() ?? '') : postText(challenge);
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

  // Bounty und Edensteine oben rechts auf dem Foto. Erledigt: Haken statt Kristall oder Münze, ohne Verlauf und
  // Bewegung, etwas kleiner (Daria, 2026-11-09). Geschlossen ohne Erledigung: keine Belohnung mehr.
  const rewardBlur = image ? (
    <View style={styles.badgeBlur}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
    </View>
  ) : null;
  const rewards = completed ? (
    <>
      {!isWave && challenge.bountyAmount ? (
        <View style={[styles.bounty, styles.rewardDone, image ? styles.onPhoto : styles.plain]}>
          {rewardBlur}
          <DoneReward value={formatBountyShort(challenge.bountyAmount)} accessibilityLabel={t('Coins: {amount} Euro, erledigt', { amount: challenge.bountyAmount })} />
        </View>
      ) : null}
      {challenge.edensteine ? (
        <View style={[styles.bounty, styles.eden, styles.rewardDone, image ? styles.onPhoto : styles.plain]}>
          {rewardBlur}
          <DoneReward value={String(challenge.edensteine)} accessibilityLabel={t('{edensteine} Edensteine, erledigt', { edensteine: challenge.edensteine })} />
        </View>
      ) : null}
    </>
  ) : closed ? null : (
    <>
      {!isWave && challenge.bountyAmount ? (
        <View style={[styles.bounty, image ? styles.onPhoto : styles.plain]}>
          {rewardBlur}
          <BountyBadge amount={challenge.bountyAmount} small />
        </View>
      ) : null}
      {challenge.edensteine ? (
        <View style={[styles.bounty, styles.eden, image ? styles.onPhoto : styles.plain]} accessible accessibilityLabel={t('{edensteine} Edensteine', { edensteine: challenge.edensteine })}>
          {rewardBlur}
          <View style={styles.edenCrystal}>
            <View style={styles.edenCrystalFloat}>
              <LivingCrystal height={40} seed={challenge.id} />
            </View>
          </View>
          <Text style={styles.edenText}>{challenge.edensteine}</Text>
        </View>
      ) : null}
    </>
  );

  const infoBar = (
    <>
      {challenge.title.trim() ? (
        <Text style={styles.title} numberOfLines={2}>
          {challenge.title}
        </Text>
      ) : null}
      <View style={styles.metaRow}>
        <Text style={styles.meta} numberOfLines={1}>
          <Text noTranslate style={hideName ? hiddenText : undefined}>{author.name}</Text>
          {meta ? ` · ${meta}` : null}
        </Text>
      </View>
    </>
  );

  // Ort auf dem Foto: Stadtteil, sonst Adresse (wie im Fashionable Look)
  const placeOnPhoto = challenge.kiez?.split(',')[0] ?? challenge.location;
  const posted = formatRelative(challenge.createdAt);
  const tappedMeta = [posted, distance, isPhoto ? null : state, spotsText(challenge, active)].filter(Boolean).join(' · ');
  // Oben nach dem Tippen: Ort vor der Zeit, dann der Rest (Daria, 2026-11-07)
  const whoMeta = [placeOnPhoto, ...tappedMeta.split(' · ')]
    .filter(Boolean)
    .map((part) => part.replace(/ /g, '\u00A0'))
    .join(' · ');
  // Belohnung oben rechts: dann bleibt rechts Platz frei, sonst gleicher Rand links und rechts
  const rewardsTop = !!image && ((!isWave && !!challenge.bountyAmount) || !!challenge.edensteine);
  const placeTop = !!placeOnPhoto && !challenge.bountyAmount && !challenge.edensteine;
  // Challenges zeigen ihren Titel immer auf dem Foto, ohne Blur, nur mit weichem Schatten (Daria, 2026-11-07)
  const titleAlways = !isPostOnly(challenge.type) && !!challenge.title.trim();

  // Knöpfe rechtsbündig, Verwalten links (Daria, 2026-11-09). Ohne Foto und ohne Textblätter stehen sie
  // in der grauen Karte (Daria, 2026-11-09).
  const inCard = !image && !textPages && !after;
  const actionsBar = (
    <View style={[styles.actions, inCard && styles.actionsInCard]}>
      <View style={styles.actionsManage}>
        {onManage ? (
          // Zahnrad statt Text-Button (Daria, 22.10.2026)
          <IconButton
            icon="settings"
            iconSize={size.icon}
            accessibilityLabel={t('Deine Posts verwalten')}
            onPress={onManage}
          />
        ) : null}
      </View>
      <View style={styles.actionsButtons}>
        {/* Herz mit Anzahl; das Geschenk ist ausgeblendet (Daria, 22.10.2026) */}
        {/* Herz liked, die Zahl daneben zeigt, wer geliked hat (Daria, 2026-11-05) */}
        {wrapLike(
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: !!challenge.likedByMe }}
            accessibilityLabel={challenge.likeCount ? t('Gefällt mir, {likeCount} Likes', { likeCount: challenge.likeCount }) : t('Gefällt mir')}
            onPress={onLike}
            style={({ pressed }) => [styles.countAction, pressed && styles.pressed]}
          >
            <Icon name="heart" size={size.icon} color={challenge.likedByMe ? color.accent.affection : color.text.primary} />
          </Pressable>
        )}
        <LikeCount challengeId={challenge.id} count={challenge.likeCount} style={styles.count} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={commentCount ? t('Kommentieren, {commentCount} Kommentare', { commentCount }) : t('Kommentieren')}
          onPress={onCommentPress ?? onPress}
          style={({ pressed }) => [styles.countAction, pressed && styles.pressed]}
        >
          <Icon name="comment-filled" size={size.icon} color={color.text.primary} />
          {commentCount > 0 ? <Text style={styles.count}>{commentCount}</Text> : null}
        </Pressable>
        <IconButton
          icon="send"
          iconSize={size.icon}
          accessibilityLabel={t('Teilen')}
          onPress={() => share(challenge)}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.post}>
      {textPages ? (
        // Post nur mit Text: Blätter zum Wischen, darunter der Name. Ort und Zeit erst nach dem ersten
        // Tippen, wie beim Foto; das zweite Tippen öffnet den Post (Daria, 2026-11-07)
        <View>
          <TextCard pages={textPages} title={challenge.title} fontKey={challenge.sheetFont} onPress={tap} />
          <View style={[styles.info, styles.infoPlain]}>
            <View style={styles.metaRow}>
              <Text noTranslate style={[styles.textPostName, hideName ? hiddenText : null]} numberOfLines={1}>
                {author.name}
              </Text>
              {whoMeta ? (
                <Animated.Text style={[styles.textPostMeta, { opacity: whoAnim }]} numberOfLines={1}>
                  {`· ${whoMeta}`}
                </Animated.Text>
              ) : null}
            </View>
          </View>
        </View>
      ) : after ? (
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
                accessibilityLabel={t('{title} öffnen', { title: challenge.title.trim() || t('Foto') })}
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
          accessibilityLabel={t('{title} öffnen', { title: challenge.title.trim() || t('Foto') })}
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
          {/* Im Web liegt keine Deckkraft über dem Blur: Safari zeichnet backdrop-filter unter einer
              blendenden Deckkraft nicht und lässt die Fläche beim Erscheinen flackern. Dort blendet nur
              der Inhalt, der Blur kommt per CSS-Übergang (Daria, 2026-11-08). */}
          <Animated.View
            pointerEvents={who ? 'box-none' : 'none'}
            style={[
              styles.who,
              rewardsTop ? styles.whoBesideRewards : null,
              {
                opacity: isWeb ? 1 : whoAnim,
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
              style={({ pressed }) => [styles.whoBox, isWeb ? (who ? styles.whoBoxWebShown : styles.whoBoxWebHidden) : null, pressed && !isWeb && styles.pressed]}
            >
              {({ pressed }) => (
                <>
                  {/* Abgerundete Fläche nur mit Blur, ohne Farbe (Daria, 2026-11-07) */}
                  {isWeb ? null : <BlurView intensity={30} tint="default" style={StyleSheet.absoluteFill} />}
                  <Animated.View style={[styles.whoRow, isWeb ? { opacity: pressed ? 0.9 : whoAnim } : null]}>
                    <Avatar user={author} diameter={48} />
                    <View style={styles.whoTexts}>
                      <NameWithTestMark test={author.test}>
                        <Text noTranslate style={[styles.whoName, hideName ? hiddenText : null]} numberOfLines={1}>
                          {author.name}
                        </Text>
                      </NameWithTestMark>
                      {/* Zu lang für eine Zeile: Umbruch nur nach einem Punkt, nie mitten in „vor 4 Std.“ (Daria, 2026-11-08) */}
                      <Text style={styles.whoMeta} numberOfLines={2}>
                        {whoMeta}
                      </Text>
                    </View>
                  </Animated.View>
                </>
              )}
            </Pressable>
          </Animated.View>
          {image && placeTop ? (
            // Ort probeweise oben rechts, solange dort keine Belohnung liegt (Daria, 2026-11-07)
            <Animated.View
              pointerEvents="none"
              style={[styles.placeTopRight, { opacity: whoAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
            >
              <Icon name="map-pin" size={14} color={color.text.onPhoto} />
              <Text style={styles.placeOnPhotoText} numberOfLines={1}>
                {placeOnPhoto}
              </Text>
            </Animated.View>
          ) : null}
          {image ? (
            // Erst nur der Ort auf dem Foto, ohne Glasleiste. Nach dem Tippen Glasleiste mit Titel,
            // Name und wann gepostet (Daria, 2026-11-05).
            <View>
              {tagOnPhoto ? (
                // Marke unten links; steht dort schon der Ort, rückt sie darüber. Beim Tippen blendet sie aus wie der Ort.
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.placeOnPhoto,
                    placeTop ? null : styles.tagAbovePlace,
                    { opacity: whoAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
                  ]}
                >
                  <Text noTranslate style={styles.tagOnPhotoText} numberOfLines={1}>
                    {PHOTO_TAG}
                  </Text>
                </Animated.View>
              ) : null}
              {titleAlways ? (
                // Titel bleibt stehen; der Ort darunter blendet beim Tippen aus wie sonst
                <View pointerEvents="none" style={styles.titleBlock}>
                  <Text style={styles.titlePlainOnPhoto} numberOfLines={2}>
                    {challenge.title}
                  </Text>
                  {placeTop || !placeOnPhoto ? null : (
                    <Animated.View
                      style={[styles.placeRow, { opacity: whoAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
                    >
                      <Icon name="map-pin" size={14} color={color.text.onPhoto} />
                      <Text style={styles.placeOnPhotoText} numberOfLines={1}>
                        {placeOnPhoto}
                      </Text>
                    </Animated.View>
                  )}
                </View>
              ) : placeTop ? null : (
                <Animated.View
                  pointerEvents="none"
                  style={[styles.placeOnPhoto, { opacity: whoAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
                >
                  {/* Ortsangabe mit Pin davor (Daria, 2026-11-05) */}
                  {placeOnPhoto ? <Icon name="map-pin" size={14} color={color.text.onPhoto} /> : null}
                  <Text style={styles.placeOnPhotoText} numberOfLines={1}>
                    {placeOnPhoto || challenge.title}
                  </Text>
                </Animated.View>
              )}
              {/* Name und Zeit stehen nach dem Tippen nur noch oben; die Leiste unten bleibt nur für einen Titel (Daria, 2026-11-07) */}
              {challenge.title.trim() && !titleAlways ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.info,
                    styles.infoOnPhoto,
                    {
                      opacity: whoAnim,
                      transform: [{ translateY: whoAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                    },
                  ]}
                >
                  <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
                  <Text style={styles.titleOnPhoto} numberOfLines={2}>
                    {challenge.title}
                  </Text>
                </Animated.View>
              ) : null}
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
          {inCard ? actionsBar : null}
        </Pressable>
      )}
      {inCard ? null : actionsBar}
      {body ? (
        <Pressable onPress={onPress} style={[styles.textBlock, inCard && styles.textBelowCard]}>
          {challenge.type === 'individual' ? (
            // We-Challenge: #vorher und #nachher zusammen höchstens drei Zeilen (Daria, 2026-11-09)
            <BeforeAfterText value={body} style={styles.body} />
          ) : (
            // Bild und Text: Vorschau mit zwei Zeilen
            <Text style={styles.body} numberOfLines={2}>
              <WithMentions value={body} />
            </Text>
          )}
        </Pressable>
      ) : null}
      {challenge.routineLabel ? (
        <View style={[styles.textBlock, inCard && styles.textBelowCard]}>
          <RoutinePill label={challenge.routineLabel} />
        </View>
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
function FashionPost({ challenge, author, distance, onPress, onCommentPress, onLike, onManage, wrapLike = (heart) => heart }: ChallengePostProps) {
  const share = useShareChallenge();
  const isWave = challenge.type === 'wave';
  const completed = COMPLETED.has(challenge.status);
  const closed = challenge.status === 'closed';
  const active = !closed && !completed;
  const image = isWave && completed && challenge.imageAfter ? challenge.imageAfter : challenge.image;
  // Erledigte We-Challenge: Aufgabenfoto als Vorher, Erledigungsfoto als Nachher (Daria, 27.10.2026)
  const after = image ? weChallengeAfter(challenge) : undefined;
  const body = postText(challenge);
  const textPages = isTextPost(challenge) ? challenge.pages : undefined;
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
          {completed ? (
            // Erledigt: Haken und Zahl, schwarz-weiß, ohne Verlauf und Bewegung (Daria, 09.11.2026)
            <>
              {!isWave && challenge.bountyAmount ? (
                <DoneReward value={formatBountyShort(challenge.bountyAmount)} accessibilityLabel={t('Coins: {amount} Euro, erledigt', { amount: challenge.bountyAmount })} />
              ) : null}
              {challenge.edensteine ? (
                <DoneReward value={String(challenge.edensteine)} accessibilityLabel={t('{edensteine} Edensteine, erledigt', { edensteine: challenge.edensteine })} />
              ) : null}
            </>
          ) : closed ? null : (
            <>
              {!isWave && challenge.bountyAmount ? <BountyBadge amount={challenge.bountyAmount} small /> : null}
              {challenge.edensteine ? (
                // Angabe neben dem Namen, kein Knopf: Stein so hoch wie die Schrift, 4 pt bis zur Zahl, ohne Druckfläche
                <View style={fashion.eden} accessible accessibilityLabel={t('{edensteine} Edensteine', { edensteine: challenge.edensteine })}>
                  <LivingCrystal height={30} seed={challenge.id} />
                  <Text style={fashion.edenText}>{challenge.edensteine}</Text>
                </View>
              ) : null}
            </>
          )}
          {onManage ? (
            // Zahnrad wie im Mockup oben rechts am Beitrag
            <IconButton icon="settings" iconSize={size.icon} accessibilityLabel={t('Deine Posts verwalten')} onPress={onManage} />
          ) : null}
        </View>
      </View>
      {/* Ohne Foto keine Fläche: Der Titel steht fett im Text (Daria, 24.10.2026) */}
      {textPages ? (
        <TextCard pages={textPages} title={challenge.title} fontKey={challenge.sheetFont} onPress={onPress} square />
      ) : after ? (
        <BeforeAfterPair before={image} after={after} height={(width * 5) / 4} onLongPress={onPress} onPress={onPress} />
      ) : image ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={t('{title} öffnen', { title: challenge.title.trim() || t('Foto') })}
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
        {wrapLike(
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: !!challenge.likedByMe }}
            accessibilityLabel={challenge.likeCount ? t('Gefällt mir, {likeCount} Likes', { likeCount: challenge.likeCount }) : t('Gefällt mir')}
            onPress={onLike}
            style={({ pressed }) => [styles.countAction, pressed && styles.pressed]}
          >
            <Icon name="heart" size={size.icon} color={challenge.likedByMe ? color.accent.affection : color.text.primary} />
          </Pressable>
        )}
        <LikeCount challengeId={challenge.id} count={challenge.likeCount} style={fashion.count} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={commentCount ? t('Kommentieren, {commentCount} Kommentare', { commentCount }) : t('Kommentieren')}
          onPress={onCommentPress ?? onPress}
          style={({ pressed }) => [styles.countAction, pressed && styles.pressed]}
        >
          <Icon name="comment-filled" size={size.icon} color={color.text.primary} />
          {commentCount > 0 ? <Text style={fashion.count}>{commentCount}</Text> : null}
        </Pressable>
        <IconButton
          icon="send"
          iconSize={size.icon}
          accessibilityLabel={t('Teilen')}
          onPress={() => share(challenge)}
        />
        {/* Status rechts unter dem Bild, als Angabe in Grau (Daria, 24.10.2026) */}
        <Text style={[fashion.state, closed && fashion.stateClosed]} numberOfLines={1}>
          {closed ? 'Geschlossen' : completed ? 'Erledigt' : state.replace(/^noch/, 'Noch')}
        </Text>
      </View>
      <Pressable onPress={onPress} style={fashion.caption}>
        <Text style={fashion.captionText} numberOfLines={after ? 5 : 3}>
          {challenge.title.trim() && !textPages ? <Text style={fashion.captionTitle}>{challenge.title} </Text> : null}
          {body ? <WithMentions value={body} /> : null}
        </Text>
        {/* Beim Bild steht der Zeitstempel schon rechts neben den Knöpfen */}
        {isPhoto ? null : <Text style={fashion.time}>{formatRelative(challenge.createdAt)}</Text>}
        {challenge.routineLabel ? <RoutinePill label={challenge.routineLabel} /> : null}
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
  name: { ...text.bodyStrong, color: color.text.primary },
  place: { ...text.small, color: color.text.primary },
  photo: { width: '100%', aspectRatio: 4 / 5, backgroundColor: color.bg.surface, overflow: 'hidden' },
  noPhotoLine: { height: stroke.ultraThin, backgroundColor: color.line.hairline, marginHorizontal: space[12] },
  state: { flex: 1, textAlign: 'right', paddingRight: space[8], ...text.meta, color: color.text.secondary },
  stateClosed: { color: color.text.primary, fontFamily: font.semiBold },
  actions: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: space[4] },
  count: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20, color: color.text.primary, fontVariant: ['tabular-nums'] },
  caption: { paddingHorizontal: space[12], gap: space[4] },
  captionText: { fontFamily: font.regular, fontSize: 14, lineHeight: 18, color: color.text.primary },
  captionTitle: { fontFamily: font.semiBold },
  time: { ...text.caption, color: color.text.secondary },
  eden: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  edenText: { ...text.bodyStrong, color: color.text.primary, fontVariant: ['tabular-nums'] },
});

/** Blätter eines Posts nur mit Text im Feed: so breit wie die Karte. Tippen öffnet den Post, Wischen blättert. */
function TextCard({
  pages,
  title,
  fontKey,
  onPress,
  square,
}: {
  pages: string[];
  title?: string;
  fontKey?: string;
  onPress: () => void;
  square?: boolean;
}) {
  const [w, setW] = useState(0);
  return (
    <View onLayout={(e) => setW(Math.floor(e.nativeEvent.layout.width))}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('{title} öffnen', { title: title?.trim() || t('Text') })}
        style={({ pressed }) => [square ? null : styles.textCard, pressed && styles.pressed]}
      >
        {w ? <SheetPager pages={pages} title={title} width={w} fontKey={fontKey} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  post: { paddingHorizontal: space[16] },
  // Blätter und Karten mit kleiner Rundung (Daria, 07.11.2026)
  textCard: { borderRadius: radius.post, overflow: 'hidden' },
  card: {
    height: 360,
    borderRadius: radius.post,
    overflow: 'hidden',
    backgroundColor: color.bg.surface,
    // Ohne Rand um die Karte, nur die Rundung bleibt (Daria, 2026-11-07)
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
  edenText: { ...text.metricSm, color: color.accent.confirmation },
  // Erledigt: Pille etwas kleiner
  rewardDone: { paddingVertical: space[2], paddingLeft: space[8], paddingRight: space[8] },
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
    backgroundColor: 'rgba(35, 35, 38, 0.25)',
  },
  // Ohne Foto: im Fluss rechts neben dem Titel statt absolut oben rechts
  plain: { paddingLeft: 0, paddingRight: 0, position: 'relative', top: 0, right: 0 },
  // Tags getönt wie die Status-Tags, auf Fotos mit dunklem Glas darunter, Pille 8/4/6 (Daria, 2026-11-05)
  waveTag: {
    position: 'absolute',
    top: space[12],
    left: space[12],
    paddingTop: space[4],
    paddingBottom: space[6],
    paddingHorizontal: space[8],
    borderRadius: radius.full,
    backgroundColor: 'rgba(35, 35, 38, 0.72)',
  },
  waveText: { ...text.caption, color: color.accent.affection },
  closedTag: {},
  closedText: { ...text.caption, color: color.text.secondary },
  // Verwalten bleibt immer ganz sichtbar links, die Knöpfe stehen rechtsbündig (Daria, 2026-11-09)
  actionsManage: { flexDirection: 'row', alignItems: 'center', gap: space[8], flexShrink: 0, marginRight: space[8] },
  // In der grauen Karte: ohne eigenen Seitenabstand, die Karte hat schon 12 pt
  actionsInCard: { paddingHorizontal: 0 },
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
    backgroundColor: 'rgba(35, 35, 38, 0.3)',
    borderWidth: stroke.ultraThin,
    borderColor: color.line.hairline,
  },
  infoPlain: { paddingHorizontal: space[4] },
  // Ort ohne Glasleiste: liegt unten links, Schatten statt Fläche
  placeOnPhoto: { position: 'absolute', left: space[4], right: space[4], bottom: space[4], flexDirection: 'row', alignItems: 'center', gap: space[4] },
  // #InDiesemMoment auf dem Foto: über dem Ort, wenn der unten links steht
  tagAbovePlace: { bottom: space[4] + 24 },
  // Wie die Marken im Text: Unbounded in Rosa (color/accent/affection), mit weichem Schatten auf dem Foto (Daria, 2026-11-09)
  tagOnPhotoText: {
    flexShrink: 1,
    fontFamily: font.onPhoto,
    fontSize: 15,
    lineHeight: 20,
    color: tagColor(PHOTO_TAG),
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  // Challenge-Titel ohne Fläche unten links, Ort direkt darunter
  titleBlock: { position: 'absolute', left: space[16], right: space[16], bottom: space[16], gap: space[4] },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  titlePlainOnPhoto: {
    fontFamily: font.onPhoto,
    fontSize: 16,
    lineHeight: 21,
    color: color.text.onPhoto,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  // Eigener Stil ohne bottom: mit top und bottom zugleich wurde die Zeile so hoch wie das Foto und
  // der Ort stand mittig rechts statt oben rechts (Daria, 2026-11-07)
  placeTopRight: { position: 'absolute', top: space[16], right: space[16], left: space[16], flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space[4], zIndex: 3 },
  // Ort deutlich leichter (Light statt SemiBold); weicher Schatten ohne Versatz liegt wie ein
  // leichter Blur in Form der Buchstaben hinter dem Text (Daria, 2026-11-07)
  placeOnPhotoText: {
    flexShrink: 1,
    fontFamily: font.onPhotoLight,
    fontSize: 14,
    lineHeight: 20,
    color: color.text.onPhoto,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  who: {
    position: 'absolute',
    top: space[12],
    left: space[12],
    right: space[12],
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  whoBesideRewards: { right: 96 },
  whoTexts: { flexShrink: 1 },
  whoRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  // Abgerundete Fläche wie die Leiste unten, aber nur Blur, keine Farbe
  whoBox: {
    flexShrink: 1,
    paddingVertical: space[8],
    paddingLeft: space[8],
    paddingRight: space[16],
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: stroke.ultraThin,
    borderColor: color.line.hairline,
  },
  whoBoxWebShown: {
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    transitionProperty: 'backdrop-filter, -webkit-backdrop-filter, border-color',
    transitionDuration: '220ms',
  } as object,
  whoBoxWebHidden: {
    backdropFilter: 'blur(0px)',
    WebkitBackdropFilter: 'blur(0px)',
    borderColor: 'transparent',
    transitionProperty: 'backdrop-filter, -webkit-backdrop-filter, border-color',
    transitionDuration: '160ms',
  } as object,
  // Leichter Schatten, damit Name und Zeit auf jedem Foto lesbar bleiben
  // Text über dem Foto in Unbounded (breit, Kontrast zur Inter), etwas kleiner, weil die Schrift breit läuft
  whoName: { fontFamily: font.onPhoto, fontSize: 15, lineHeight: 20, color: color.text.primary, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  whoMeta: { fontFamily: font.onPhotoLight, fontSize: 11, lineHeight: 16, color: color.text.primary, opacity: 0.85, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  title: { ...text.cardTitle, color: color.text.primary },
  titleOnPhoto: { fontFamily: font.onPhoto, fontSize: 16, lineHeight: 21, color: color.text.primary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  meta: { ...text.meta, color: color.text.secondary, flex: 1 },
  textPostName: { ...text.meta, color: color.text.primary, flexShrink: 0, maxWidth: '60%' },
  textPostMeta: { ...text.meta, color: color.text.secondary, flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: space[4] },
  actionsButtons: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
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
  // Unter der grauen Karte mit den Knöpfen: Abstand wie sonst unter der Knopfzeile
  textBelowCard: { paddingTop: space[12] },
  body: { ...text.body, color: color.text.secondary },
});
