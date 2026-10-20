import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useStore } from './store';

/**
 * Ohne Kiez darf man die App nur ansehen (MVP_Konto.md: „Später festlegen“).
 * Gibt true zurück, wenn es weitergehen darf, sonst fragt der Kater nach dem Kiez.
 */
export function useRequireKiez() {
  const router = useRouter();
  const { mode, profile } = useStore();
  return useCallback(() => {
    if (mode === 'demo' || profile.kiez) return true;
    Alert.alert('Wo ist Dein Heimathafen?', 'Challenges erstellen und annehmen kannst Du, sobald Dein Kiez feststeht.', [
      { text: 'Später', style: 'cancel' },
      { text: 'Kiez festlegen', onPress: () => router.push({ pathname: '/onboarding/kiez', params: { from: 'app' } }) },
    ]);
    return false;
  }, [mode, profile.kiez, router]);
}
