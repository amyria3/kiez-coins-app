import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionBar } from '../../components/ActionBar';
import { Button } from '../../components/Button';
import { SpeechBubble } from '../../components/Content';
import { Cat } from '../../components/icons/Brand';
import { color, space, text } from '../../theme/tokens';

/** Route `onboarding/welcome`. Figma: `onboarding/welcome`. */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Cat mood="high" height={140} />
        <SpeechBubble style={styles.bubble}>
          Ahoi! Ich bin der alte Kater vom Kiez. Die Segel hab ich eingeholt, aber für eine neue Crew würde ich alles
          tun.{'\n'}Alles.
        </SpeechBubble>
        <Text style={styles.body}>
          Hilf Deinen Nachbar*innen mit kleinen Challenges und werde Teil der Crew in Deinem Kiez.
        </Text>
      </ScrollView>
      <ActionBar>
        <Button label="Anheuern" onPress={() => router.push('/onboarding/email')} />
        <Button
          label="Ich hab schon ein Konto"
          variant="secondary"
          onPress={() => router.push({ pathname: '/onboarding/email', params: { existing: '1' } })}
        />
      </ActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: space[16], gap: space[16] },
  bubble: { alignSelf: 'stretch' },
  body: { ...text.body, color: color.text.secondary, textAlign: 'center' },
});
