import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { KaterBubble } from '../../components/Content';
import { FeatureSwitches } from '../../components/FeatureSwitches';
import { SubScreen } from '../../components/Screen';
import { homeAfterOnboarding } from '../../data/pendingInvite';
import { useStore } from '../../data/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOUR_OFFER_DELAY_MS, TOUR_OFFER_KEY } from '../../data/tour';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `onboarding/funktionen`, Schritt 6 nach dem Kodex und letzter Schritt: Modi Privat, Gruppe und Kiez verbergen und den
 * Standard wählen (Daria, 27.10.2026), später in „Dein Konto › Funktionen“.
 */
export default function OnboardingFeatures() {
  const router = useRouter();
  const goBack = useGoBack();
  const { dispatch } = useStore();
  // Der Schritt „Nachrichten“ (Berechtigungen, onboarding/push) ist ausgeblendet (Daria, 28.10.2026).
  // Hier endet das Onboarding; Push bleibt aus und lässt sich später im Konto einschalten.
  const finish = async () => {
    dispatch({ type: 'updateProfile', patch: { onboarded: true } });
    const target = await homeAfterOnboarding();
    // Die Tour kommt nicht mehr sofort, sondern als Frage etwa 5 Minuten später (TourOffer, Daria, 28.10.2026)
    try {
      await AsyncStorage.setItem(TOUR_OFFER_KEY, String(Date.now() + TOUR_OFFER_DELAY_MS));
    } catch {
      // dann fragt die App nicht; die Tour bleibt im Konto erreichbar
    }
    router.dismissAll();
    router.replace(target as never);
  };
  return (
    <SubScreen
      title="Funktionen"
      subtitle="Schritt 6 von 6"
      navigation="back"
      onLeadingPress={goBack}
      actions={<Button label="Weiter" onPress={finish} />}
    >
      <KaterBubble>Privat siehst nur Du, in der Gruppe nur Deine Gruppe, im Kiez alle in Deinem Kiez. Verbirg, was Du nicht brauchst. Das geht auch später in Deinem Konto.</KaterBubble>
      <FeatureSwitches />
    </SubScreen>
  );
}
