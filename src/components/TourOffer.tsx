import { useEffect } from 'react';
import { Alert } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { TOUR_OFFER_KEY, TOUR_SEEN_KEY } from '../data/tour';

/**
 * Fragt etwa 5 Minuten nach der Anmeldung einmal: „Willst Du die wichtigsten Funktionen sehen?“ (Daria, 28.10.2026).
 * Die Tour kommt nicht mehr direkt nach dem Onboarding. Der Zeitpunkt steht in AsyncStorage, damit die Frage auch
 * nach einem Neustart der App kommt. Während des Onboardings und in der Tour selbst fragt die App nicht.
 * Nach jeder Antwort fragt sie nicht noch einmal; die Tour bleibt über Dein Konto › So geht Kiez Coins erreichbar.
 */
export function TourOffer() {
  const router = useRouter();
  const pathname = usePathname();
  const blocked = pathname.startsWith('/onboarding') || pathname.startsWith('/tour');

  useEffect(() => {
    if (blocked) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    (async () => {
      let at: string | null = null;
      let seen: string | null = null;
      try {
        [at, seen] = await Promise.all([AsyncStorage.getItem(TOUR_OFFER_KEY), AsyncStorage.getItem(TOUR_SEEN_KEY)]);
      } catch {
        return;
      }
      if (!active || !at) return;
      const done = () => AsyncStorage.removeItem(TOUR_OFFER_KEY).catch(() => undefined);
      if (seen) {
        done();
        return;
      }
      const ask = () => {
        done();
        Alert.alert('Willst Du die wichtigsten Funktionen sehen?', 'Ein paar kurze Videos. Du findest sie auch später in Deinem Konto unter „So geht Kiez Coins“.', [
          { text: 'Später', style: 'cancel' },
          { text: 'Zeigen', onPress: () => router.push('/tour') },
        ]);
      };
      timer = setTimeout(ask, Math.max(0, Number(at) - Date.now()));
    })();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [blocked, router]);

  return null;
}
