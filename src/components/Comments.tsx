import { useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { scrollIntoView } from './Nudge';
import { Text } from './T';

import { formatRelative } from '../data/format';
import type { Comment as CommentData, User } from '../data/types';
import { color, font, radius, scheme, size, space, stroke, text } from '../theme/tokens';
import { Avatar, hiddenText, useHideName } from './AuthorRow';
import { IconButton } from './IconButton';
import { Icon } from './icons/Icon';
import { t } from '../data/texts';

type CommentProps = {
  comment: CommentData;
  author: User;
  onReport?: () => void;
  /** „Antworten“ unter dem Kommentar */
  onReply?: () => void;
  /** Antwort: eingerückt, kleineres Profilbild */
  isReply?: boolean;
  /** Tippen auf Bild oder Name öffnet das Profil */
  onAuthorPress?: () => void;
  /** Herz unter dem Kommentar; fehlt, solange die Likes nicht geladen sind */
  onLike?: () => void;
};

/**
 * Figma „Comment“: öffentlicher Kommentar. Melden steckt hinter drei senkrechten Punkten,
 * darunter Herz mit Anzahl und „Antworten“ (Daria, 2026-11-09).
 */
export function Comment({ comment, author, onReport, onReply, isReply, onAuthorPress, onLike }: CommentProps) {
  const hidden = useHideName(author);
  return (
    <View style={[styles.comment, isReply && styles.reply]}>
      <Pressable onPress={onAuthorPress} disabled={!onAuthorPress} accessibilityLabel={t('Profil von {name}', { name: author.name })}>
        <Avatar user={author} diameter={isReply ? 28 : undefined} />
      </Pressable>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text noTranslate style={[styles.name, hidden && hiddenText]} onPress={onAuthorPress}>
            {author.name}
          </Text>
          <Text style={styles.time}>{formatRelative(comment.createdAt)}</Text>
        </View>
        <Text style={styles.text}>{comment.body}</Text>
        {onLike || onReply ? (
          <View style={styles.footer}>
            {onLike ? (
              <Pressable
                onPress={onLike}
                accessibilityRole="button"
                accessibilityState={{ selected: !!comment.likedByMe }}
                accessibilityLabel={
                  comment.likeCount ? t('Gefällt mir, {likeCount} Likes', { likeCount: comment.likeCount }) : t('Gefällt mir')
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [styles.like, pressed && styles.pressed]}
              >
                <Icon name="heart" size={11} color={comment.likedByMe ? color.accent.affection : color.text.secondary} />
                {comment.likeCount ? <Text style={styles.replyText}>{comment.likeCount}</Text> : null}
              </Pressable>
            ) : null}
            {onReply ? (
              <Pressable
                onPress={onReply}
                accessibilityRole="button"
                accessibilityLabel={t('{name} antworten', { name: author.name })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.replyText}>Antworten</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      {onReport ? <CommentMenu authorName={author.name} onReport={onReport} /> : null}
    </View>
  );
}

/** Drei senkrechte Punkte mit Menü darunter, wie „Weitere Aktionen“ an der Challenge */
function CommentMenu({ authorName, onReport }: { authorName: string; onReport: () => void }) {
  const button = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const { width } = useWindowDimensions();
  const close = () => setAnchor(null);
  return (
    <>
      <View ref={button} collapsable={false}>
        <IconButton
          icon="more-vertical"
          iconSize={14}
          iconColor={color.text.secondary}
          accessibilityLabel={t('Weitere Aktionen zum Kommentar von {name}', { name: authorName })}
          onPress={() => button.current?.measureInWindow((x, y, w, h) => setAnchor({ x, y, w, h }))}
        />
      </View>
      <Modal visible={!!anchor} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('Menü schließen')} />
        {anchor ? (
          <View style={[styles.menu, { top: anchor.y + anchor.h, right: Math.max(space[8], width - anchor.x - anchor.w) }]} accessibilityRole="menu">
            <BlurView intensity={40} tint={scheme} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={[StyleSheet.absoluteFill, styles.menuTint]} pointerEvents="none" />
            <Pressable
              accessibilityRole="menuitem"
              onPress={() => {
                close();
                onReport();
              }}
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
            >
              <Text style={[styles.menuText, styles.error]}>Melden</Text>
            </Pressable>
          </View>
        ) : null}
      </Modal>
    </>
  );
}

type CommentComposerProps = {
  placeholder: string;
  onSend: (body: string) => void;
  /** Name der Person, der geantwortet wird; ✕ hebt die Antwort auf */
  replyTo?: string;
  onCancelReply?: () => void;
};

/** Figma „CommentComposer“: Eingabe für einen neuen Kommentar oder eine Antwort. */
export function CommentComposer({ placeholder, onSend, replyTo, onCancelReply }: CommentComposerProps) {
  const [value, setValue] = useState('');
  const send = () => {
    const body = value.trim();
    if (!body) return;
    onSend(body);
    setValue('');
  };
  // Beim Tippen ins Feld: sobald die Tastatur steht, das Feld ins Bild scrollen (Daria, 22.10.2026)
  const boxRef = useRef<View>(null);
  const reveal = () => {
    const go = () => setTimeout(() => scrollIntoView(boxRef.current), 50);
    if (Platform.OS === 'web') return go();
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      sub.remove();
      go();
    });
    setTimeout(() => sub.remove(), 1500);
  };
  return (
    <View style={styles.composerBlock} ref={boxRef}>
      {replyTo ? (
        <View style={styles.replyBar}>
          <Text style={styles.replyBarText} numberOfLines={1}>{t('Antwort an {replyTo}', { replyTo })}</Text>
          <IconButton icon="close" iconSize={14} accessibilityLabel={t('Antwort aufheben')} onPress={onCancelReply} />
        </View>
      ) : null}
    <View style={styles.composer}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={color.text.secondary}
        value={value}
        onChangeText={setValue}
        onFocus={reveal}
        multiline
        maxLength={500}
        accessibilityLabel={t('Kommentar schreiben')}
      />
      <IconButton icon="send" accessibilityLabel={t('Kommentar senden')} onPress={send} iconSize={size.icon} />
    </View>
    </View>
  );
}

type CommentSectionProps = {
  comments: CommentData[];
  users: User[];
  composerPlaceholder: string;
  /** Eigene Kommentare bekommen keinen Melden-Button */
  currentUserId: string;
  /** Ohne onSend kein Eingabefeld, z. B. bei geschlossenen Challenges. replyToId: Antwort auf diesen Kommentar */
  onSend?: (body: string, replyToId?: string) => void;
  /** Hinweis statt Eingabefeld */
  closedHint?: string;
  /** Wer mitlesen kann, z. B. bei Gruppenaufgaben nur die Gruppe */
  audience?: string;
  onReport: (comment: CommentData) => void;
  /** Profil der Person öffnen */
  onAuthorPress?: (userId: string) => void;
  /** Kommentar liken (Daria, 2026-11-09) */
  onLike?: (comment: CommentData) => void;
};

/** Figma „CommentSection“: Fragen zur Challenge, öffentlich. Es gibt keinen privaten Chat. */
export function CommentSection({
  comments,
  users,
  composerPlaceholder,
  currentUserId,
  onSend,
  closedHint,
  audience,
  onReport,
  onAuthorPress,
  onLike,
}: CommentSectionProps) {
  const [replyTo, setReplyTo] = useState<CommentData | null>(null);
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? '';
  // Eine Ebene: Kommentare ohne gültigen Ausgangskommentar stehen oben, Antworten darunter eingerückt.
  const ids = new Set(comments.map((c) => c.id));
  const roots = comments.filter((c) => !c.replyToId || !ids.has(c.replyToId));
  const repliesOf = (id: string) => comments.filter((c) => c.replyToId === id);

  const renderComment = (c: CommentData, isReply: boolean, rootId: string) => {
    const author = users.find((u) => u.id === c.authorId);
    if (!author) return null;
    return (
      <Comment
        key={c.id}
        comment={c}
        author={author}
        isReply={isReply}
        onAuthorPress={onAuthorPress ? () => onAuthorPress(c.authorId) : undefined}
        onReport={c.authorId === currentUserId ? undefined : () => onReport(c)}
        onLike={onLike && c.likeCount !== undefined ? () => onLike(c) : undefined}
        // Antworten auf eine Antwort hängen am selben Gespräch
        onReply={onSend ? () => setReplyTo({ ...c, id: rootId }) : undefined}
      />
    );
  };

  return (
    <View style={styles.section}>
      {/* Überschrift und Hinweis eng zusammen, danach mehr Luft bis zum ersten Kommentar (Daria, 22.10.2026) */}
      <View style={styles.intro}>
        <Text style={styles.title} accessibilityRole="header">
          Fragen und Kommentare
        </Text>
        {audience ? <Text style={styles.time}>{audience}</Text> : null}
      </View>
      {roots.map((root) => (
        <View key={root.id} style={styles.thread}>
          {renderComment(root, false, root.id)}
          {repliesOf(root.id).map((r) => renderComment(r, true, root.id))}
        </View>
      ))}
      {onSend ? (
        <CommentComposer
          placeholder={replyTo ? t('{authorId} antworten …', { authorId: nameOf(replyTo.authorId) }) : composerPlaceholder}
          replyTo={replyTo ? nameOf(replyTo.authorId) : undefined}
          onCancelReply={() => setReplyTo(null)}
          onSend={(body) => {
            onSend(body, replyTo?.id);
            setReplyTo(null);
          }}
        />
      ) : closedHint ? (
        <Text style={styles.time}>{closedHint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[12] },
  title: { ...text.title, color: color.text.primary },
  intro: { gap: space[2], marginBottom: space[12] },
  thread: { gap: space[8] },
  comment: { flexDirection: 'row', gap: space[12], alignItems: 'flex-start' },
  reply: { marginLeft: 48, gap: space[8] },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space[16], paddingTop: space[4] },
  like: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  pressed: { opacity: 0.6 },
  replyText: { ...text.caption, fontFamily: font.medium, color: color.text.secondary },
  menu: {
    position: 'absolute',
    minWidth: 200,
    borderRadius: radius.lg,
    borderWidth: stroke.ultraThin,
    borderColor: color.line.hairline,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  menuTint: { backgroundColor: color.bg.menu },
  menuItem: { position: 'relative', minHeight: size.touchTarget, justifyContent: 'center', paddingHorizontal: space[16] },
  menuText: { fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: color.text.primary },
  error: { color: color.accent.error },
  composerBlock: { gap: space[6] },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space[16],
    borderRadius: radius.full,
    backgroundColor: color.bg.surface,
  },
  replyBarText: { ...text.caption, color: color.accent.primary, flex: 1 },
  body: { flex: 1, gap: space[2] },
  header: { flexDirection: 'row', gap: space[8], alignItems: 'center' },
  name: { fontFamily: font.semiBold, fontSize: 11, lineHeight: 16, color: color.text.primary },
  time: { ...text.caption, color: color.text.secondary },
  text: { ...text.body, color: color.text.primary },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    paddingVertical: space[4],
    paddingRight: space[4],
    paddingLeft: space[16],
    borderRadius: radius.full,
    backgroundColor: color.bg.surface,
  },
  input: { ...text.body, flex: 1, color: color.text.primary, paddingVertical: space[8], maxHeight: 120 },
});
