import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/T';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionBar } from '../../components/ActionBar';
import { Button } from '../../components/Button';
import { KaterStage } from '../../components/KaterStage';
import { useKater } from '../../components/useKater';
import { color, font, space, stroke, text } from '../../theme/tokens';

/** Route `onboarding/welcome`. Figma: `onboarding/welcome`, Upgrade „Nachtschicht“. */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Am Anfang begrüßt der Kater mit Besen (Daria, 22.10.2026)
  const kater = useKater('hallo', 10000);
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <KaterStage width={190} spruch={kater.spruch} take={kater.take} onPress={kater.noch} />
        <Text style={styles.headline} accessibilityRole="header">
          Ahoi.{'\n'}
          <Text style={styles.headlineMuted}>Der Kiez sucht eine neue Crew.</Text>
        </Text>
        <Text style={styles.body}>
          Ich bin der alte Kater vom Kiez. Die Segel hab ich eingeholt, aber für eine neue Crew würde ich alles tun.
          Alles. Hilf Deinen Nachbar*innen mit kleinen Challenges.
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
        <Button label="Anheuern" onPress={() => router.push('/onboarding/email')} />
        <Button
          label="Ich hab schon ein Konto"
          variant="ghost"
          onPress={() => router.push({ pathname: '/onboarding/email', params: { existing: '1' } })}
        />
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
