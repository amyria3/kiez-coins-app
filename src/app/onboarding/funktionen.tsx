import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { FeatureSwitches } from '../../components/FeatureSwitches';
import { SubScreen } from '../../components/Screen';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `onboarding/funktionen`, Schritt 6 nach dem Kodex (Daria, 24.10.2026): zeigt den Start mit Bild
 * (Me-Challenge ist immer an und steht nicht in der Liste). We-Challenge und Gruppen lassen sich hier schon zuschalten, später in „Dein Konto › Funktionen“.
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
      <KaterBubble>Du startest mit Me-Challenge und Bild. Mehr schaltest Du hier oder jederzeit in Deinem Konto dazu.</KaterBubble>
      <FeatureSwitches />
    </SubScreen>
  );
}
