import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { formatRelative } from '../data/format';
import type { Comment as CommentData, User } from '../data/types';
import { color, font, radius, space, text } from '../theme/tokens';
import { Avatar } from './AuthorRow';
import { IconButton } from './IconButton';

/** Figma „Comment“: öffentlicher Kommentar. Die Fahne meldet den Kommentar. */
export function Comment({ comment, author, onReport }: { comment: CommentData; author: User; onReport?: () => void }) {
  return (
    <View style={styles.comment}>
      <Avatar user={author} />
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.name}>{author.name}</Text>
          <Text style={styles.time}>{formatRelative(comment.createdAt)}</Text>
        </View>
        <Text style={styles.text}>{comment.body}</Text>
      </View>
      {onReport ? (
        <IconButton icon="flag" accessibilityLabel={`Kommentar von ${author.name} melden`} onPress={onReport} />
      ) : null}
    </View>
  );
}

/** Figma „CommentComposer“: Eingabe für einen neuen Kommentar. */
export function CommentComposer({ placeholder, onSend }: { placeholder: string; onSend: (body: string) => void }) {
  const [value, setValue] = useState('');
  const send = () => {
    const body = value.trim();
    if (!body) return;
    onSend(body);
    setValue('');
  };
  return (
    <View style={styles.composer}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={color.text.secondary}
        value={value}
        onChangeText={setValue}
        multiline
        maxLength={500}
        accessibilityLabel="Kommentar schreiben"
      />
      <IconButton icon="send" accessibilityLabel="Kommentar senden" onPress={send} iconSize={24} />
    </View>
  );
}

type CommentSectionProps = {
  comments: CommentData[];
  users: User[];
  composerPlaceholder: string;
  /** Eigene Kommentare bekommen keinen Melden-Button */
  currentUserId: string;
  /** Ohne onSend kein Eingabefeld, z. B. bei geschlossenen Challenges */
  onSend?: (body: string) => void;
  /** Hinweis statt Eingabefeld */
  closedHint?: string;
  onReport: (comment: CommentData) => void;
};

/** Figma „CommentSection“: Fragen zur Challenge, öffentlich. Es gibt keinen privaten Chat. */
export function CommentSection({
  comments,
  users,
  composerPlaceholder,
  currentUserId,
  onSend,
  closedHint,
  onReport,
}: CommentSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title} accessibilityRole="header">
        Fragen und Kommentare
      </Text>
      <Text style={styles.time}>Öffentlich, alle in der Nachbarschaft können mitlesen.</Text>
      {comments.map((c) => {
        const author = users.find((u) => u.id === c.authorId);
        return author ? (
          <Comment
            key={c.id}
            comment={c}
            author={author}
            onReport={c.authorId === currentUserId ? undefined : () => onReport(c)}
          />
        ) : null;
      })}
      {onSend ? (
        <CommentComposer placeholder={composerPlaceholder} onSend={onSend} />
      ) : closedHint ? (
        <Text style={styles.time}>{closedHint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[12] },
  title: { ...text.title, color: color.text.primary },
  comment: { flexDirection: 'row', gap: space[12], alignItems: 'flex-start' },
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
