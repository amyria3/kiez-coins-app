import { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
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
import { color } from '../theme/tokens';
import { look, setLook } from '../theme/look';

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

  // Seit SDK 58 liefert Expo Router im Web keine Safe-Area-Abstände mehr. Ohne eigenen Provider
  // liegt der Kopf der Web-App auf dem Home-Bildschirm unter der Statusleiste (Daria, 2026-10-23).
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <AuthProvider>
          <RootStack />
        </AuthProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { loading } = useAuth();
  // Neue Sprache: Navigation neu aufbauen, damit jeder Screen die neuen Texte zeigt
  useTexts();
  const language = getLanguage();
  // Nach den Zahnrädern einmal der Kater mit dem Besen (Daria, 2026-10-23)
  const [intro, setIntro] = useState(true);
  // Erst rendern, wenn die gespeicherte Sitzung gelesen ist, sonst springt der Start kurz ins Onboarding.
  if (loading) return <LoadingScreen />;

  return (
    <>
      <StatusBar style="light" />
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
      {intro ? <StartKater onDone={() => setIntro(false)} /> : null}
      <WebAlertHost />
    </>
  );
}

/**
 * Absturz beim Rendern: Fehlertext statt schwarzem Bildschirm (Daria, 23.10.2026).
 * Expo Router zeigt diese Komponente, wenn ein Screen darunter einen Fehler wirft.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <View style={errorStyles.screen}>
      <Text style={errorStyles.title}>Hier ist etwas schiefgelaufen.</Text>
      <Text style={errorStyles.hint}>Schick bitte einen Screenshot an den Support.</Text>
      <Text style={errorStyles.detail} selectable>
        {String(error?.stack ?? error?.message ?? error).slice(0, 1200)}
      </Text>
      <Pressable style={errorStyles.button} onPress={() => retry()} accessibilityRole="button">
        <Text style={errorStyles.buttonText}>Nochmal versuchen</Text>
      </Pressable>
      {look !== 'kiez' ? (
        <Pressable style={errorStyles.link} onPress={() => setLook('kiez')} accessibilityRole="button">
          <Text style={errorStyles.linkText}>Zurück zum Kiez-Look</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const errorStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen, paddingHorizontal: 24, paddingTop: 80, gap: 12 },
  title: { color: color.text.primary, fontSize: 22, fontWeight: '600' },
  hint: { color: color.text.secondary, fontSize: 15 },
  detail: { color: color.accent.error, fontSize: 12, marginTop: 8 },
  button: { marginTop: 16, alignSelf: 'flex-start', backgroundColor: color.accent.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  buttonText: { color: color.text.onAccent, fontSize: 16, fontWeight: '600' },
  link: { alignSelf: 'flex-start', paddingVertical: 8 },
  linkText: { color: color.text.primary, fontSize: 15, textDecorationLine: 'underline' },
});
