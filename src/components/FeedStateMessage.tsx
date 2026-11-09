import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './T';

import type { FeedState } from '../data/types';
import { color, font, isFashionable, space, text } from '../theme/tokens';
import { Button } from './Button';
import { KaterRund } from './Content';
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
    <View style={[styles.container, style]}>
      {/* Kiez-Look: Kater im Kreis wie in den Nachrichten, fährt von unten herein; gleiches Bild wie die Abschluss-Screens (Daria, 2026-11-09) */}
      {isFashionable ? <Cat height={86} /> : <KaterRund size={120} herzen={false} />}
      {/* Abstände nach Zusammenhang (Daria, 09.11.2026): Die Überschrift gehört zum Bild der Katze (8). Text und
          Knopf bilden je eine Gruppe (16), zwischen den Gruppen stehen 32. */}
      <Text style={[styles.title, styles.afterCat]}>{m.title}</Text>
      <Text style={[styles.body, styles.nextGroup]}>{body ?? m.body}</Text>
      {detail ? (
        <Text style={[styles.detail, styles.afterTitle]} selectable>
          ({detail})
        </Text>
      ) : null}
      {/* Beide Knöpfe gleich breit (Daria, 08.11.2026) */}
      <Button label={action ?? m.action} onPress={onAction} style={[styles.button, styles.afterText]} />
      {secondary?.hint ? <Text style={[styles.body, styles.nextGroup]}>{secondary.hint}</Text> : null}
      {secondary ? (
        <Button
          label={secondary.label}
          variant="secondary"
          onPress={secondary.onPress}
          style={[styles.button, secondary.hint ? styles.afterText : styles.nextGroup]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: space[48], paddingHorizontal: space[32] },
  afterCat: { marginTop: space[8] },
  afterTitle: { marginTop: space[8] },
  afterText: { marginTop: space[16] },
  nextGroup: { marginTop: space[32] },
  // Überschrift in der Unbounded wie die Ansprache „Pirat:in“ (Daria, 09.11.2026)
  title: { ...text.title, fontFamily: font.onPhoto, color: color.text.primary, textAlign: 'center' },
  body: { ...text.body, color: color.text.secondary, textAlign: 'center' },
  detail: { ...text.caption, color: color.text.secondary, textAlign: 'center' },
  button: { minWidth: 220 },
});
