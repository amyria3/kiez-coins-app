import { StyleSheet, View } from 'react-native';
import { Text } from './T';

import type { FeedState } from '../data/types';
import { color, space, text } from '../theme/tokens';
import { Button } from './Button';
import { Cat } from './icons/Brand';

const messages: Record<Exclude<FeedState, 'filled' | 'loading'>, { title: string; body: string; action: string }> = {
  // Leere Reiter einheitlich (Daria, 29.10.2026): Privat, Gruppe, Kiez und Überall
  empty: {
    title: 'Cat The Käptn wartet',
    body: 'Poste als Erste:r',
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

/**
 * Figma „FeedStateMessage“ (Empty, Error, Offline). Leer sehen alle vier Reiter gleich aus (Daria, 29.10.2026):
 * Privat, Gruppe und Kiez/Überall ändern nur Text und Knöpfe.
 */
export function FeedStateMessage({
  variant,
  onAction,
  body,
  action,
  secondary,
}: {
  variant: Exclude<FeedState, 'filled' | 'loading'>;
  onAction: () => void;
  body?: string;
  action?: string;
  /** Zweiter Knopf darunter, z. B. „Mit Beitrittscode beitreten“ */
  secondary?: { label: string; onPress: () => void };
}) {
  const m = messages[variant];
  return (
    <View style={styles.container}>
      <Cat height={86} />
      <Text style={styles.title}>{m.title}</Text>
      <Text style={styles.body}>{body ?? m.body}</Text>
      <View style={styles.actions}>
        <Button label={action ?? m.action} onPress={onAction} />
        {secondary ? <Button label={secondary.label} variant="secondary" onPress={secondary.onPress} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: space[12], paddingTop: space[48], paddingHorizontal: space[32] },
  title: { ...text.title, color: color.text.primary, textAlign: 'center' },
  body: { ...text.body, color: color.text.secondary, textAlign: 'center' },
  actions: { alignSelf: 'stretch', alignItems: 'center', gap: space[8] },
});
