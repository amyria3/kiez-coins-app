import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Inter_300Light } from '@expo-google-fonts/inter/300Light';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { InterTight_600SemiBold } from '@expo-google-fonts/inter-tight/600SemiBold';

import { WebAlertHost } from '../components/WebAlert';
import { AuthProvider, useAuth } from '../data/auth';
import { StoreProvider } from '../data/store';
import { translateAlerts } from '../components/T';
import { loadLanguage, loadTexts, useTexts, getLanguage } from '../data/texts';
import { LoadingScreen } from '../components/GearsLoader';
import { StartKater } from '../components/StartKater';
import { InstallHint } from '../components/InstallHint';
import { WebSafeArea } from '../components/WebSafeArea';
import { FriendInviteNotice } from '../components/FriendInviteNotice';
import { UpdateHint } from '../components/UpdateHint';
import { color, scheme } from '../theme/tokens';
import { ErrorScreen } from '../components/ErrorScreen';
import { setLastScreen } from '../lib/errorReport';
import { HeartBurst } from '../components/HeartBurst';

SplashScreen.preventAutoHideAsync();

/** Stand des Starts für die Fehleranzeige in public/index.html */
function setStartInfo(info: string) {
  if (typeof window !== 'undefined') (window as unknown as { __kiezStart?: string }).__kiezStart = info;
}
// Nach WebAlert: Rückfragen erscheinen in der gewählten Sprache
translateAlerts();

// Navigation laut Figma-Annotationen: Push = Stack, Modal = von unten.
// Kopfzeilen kommen aus der Komponente NavigationBar, daher headerShown: false.
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    InterTight_600SemiBold,
  });

  // Sprache (gespeicherte Wahl oder Handy), danach rendern
  const [languageReady, setLanguageReady] = useState(false);
  useEffect(() => {
    loadLanguage().finally(() => setLanguageReady(true));
  }, []);

  // Texte aus dem CMS (Tabelle app_texts): beim Start und jedes Mal, wenn die App wieder nach vorn kommt
  useEffect(() => {
    loadTexts();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && loadTexts());
    return () => sub.remove();
  }, []);

  // Spätestens nach 3 Sekunden starten, auch wenn Schrift oder Sprache hängen (Safari, Daria 23.10.2026).
  // Ohne Inter springt der Browser auf die Systemschrift, die App bleibt bedienbar.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(timer);
  }, []);
  const ready = timedOut || ((fontsLoaded || !!fontError) && languageReady);
  setStartInfo(`Schrift ${fontsLoaded ? 'ok' : fontError ? 'Fehler' : 'lädt'}, Sprache ${languageReady ? 'ok' : 'lädt'}${timedOut ? ', Zeitlimit' : ''}`);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  // Seit SDK 58 liefert Expo Router im Web keine Safe-Area-Abstände mehr. Ohne eigenen Provider
  // liegt der Kopf der Web-App auf dem Home-Bildschirm unter der Statusleiste (Daria, 2026-10-23).
  return (
    <SafeAreaProvider>
      <WebSafeArea>
        <StoreProvider>
          <AuthProvider>
            <RootStack />
          </AuthProvider>
        </StoreProvider>
      </WebSafeArea>
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { loading } = useAuth();
  // Neue Sprache: Navigation neu aufbauen, damit jeder Screen die neuen Texte zeigt
  useTexts();
  const language = getLanguage();
  // Startbildschirm: Zahnräder unten, dann der Kater mit dem Besen (Daria, 2026-10-24)
  const [intro, setIntro] = useState(true);
  // Aktueller Screen für den Fehlerbericht
  const pathname = usePathname();
  useEffect(() => setLastScreen(pathname), [pathname]);
  // Erst rendern, wenn die gespeicherte Sitzung gelesen ist, sonst springt der Start kurz ins Onboarding.
  setStartInfo(loading ? 'Anmeldung lädt' : 'App gerendert');
  if (loading && !intro) return <LoadingScreen />;

  // Der Startbildschirm steht immer an derselben Stelle im Baum, damit er beim Ende des Ladens nicht neu startet.
  return (
    <>
      {loading ? null : (
        <>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <FriendInviteNotice />
        <Stack key={language} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg.screen } }}>
          {/* Vollbild ohne Wegwischen: Schließen nur über das X, damit die Frage nach dem Entwurf kommt
              und die Vorschau nicht wie ein Overlay wirkt, dessen Wischen mit den Gesten der Vorschau konkurriert */}
          <Stack.Screen name="challenge/create" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          <Stack.Screen name="challenge/[id]/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="challenge/[id]/report/index" options={{ presentation: 'modal' }} />
          <Stack.Screen name="challenge/[id]/report/payout" options={{ presentation: 'modal', gestureEnabled: false }} />
          <Stack.Screen name="challenge/[id]/review/reject" options={{ presentation: 'modal' }} />
          <Stack.Screen name="user/[id]/report/index" options={{ presentation: 'modal' }} />
          <Stack.Screen name="challenge/[id]/flag/index" options={{ presentation: 'modal' }} />
          <Stack.Screen name="demo" options={{ presentation: 'modal' }} />
          <Stack.Screen name="challenge/[id]/report/success" options={{ gestureEnabled: false }} />
          <Stack.Screen name="challenge/[id]/review/success" options={{ gestureEnabled: false }} />
          <Stack.Screen name="challenge/[id]/pay/success" options={{ gestureEnabled: false }} />
          <Stack.Screen name="challenge/[id]/payment/success" options={{ gestureEnabled: false }} />
          <Stack.Screen name="user/[id]/report/success" options={{ gestureEnabled: false }} />
          <Stack.Screen name="challenge/[id]/flag/success" options={{ gestureEnabled: false }} />
          <Stack.Screen name="account/support/success" options={{ gestureEnabled: false }} />
          <Stack.Screen name="account/pause/success" options={{ gestureEnabled: false }} />
          <Stack.Screen name="account/delete/success" options={{ gestureEnabled: false }} />
        </Stack>
          <InstallHint />
          <UpdateHint />
          <WebAlertHost />
          <HeartBurst />
        </>
      )}
      {intro ? <StartKater loaded={!loading} onDone={() => setIntro(false)} /> : null}
    </>
  );
}

/**
 * Absturz beim Rendern: Fehler-Screen mit Fehlerbericht statt schwarzem Bildschirm (Daria, 23. und 25.10.2026).
 * Expo Router zeigt diese Komponente, wenn ein Screen darunter einen Fehler wirft.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return <ErrorScreen error={error} retry={retry} />;
}
