import { useEffect } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { useAuth } from '../data/auth';
import { rememberLinkMode } from '../data/features';
import { useStore } from '../data/store';

/**
 * Start: ohne Anmeldung ins Onboarding, angemeldet aber ohne Deckname weiter im Onboarding, sonst in den Feed.
 * `?modus=privat|gruppe|kiez`: Link für eine Zielgruppe, der Modus ist danach vorausgewählt (Daria, 27.10.2026).
 */
export default function Index() {
  const { session } = useAuth();
  const { profile } = useStore();
  const { modus: mode } = useLocalSearchParams<{ modus?: string }>();
  useEffect(() => {
    if (mode) rememberLinkMode(mode);
  }, [mode]);
  if (!session) return <Redirect href="/onboarding/welcome" />;
  return <Redirect href={profile.onboarded ? '/feed' : '/onboarding/handle'} />;
}
