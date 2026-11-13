import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './T';

import { color, space, text } from '../theme/tokens';
import { KaterRund } from './Content';
import { type CatMood } from './icons/Brand';

/**
 * Kater mit Überschrift und Text, mittig (Daria, 2026-11-09). Eine Komponente für den leeren Feed
 * („Cat The Käptn wartet“) und die Abschluss-Screens („Nice, 1 Challenge gepostet!“), nur die Argumente wechseln.
 *
 * Abstände nach Zusammenhang: Die Überschrift gehört zum Bild des Katers (8). Text und Knopf bilden je eine
 * Gruppe (16), zwischen den Gruppen stehen 32. Seitlich 48 pt, da diese Screens wenig Inhalt haben.
 */
export function KaterMessage({
  title,
  body,
  detail,
  badge,
  mood = 'default',
  action,
  more,
  style,
}: {
  title: string;
  body?: string;
  /** Technischer Grund, klein unter dem Text (nur bei Fehlern) */
  detail?: string;
  /** Status unter dem Kater, z. B. „Bezahlt“ */
  badge?: ReactNode;
  /** Nur im Fashionable Look; im Kiez-Look steht immer der Kater im Kreis */
  mood?: CatMood;
  /** Knopf zum Text, 16 darunter */
  action?: ReactNode;
  /** Zweite Gruppe, 32 darunter (z. B. Satz und Knopf „Einladen“) */
  more?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.container, style]}>
      {/* Kiez-Look: Kater im Kreis wie in den Nachrichten, fährt von unten herein (Daria, 2026-11-09) */}
      {<KaterRund size={120} />}
      {badge ? <View style={styles.afterCat}>{badge}</View> : null}
      <Text style={[styles.title, styles.afterCat]} accessibilityRole="header">
        {title}
      </Text>
      {body ? <Text style={[styles.body, styles.nextGroup]}>{body}</Text> : null}
      {detail ? (
        <Text style={[styles.detail, styles.afterTitle]} selectable>
          ({detail})
        </Text>
      ) : null}
      {action ? <View style={[styles.stretch, body ? styles.afterText : styles.nextGroup]}>{action}</View> : null}
      {more ? <View style={[styles.stretch, styles.nextGroup]}>{more}</View> : null}
    </View>
  );
}

/** Abstand zwischen Text und Knopf in einer Gruppe, für Inhalte in `more` */
export const KATER_MESSAGE_GAP = space[16];

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: space[48] },
  stretch: { alignSelf: 'stretch', alignItems: 'center' },
  afterCat: { marginTop: space[8] },
  afterTitle: { marginTop: space[8] },
  afterText: { marginTop: space[16] },
  nextGroup: { marginTop: space[32] },
  // Überschrift in der Unbounded wie die Ansprache „Pirat:in“ (Daria, 09.11.2026)
  title: { ...text.displaySm, color: color.text.primary, textAlign: 'center' },
  body: { ...text.body, color: color.text.secondary, textAlign: 'center' },
  detail: { ...text.caption, color: color.text.secondary, textAlign: 'center' },
});
