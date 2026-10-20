import { Redirect } from 'expo-router';

import { useAuth } from '../data/auth';
import { useStore } from '../data/store';

/** Start: ohne Anmeldung ins Onboarding, angemeldet aber ohne Deckname weiter im Onboarding, sonst in den Feed. */
export default function Index() {
  const { session } = useAuth();
  const { profile } = useStore();
  if (!session) return <Redirect href="/onboarding/welcome" />;
  return <Redirect href={profile.onboarded ? '/feed' : '/onboarding/deckname'} />;
}
