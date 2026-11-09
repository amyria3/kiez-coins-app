import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './T';

import type { FeedState } from '../data/types';
import { color, space, text } from '../theme/tokens';
import { Button } from './Button';
import { KATER_MESSAGE_GAP, KaterMessage } from './KaterMessage';

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
  detail,
  style,
}: {
  variant: Exclude<FeedState, 'filled' | 'loading'>;
  onAction: () => void;
  body?: string;
  action?: string;
  /** Zweiter Knopf darunter, z. B. „Mit Passcode beitreten“; `hint` steht als Satz über ihm */
  secondary?: { label: string; onPress: () => void; hint?: string };
  /** Technischer Grund, klein unter dem Text (nur bei Fehlern) */
  detail?: string;
  /** Z. B. ohne Abstand oben, wenn der Feed den leeren Zustand mittig setzt */
  style?: StyleProp<ViewStyle>;
}) {
  const m = messages[variant];
  return (
    <KaterMessage
      style={[styles.top, style]}
      title={m.title}
      body={body ?? m.body}
      detail={detail}
      // Beide Knöpfe gleich breit (Daria, 08.11.2026)
      action={<Button label={action ?? m.action} onPress={onAction} style={styles.button} />}
      more={
        secondary ? (
          <>
            {secondary.hint ? <Text style={styles.hint}>{secondary.hint}</Text> : null}
            <Button
              label={secondary.label}
              variant="secondary"
              onPress={secondary.onPress}
              style={[styles.button, secondary.hint ? { marginTop: KATER_MESSAGE_GAP } : null]}
            />
          </>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  // Allein (z. B. in „Was Du so machst“) mit Luft oben; im Feed setzt die Liste den Zustand mittig
  top: { paddingTop: space[48] },
  hint: { ...text.body, color: color.text.secondary, textAlign: 'center' },
  button: { minWidth: 220 },
});
