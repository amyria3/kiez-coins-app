import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { FeatureSwitches } from '../../components/FeatureSwitches';
import { SubScreen } from '../../components/Screen';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `onboarding/funktionen`, Schritt 6 nach dem Kodex: Modi Privat, Gruppe und Kiez verbergen und den
 * Standard wählen (Daria, 27.10.2026), später in „Dein Konto › Funktionen“.
 */
export default function OnboardingFeatures() {
  const router = useRouter();
  const goBack = useGoBack();
  return (
    <SubScreen
      title="Funktionen"
      subtitle="Schritt 6 von 7"
      navigation="back"
      onLeadingPress={goBack}
      actions={<Button label="Weiter" onPress={() => router.push('/onboarding/push')} />}
    >
      <KaterBubble>Privat siehst nur Du, in der Gruppe nur Deine Gruppe, im Kiez alle in Deinem Kiez. Verbirg, was Du nicht brauchst. Das geht auch später in Deinem Konto.</KaterBubble>
      <FeatureSwitches />
    </SubScreen>
  );
}
