import { useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { scrollIntoView } from './Nudge';
import { Text } from './T';

import { formatRelative } from '../data/format';
import type { Comment as CommentData, User } from '../data/types';
import { color, font, radius, size, space, text } from '../theme/tokens';
import { Avatar, hiddenText, useHideName } from './AuthorRow';
import { IconButton } from './IconButton';
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
};

/** Figma „Comment“: öffentlicher Kommentar. Die Fahne meldet den Kommentar. */
export function Comment({ comment, author, onReport, onReply, isReply, onAuthorPress }: CommentProps) {
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
        {onReply ? (
          <Pressable
            onPress={onReply}
            accessibilityRole="button"
            accessibilityLabel={t('{name} antworten', { name: author.name })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.replyButton}
          >
            <Text style={styles.replyText}>Antworten</Text>
          </Pressable>
        ) : null}
      </View>
      {onReport ? (
        <IconButton icon="flag" accessibilityLabel={t('Kommentar von {name} melden', { name: author.name })} onPress={onReport} />
      ) : null}
    </View>
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
        <Text style={styles.time}>{audience ?? 'Öffentlich. Alle in der Nachbarschaft können mitlesen.'}</Text>
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
  replyButton: { alignSelf: 'flex-start', paddingTop: space[4] },
  replyText: { ...text.caption, fontFamily: font.medium, color: color.text.secondary },
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
