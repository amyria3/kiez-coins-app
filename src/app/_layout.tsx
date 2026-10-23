import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
import { color, scheme } from '../theme/tokens';

SplashScreen.preventAutoHideAsync();
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

  useEffect(() => {
    if ((fontsLoaded || fontError) && languageReady) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError, languageReady]);

  if ((!fontsLoaded && !fontError) || !languageReady) return null;

  return (
    <StoreProvider>
      <AuthProvider>
        <RootStack />
      </AuthProvider>
    </StoreProvider>
  );
}

function RootStack() {
  const { loading } = useAuth();
  // Neue Sprache: Navigation neu aufbauen, damit jeder Screen die neuen Texte zeigt
  useTexts();
  const language = getLanguage();
  // Erst rendern, wenn die gespeicherte Sitzung gelesen ist, sonst springt der Start kurz ins Onboarding.
  if (loading) return <LoadingScreen />;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
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
      <WebAlertHost />
    </>
  );
}
