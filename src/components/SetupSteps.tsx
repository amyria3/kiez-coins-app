import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { CHAT_GAP_CHANGE, CHAT_GAP_SAME, ChatReply, Notice } from './Content';
import { space } from '../theme/tokens';

/**
 * Anleitung im Chat, nach den Regeln vom Weiterposten (Daria, 2026-11-09): Die erste Nachricht nennt die Anzahl der
 * Schritte und die Voraussetzungen, dann „Ja, los!“. Danach jeder Schritt als eigene Nachricht, jeweils mit
 * „Verstanden, weiter“. `children` erscheint nach dem letzten Schritt, z. B. Felder oder ein Knopf.
 */
export function SetupSteps({ intro, steps, children }: { intro: string; steps: string[]; children?: ReactNode }) {
  // Wie viele Schritte schon zu sehen sind; 0: noch nicht losgelegt
  const [shown, setShown] = useState(0);
  const started = shown > 0;
  return (
    <View style={styles.setup}>
      <Notice message={intro} />
      <View style={styles.reply}>
        <ChatReply label="Ja, los!" sent={started} onPress={() => setShown(1)} />
      </View>
      {steps.slice(0, shown).map((step, i) => (
        <View key={step} style={styles.afterReply}>
          <View style={styles.steps}>
            <Notice message={step} />
          </View>
          {i < steps.length - 1 ? (
            <View style={styles.replyInGroup}>
              <ChatReply label="Verstanden, weiter" sent={i < shown - 1} onPress={() => setShown(i + 2)} />
            </View>
          ) : null}
        </View>
      ))}
      {started && shown >= steps.length ? children : null}
    </View>
  );
}

const styles = StyleSheet.create({
  setup: { gap: space[12] },
  steps: { gap: CHAT_GAP_SAME },
  // Wechsel zwischen App und eigener Antwort wie im Chat
  reply: { marginTop: CHAT_GAP_CHANGE - space[12] },
  afterReply: { marginTop: CHAT_GAP_CHANGE - space[12] },
  replyInGroup: { marginTop: CHAT_GAP_CHANGE },
});
