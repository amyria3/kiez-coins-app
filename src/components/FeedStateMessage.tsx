import { StyleSheet, View } from 'react-native';
import { Text } from './T';

import type { FeedState } from '../data/types';
import { color, space, text } from '../theme/tokens';
import { Button } from './Button';
import { Cat } from './icons/Brand';

const messages: Record<Exclude<FeedState, 'filled' | 'loading'>, { title: string; body: string; action: string }> = {
  empty: {
    title: 'Noch keine Challenges in Deiner Nähe',
    body: 'Starte die erste Challenge für Deinen Kiez. Cat The Käptn kann’s nicht erwarten.',
    action: 'Posten',
  },
  error: {
    title: 'Das hat nicht geklappt',
    body: 'Die Challenges konnten nicht geladen werden. Versuche es gleich noch einmal.',
    action: 'Erneut versuchen',
  },
  offline: {
    title: 'Du bist offline',
    body: 'Wird neu geladen, sobald Du wieder Netz hast.',
    action: 'Erneut versuchen',
  },
};

/** Figma „FeedStateMessage“ (Empty, Error, Offline) */
export function FeedStateMessage({ variant, onAction }: { variant: Exclude<FeedState, 'filled' | 'loading'>; onAction: () => void }) {
  const m = messages[variant];
  return (
    <View style={styles.container}>
      <Cat height={86} />
      <Text style={styles.title}>{m.title}</Text>
      <Text style={styles.body}>{m.body}</Text>
      <Button label={m.action} onPress={onAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: space[12], paddingTop: space[48], paddingHorizontal: space[32] },
  title: { ...text.title, color: color.text.primary, textAlign: 'center' },
  body: { ...text.body, color: color.text.secondary, textAlign: 'center' },
});
