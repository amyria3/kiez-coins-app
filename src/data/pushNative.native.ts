import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { supabase } from '../lib/supabase';

/**
 * Push in der Android-App über den Expo-Push-Dienst (Daria, 2026-11-16, Branch `push-android`). Die Edge Function
 * `push` schickt an `exp.host`, Expo leitet über Firebase Cloud Messaging weiter. Dafür braucht Expo den FCM-V1-Schlüssel
 * des Firebase-Projekts (`npx eas-cli credentials`) und die App `google-services.json` (app.json, android).
 */

// Mitteilungen auch zeigen, wenn die App offen ist
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const projectId = () =>
  (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;

export async function nativePushOn(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return false;
  const { data } = await supabase.from('push_subscriptions').select('id').eq('kind', 'expo').limit(1);
  return !!data?.length;
}

export async function nativePushDenied(): Promise<boolean> {
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  return status === 'denied' && !canAskAgain;
}

/** Gerät anmelden: Erlaubnis fragen, Expo-Token holen, speichern. Gibt false zurück, wenn es nicht erlaubt ist. */
export async function enableNativePush(): Promise<boolean> {
  if (!Device.isDevice) throw new Error('Push geht nur auf einem echten Gerät.');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'KiezCoins',
      // AndroidImportance.DEFAULT; der Import-Linter kennt das Enum aus expo-notifications nicht
      importance: 3,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return false;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId: projectId() })).data;
  const { error } = await supabase.rpc('save_push_subscription', { p_kind: 'expo', p_endpoint: token, p_p256dh: null, p_auth: null });
  if (error) throw error;
  return true;
}

export async function disableNativePush(): Promise<void> {
  const token = (await Notifications.getExpoPushTokenAsync({ projectId: projectId() }).catch(() => null))?.data;
  if (token) await supabase.rpc('remove_push_subscription', { p_endpoint: token });
}

/** Tippen auf eine Mitteilung öffnet die Seite aus `data.url`. Gibt die Funktion zum Abmelden zurück. */
export function onPushOpen(open: (url: string) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = (response.notification.request.content.data as { url?: string } | undefined)?.url;
    if (url) open(url);
  });
  return () => sub.remove();
}
