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
import { color, space, stroke, text } from '../../theme/tokens';
import { useAppDimensions } from '../../theme/layout';

/** So lange sind die Herzen zu sehen, bevor es weitergeht */
const HERZ_MS = 900;

/** Route `onboarding/welcome`. Figma: `onboarding/welcome`, Upgrade „Nachtschicht“. */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Kleine Android-Handys (z. B. 360 × 740): Kater und Überschrift kleiner, damit der Text ohne Scrollen sichtbar ist (29.10.2026)
  const compact = useAppDimensions().height < 800;
  // Am Anfang begrüßt der Kater mit Besen (Daria, 22.10.2026)
  const kater = useKater('hallo', 10000);
  const { startTest } = useAuth();
  const [busy, setBusy] = useState(false);
  // Ein Knopf lässt Herzen in der Brille aufgehen (Daria, 02.11.2026). Kurz warten, damit man sie sieht.
  const [herzen, setHerzen] = useState(0);
  const verliebt = (weiter: () => void) => {
    setHerzen((n) => n + 1);
    setTimeout(weiter, HERZ_MS);
  };

  // Einmal testen ohne Anmeldung (Daria, 27.10.2026): Testkonto, danach normal weiter mit dem Decknamen.
  const test = async () => {
    setBusy(true);
    setHerzen((n) => n + 1);
    const [failure] = await Promise.all([startTest(), new Promise((r) => setTimeout(r, HERZ_MS))]);
    setBusy(false);
    if (failure) {
      Alert.alert('Klappt gerade nicht', failure);
      return;
    }
    router.push('/onboarding/handle');
  };
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
        <KaterStage width={compact ? 130 : 190} spruch={kater.spruch} take={kater.take} onPress={kater.noch} herzen={herzen} />
        <Text style={[styles.headline, compact && styles.headlineCompact]} accessibilityRole="header">
          Ahoi.{'\n'}
          <Text style={styles.headlineMuted}>Cat The Käptn sucht eine neue Crew für seinen Kiez.</Text>
        </Text>
        <Text style={styles.body}>
          Ich bin ein alter Mann … hm, Kater. Die Segel hab ich eingeholt, aber zur Ruhe will ich mich nicht setzen. Hilf Deinen Nachbar:innen mit kleinen Challenges.
        </Text>
        <Text style={styles.legal}>
          Testversion ·{' '}
          <Text style={styles.link} accessibilityRole="link" onPress={() => router.push('/legal/impressum')}>
            Impressum
          </Text>{' '}
          ·{' '}
          <Text style={styles.link} accessibilityRole="link" onPress={() => router.push('/legal/datenschutz')}>
            Datenschutz
          </Text>{' '}
          ·{' '}
          <Text style={styles.link} accessibilityRole="link" onPress={() => router.push('/legal/bedingungen')}>
            Bedingungen
          </Text>
        </Text>
      </ScrollView>
      <ActionBar>
        {/* Ein Weg für neue und bekannte Konten (Daria, 24.10.2026) */}
        <Button label="Anheuern oder Einloggen" icon="this-way" onPress={() => verliebt(() => router.push('/onboarding/email'))} disabled={busy} />
        <Button busy={busy} label="Ohne Anmeldung testen" variant="ghost" onPress={test} disabled={busy} />
        {/* Wann die Testdaten verschwinden, steht direkt unter dem Button (Daria, 28.10.2026) */}
        <Text style={styles.testHint}>
          Dein Testkonto und alles, was Du postest, verschwinden nach 7 Tagen oder sobald Du Dich abmeldest. Trägst Du vorher eine E-Mail ein, bleibt alles.
        </Text>
      </ActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  testHint: { ...text.caption, color: color.text.secondary, textAlign: 'center' },
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
  // Kiez-Look: Unbounded wie die übrigen großen Überschriften (Daria, 2026-11-11), kleiner, da sie breiter läuft.
  headline: { ...text.displayLarge, color: color.text.primary },
  headlineCompact: { ...text.display },
  contentCompact: { gap: space[16], paddingVertical: space[16] },
  headlineMuted: { color: color.text.secondary },
  body: { ...text.readingLarge, color: color.text.secondary },
  legal: { ...text.caption, color: color.text.secondary },
  link: { textDecorationLine: 'underline' },
});
