import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './T';

import { useTexts } from '../data/texts';
import { color, isFashionable, space, text } from '../theme/tokens';
import { KaterCard, KaterRund } from './Content';
import { IconButton } from './IconButton';

/**
 * Kater schreibt wie im Chat (Entwurf, Daria, 2026-11-11): Sprechblase wie die Erklärungsbubbles, Kater im Kreis
 * links unten bündig, die spitze Ecke unten links zeigt auf ihn. Nicht grün wie die Systemblasen, sondern lila hell
 * in der Farbe des Katers. Ein Tipp auf die Blase führt weiter (`onPress`), das Kreuz schließt sie (`onClose`).
 */
const KATER_BLASE = 'rgba(143, 144, 250, 0.22)';
const KATER_KREUZ = '#C9C9FF';
const KATER_AVATAR = 36;
/** Rundung wie die Chatblasen im Kiez-Look (CHAT_RADIUS) */
const BLASE_RADIUS = 26;

export function KaterNachricht({
  children,
  onPress,
  onClose,
  accessibilityHint,
}: {
  children: string;
  onPress?: () => void;
  onClose?: () => void;
  accessibilityHint?: string;
}) {
  const tx = useTexts();
  // Fashionable Look bleibt bei der Karte mit Kater daneben
  if (isFashionable)
    return (
      <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityHint={accessibilityHint} onPress={onPress}>
        <KaterCard>{children}</KaterCard>
      </Pressable>
    );
  return (
    <View style={styles.row}>
      <KaterRund size={KATER_AVATAR} />
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        style={styles.bubble}
      >
        <Text style={styles.text}>{tx(children)}</Text>
        {onClose ? (
          <IconButton
            icon="close"
            iconSize={14}
            iconColor={KATER_KREUZ}
            accessibilityLabel={tx('Hinweis schließen')}
            onPress={onClose}
            style={styles.close}
          />
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space[8] },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: '88%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BLASE_RADIUS,
    borderBottomLeftRadius: space[4],
    backgroundColor: KATER_BLASE,
  },
  text: { ...text.body, color: color.text.primary, flexShrink: 1 },
  // Kreuz ragt in den Innenabstand, damit die Blase nicht höher wird als der Text
  close: { marginVertical: -10, marginRight: -10, marginLeft: space[4] },
});
