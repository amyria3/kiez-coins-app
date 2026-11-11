import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AskedQuestion, CHAT_GAP_CHANGE, CHAT_GAP_SAME, ChatReply, Notice } from './Content';
import { space } from '../theme/tokens';

/**
 * Anleitung im Chat, nach den Regeln vom Weiterposten (Daria, 2026-11-09): Die erste Nachricht nennt die Anzahl der
 * Schritte und die Voraussetzungen, dann „Ja, los!“. Danach jeder Schritt als eigene Nachricht, jeweils mit
 * „Verstanden, weiter“. `children` erscheint nach dem letzten Schritt, z. B. Felder oder ein Knopf.
 * Davor steht die Frage der Person, denn jede Erklärung beginnt mit einer Frage (Daria, 2026-11-11).
 */
export function SetupSteps({
  question,
  intro,
  steps,
  children,
}: {
  question: string;
  intro: string;
  steps: string[];
  children?: ReactNode;
}) {
  // Wie viele Schritte schon zu sehen sind; 0: noch nicht losgelegt
  const [shown, setShown] = useState(0);
  const started = shown > 0;
  // Erst nach dem Tipp auf die Frage geht es weiter (Daria, 2026-11-11)
  const [asked, setAsked] = useState(false);
  return (
    <View style={styles.setup}>
      <AskedQuestion question={question} asked={asked} onAsk={() => setAsked(true)} />
      {asked ? (
        <>
          <View style={styles.answer}>
            <Notice message={intro} />
          </View>
          <View style={styles.reply}>
            <ChatReply label="Ja, los!" sent={started} onPress={() => setShown(1)} />
          </View>
        </>
      ) : null}
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
  // Wechsel von der Frage zur Antwort der App wie im Chat
  answer: { marginTop: CHAT_GAP_CHANGE - space[12] },
  steps: { gap: CHAT_GAP_SAME },
  // Wechsel zwischen App und eigener Antwort wie im Chat
  reply: { marginTop: CHAT_GAP_CHANGE - space[12] },
  afterReply: { marginTop: CHAT_GAP_CHANGE - space[12] },
  replyInGroup: { marginTop: CHAT_GAP_CHANGE },
});
