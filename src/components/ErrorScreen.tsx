import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildErrorReport, mailErrorReport, sendErrorReport } from '../lib/errorReport';
import { color, font, radius, space, text } from '../theme/tokens';
import { look, setLook } from '../theme/look';

type Props = { error: unknown; retry: () => void | Promise<void> };

type SendState = 'idle' | 'sending' | 'sent' | 'failed';

/**
 * Fehler-Screen mit Fehlerbericht (Daria, 2026-10-25). Expo Router zeigt ihn über `ErrorBoundary`
 * in src/app/_layout.tsx, wenn ein Screen beim Rendern abstürzt.
 *
 * Der Screen nutzt nur React-Native-Bausteine und Tokens, keine App-Komponenten und keinen Store,
 * da der Fehler auch aus diesen kommen kann. So bleibt er selbst dann stehen.
 */
export function ErrorScreen(props: Props) {
  // Eigener Provider, da die ErrorBoundary über dem SafeAreaProvider des Layouts liegt
  return (
    <SafeAreaProvider>
      <ErrorContent {...props} />
    </SafeAreaProvider>
  );
}

function ErrorContent({ error, retry }: Props) {
  const insets = useSafeAreaInsets();
  const [comment, setComment] = useState('');
  const [state, setState] = useState<SendState>('idle');
  const [details, setDetails] = useState(false);
  const report = () => buildErrorReport(error, comment);

  const send = async () => {
    setState('sending');
    try {
      await sendErrorReport(report());
      setState('sent');
    } catch {
      setState('failed');
    }
  };

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space[48], paddingBottom: insets.bottom + space[32] }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title} accessibilityRole="header">
        Hier ist etwas schiefgelaufen.
      </Text>
      <Text style={styles.body}>Schicke uns den Fehlerbericht. So finden wir den Fehler schneller.</Text>

      {state === 'sent' ? (
        <Text style={[styles.body, styles.confirmation]}>Danke! Der Fehlerbericht ist bei uns angekommen.</Text>
      ) : (
        <>
          <TextInput
            style={styles.field}
            value={comment}
            onChangeText={setComment}
            placeholder="Was hast Du gerade gemacht? (freiwillig)"
            placeholderTextColor={color.text.secondary}
            multiline
            maxLength={1000}
            editable={state !== 'sending'}
          />
          <Pressable
            style={[styles.button, styles.primary, state === 'sending' && styles.busy]}
            onPress={send}
            disabled={state === 'sending'}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>{state === 'sending' ? 'Wird gesendet …' : 'Fehlerbericht senden'}</Text>
          </Pressable>
          {state === 'failed' ? (
            <>
              <Text style={[styles.body, styles.error]}>Der Bericht ist nicht angekommen. Schicke ihn per E-Mail.</Text>
              <Pressable style={[styles.button, styles.secondary]} onPress={() => mailErrorReport(report())} accessibilityRole="button">
                <Text style={styles.secondaryText}>Per E-Mail senden</Text>
              </Pressable>
            </>
          ) : null}
        </>
      )}

      <Pressable style={[styles.button, styles.secondary]} onPress={() => retry()} accessibilityRole="button">
        <Text style={styles.secondaryText}>Nochmal versuchen</Text>
      </Pressable>
      {look !== 'kiez' ? (
        <Pressable style={styles.link} onPress={() => setLook('kiez')} accessibilityRole="button">
          <Text style={styles.linkText}>Zurück zum Kiez-Look</Text>
        </Pressable>
      ) : null}

      <Pressable style={styles.link} onPress={() => setDetails(!details)} accessibilityRole="button">
        <Text style={styles.linkText}>{details ? 'Details ausblenden' : 'Details anzeigen'}</Text>
      </Pressable>
      {details ? (
        <Text style={styles.detail} selectable>
          {String(stack ?? message).slice(0, 1500)}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  content: { paddingHorizontal: space[24], gap: space[12], width: '100%', maxWidth: 480, alignSelf: 'center' },
  title: { ...text.headline, color: color.text.primary },
  body: { ...text.body, fontSize: 15, lineHeight: 20, color: color.text.secondary },
  confirmation: { color: color.accent.confirmation, marginTop: space[8] },
  error: { color: color.accent.error },
  field: {
    ...text.body,
    fontSize: 15,
    color: color.text.primary,
    borderWidth: 1,
    borderColor: color.line.hairline,
    borderRadius: radius.md,
    padding: space[12],
    minHeight: 88,
    marginTop: space[8],
    textAlignVertical: 'top',
  },
  button: { borderRadius: radius.md, paddingVertical: space[12], paddingHorizontal: space[20], alignItems: 'center' },
  primary: { backgroundColor: color.accent.primary },
  busy: { opacity: 0.6 },
  primaryText: { ...text.buttonDarkOnLight, color: color.text.onAccent },
  secondary: { borderWidth: 1, borderColor: color.line.hairline },
  secondaryText: { ...text.buttonLightOnDark, color: color.text.primary },
  link: { alignSelf: 'flex-start', paddingVertical: space[8] },
  linkText: { fontFamily: font.regular, fontSize: 15, color: color.text.primary, textDecorationLine: 'underline' },
  detail: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: color.accent.error },
});
