import { Stack } from 'expo-router';

import { color } from '../../theme/tokens';

/** Flow „Onboarding“: Anmeldung per E-Mail-Code, Deckname, Ansprache, Kiez, Kodex, Push. */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg.screen } }} />;
}
