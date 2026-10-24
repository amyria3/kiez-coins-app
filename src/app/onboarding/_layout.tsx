import { Stack } from 'expo-router';

import { color } from '../../theme/tokens';

/** Flow „Onboarding“: Anmeldung (vorerst E-Mail und Passwort), Deckname, Ansprache, Kiez, Kodex, Funktionen, Push. */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg.screen } }} />;
}
