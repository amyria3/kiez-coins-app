import { Redirect } from 'expo-router';

import { useStore } from '../data/store';

/** Start: ohne Konto ins Onboarding, sonst in den Feed. */
export default function Index() {
  const { profile } = useStore();
  return <Redirect href={profile.onboarded ? '/feed' : '/onboarding/welcome'} />;
}
