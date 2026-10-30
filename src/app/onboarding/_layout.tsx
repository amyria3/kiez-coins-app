import { Stack } from 'expo-router';

import { color } from '../../theme/tokens';

/** Flow „Onboarding“: Anmeldung, Deckname mit grammatischem Geschlecht, Kiez, Kodex, Funktionen (Ansprache und Push ausgeblendet, 28.10.2026). */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg.screen } }} />;
}
