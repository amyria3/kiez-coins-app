import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/T';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionBar } from '../../components/ActionBar';
import { Button } from '../../components/Button';
import { KaterStage } from '../../components/KaterStage';
import { useKater } from '../../components/useKater';
import { useAuth } from '../../data/auth';
import { color, font, space, stroke, text } from '../../theme/tokens';

/** Route `onboarding/welcome`. Figma: `onboarding/welcome`, Upgrade „Nachtschicht“. */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Am Anfang begrüßt der Kater mit Besen (Daria, 22.10.2026)
  const kater = useKater('hallo', 10000);
  const { startTest } = useAuth();
  const [busy, setBusy] = useState(false);

  // Einmal testen ohne Anmeldung (Daria, 27.10.2026): Testkonto, danach normal weiter mit dem Decknamen.
  const test = async () => {
    setBusy(true);
    const failure = await startTest();
    setBusy(false);
    if (failure) {
      Alert.alert('Klappt gerade nicht', failure);
      return;
    }
    router.push('/onboarding/deckname');
  };
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <KaterStage width={190} spruch={kater.spruch} take={kater.take} onPress={kater.noch} />
        <Text style={styles.headline} accessibilityRole="header">
          Ahoi.{'\n'}
          <Text style={styles.headlineMuted}>Cat The Käptn sucht eine neue Crew für seinen Kiez.</Text>
        </Text>
        <Text style={styles.body}>
          Ich bin ein alter Mann … hm, Kater. Die Segel hab ich eingeholt, aber zur Ruhe will ich mich nicht setzen. Hilf Deinen Nachbar:innen mit kleinen Challenges.
        </Text>
        <Text style={styles.legal}>
          Testversion ·{' '}
          <Text style={styles.link} accessibilityRole="link" onPress={() => router.push('/rechtliches/impressum')}>
            Impressum
          </Text>{' '}
          ·{' '}
          <Text style={styles.link} accessibilityRole="link" onPress={() => router.push('/rechtliches/datenschutz')}>
            Datenschutz
          </Text>{' '}
          ·{' '}
          <Text style={styles.link} accessibilityRole="link" onPress={() => router.push('/rechtliches/bedingungen')}>
            Bedingungen
          </Text>
        </Text>
      </ScrollView>
      <ActionBar>
        {/* Ein Weg für neue und bekannte Konten (Daria, 24.10.2026) */}
        <Button label="Anheuern" icon="this-way" onPress={() => router.push('/onboarding/email')} disabled={busy} />
        <Button busy={busy} label="Erst mal testen, ohne Anmeldung" variant="ghost" onPress={test} disabled={busy} />
      </ActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space[20], paddingVertical: space[24], gap: space[24] },
  tile: {
    width: 180,
    height: 180,
    borderRadius: 48,
    backgroundColor: color.bg.surface,
    borderWidth: stroke.ultraThin,
    borderColor: color.line.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: { ...text.display, fontSize: 44, lineHeight: 46, letterSpacing: -1.2, color: color.text.primary },
  headlineMuted: { color: color.text.secondary },
  body: { fontFamily: font.light, fontSize: 16, lineHeight: 23, color: color.text.secondary },
  legal: { ...text.caption, color: color.text.secondary },
  link: { textDecorationLine: 'underline' },
});
