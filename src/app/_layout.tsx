import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Inter_300Light } from '@expo-google-fonts/inter/300Light';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Karla_300Light } from '@expo-google-fonts/karla/300Light';
import { Karla_400Regular } from '@expo-google-fonts/karla/400Regular';
import { Karla_500Medium } from '@expo-google-fonts/karla/500Medium';
import { Karla_600SemiBold } from '@expo-google-fonts/karla/600SemiBold';
import { InterTight_600SemiBold } from '@expo-google-fonts/inter-tight/600SemiBold';
import { Unbounded_300Light } from '@expo-google-fonts/unbounded/300Light';
import { Unbounded_500Medium } from '@expo-google-fonts/unbounded/500Medium';

import { WebAlertHost } from '../components/WebAlert';
import { ShareDialogHost } from '../components/ShareDialog';
import { CrosspostDialogHost } from '../components/CrosspostDialog';
import { TourOffer } from '../components/TourOffer';
import { AuthProvider, useAuth } from '../data/auth';
import { StoreProvider } from '../data/store';
import { translateAlerts } from '../components/T';
import { getLanguageChanges, loadLanguage, loadTexts, useTexts } from '../data/texts';
import { LoadingScreen } from '../components/GearsLoader';
import { StartKater } from '../components/StartKater';
import { InstallHint } from '../components/InstallHint';
import { WebSafeArea } from '../components/WebSafeArea';
import { FrontSpaceProvider, FunctionalSpaceScreen, isFunctionalRoute } from '../theme/signal';
import { KeyboardProvider } from '../components/Keyboard';
import { FriendInviteNotice } from '../components/FriendInviteNotice';
import { BadgeNotice } from '../components/BadgeNotice';
import { UpdateHint } from '../components/UpdateHint';
import { color, scheme } from '../theme/tokens';
import { ErrorScreen } from '../components/ErrorScreen';
import { setLastScreen } from '../lib/errorReport';
import { HeartBurst } from '../components/HeartBurst';
import { markIntroDone } from '../lib/intro';

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
    Karla_300Light,
    Karla_400Regular,
    Karla_500Medium,
    Karla_600SemiBold,
    InterTight_600SemiBold,
    Unbounded_300Light,
    Unbounded_500Medium,
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
        {/* Seiten rücken über die Tastatur, auf allen Plattformen gleich (Keyboard.tsx) */}
        <KeyboardProvider>
          <StoreProvider>
            <AuthProvider>
              <RootStack />
            </AuthProvider>
          </StoreProvider>
        </KeyboardProvider>
      </WebSafeArea>
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { loading } = useAuth();
  // Neue Sprache: Navigation neu aufbauen, damit jeder Screen die neuen Texte zeigt. Nur bei einem Wechsel durch
  // Dich, nicht beim Laden der gespeicherten Sprache (getLanguageChanges, Daria, 2026-11-13).
  useTexts();
  const languageChanges = getLanguageChanges();
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
        {/* Hinweise erst nach dem Startbildschirm, sonst liegen sie über ihm oder laufen ungesehen darunter ab */}
        {intro ? null : <BadgeNotice />}
        <Stack
          key={languageChanges}
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg.screen } }}
          // Theme „Functional“ für die Seiten unter dem Menü (Daria, 2026-11-14)
          screenLayout={({ route, children }) => (isFunctionalRoute(route.name) ? <FunctionalSpaceScreen>{children}</FunctionalSpaceScreen> : children)}
        >
          {/* Vollbild ohne Wegwischen: Schließen nur über das X, damit die Frage nach dem Entwurf kommt
              und die Vorschau nicht wie ein Overlay wirkt, dessen Wischen mit den Gesten der Vorschau konkurriert */}
          {/* Routine liegt links neben den Reitern und kommt von links herein (Daria, 2026-11-10) */}
          <Stack.Screen name="routine/index" options={{ animation: 'slide_from_left' }} />
          <Stack.Screen name="challenge/create" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          {/* Browser: Der Feed bleibt unter der Detailseite sichtbar, damit Wischen nach rechts ihn zeigt (HeroScreen) */}
          <Stack.Screen
            name="challenge/[id]/index"
            options={Platform.OS === 'web' ? { presentation: 'containedTransparentModal', contentStyle: { backgroundColor: 'transparent' } } : {}}
          />
          <Stack.Screen name="challenge/[id]/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="challenge/[id]/complete/index" options={{ presentation: 'modal' }} />
          <Stack.Screen name="challenge/[id]/complete/payout" options={{ presentation: 'modal', gestureEnabled: false }} />
          <Stack.Screen name="challenge/[id]/review/reject" options={{ presentation: 'modal' }} />
          <Stack.Screen name="user/[id]/report/index" options={{ presentation: 'modal' }} />
          <Stack.Screen name="challenge/[id]/report/index" options={{ presentation: 'modal' }} />
          <Stack.Screen name="demo" options={{ presentation: 'modal' }} />
          <Stack.Screen name="badge/[kind]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="challenge/[id]/complete/success" options={{ gestureEnabled: false }} />
          <Stack.Screen name="challenge/[id]/review/success" options={{ gestureEnabled: false }} />
          <Stack.Screen name="challenge/[id]/pay/success" options={{ gestureEnabled: false }} />
          <Stack.Screen name="challenge/[id]/received/success" options={{ gestureEnabled: false }} />
          <Stack.Screen name="user/[id]/report/success" options={{ gestureEnabled: false }} />
          <Stack.Screen name="challenge/[id]/report/success" options={{ gestureEnabled: false }} />
          <Stack.Screen name="account/support/success" options={{ gestureEnabled: false }} />
          <Stack.Screen name="account/pause/success" options={{ gestureEnabled: false }} />
          <Stack.Screen name="account/delete/success" options={{ gestureEnabled: false }} />
        </Stack>
          {intro ? null : (
            <>
              <InstallHint />
              <FriendInviteNotice />
              <UpdateHint />
            </>
          )}
          {/* Dialoge über der App in der Farbe der vorderen Seite, z. B. gelb in „Me & Myself“ (Daria, 2026-11-13) */}
          <FrontSpaceProvider>
            <ShareDialogHost />
            <WebAlertHost />
            <CrosspostDialogHost />
          </FrontSpaceProvider>
          {intro ? null : <TourOffer />}
          <HeartBurst />
        </>
      )}
      {intro ? (
        <StartKater
          loaded={!loading}
          onDone={() => {
            markIntroDone();
            setIntro(false);
          }}
        />
      ) : null}
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
