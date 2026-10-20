import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Inter_300Light } from '@expo-google-fonts/inter/300Light';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { InterTight_600SemiBold } from '@expo-google-fonts/inter-tight/600SemiBold';

import { AuthProvider, useAuth } from '../data/auth';
import { StoreProvider } from '../data/store';
import { color } from '../theme/tokens';

SplashScreen.preventAutoHideAsync();

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

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

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
  // Erst rendern, wenn die gespeicherte Sitzung gelesen ist, sonst springt der Start kurz ins Onboarding.
  if (loading) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg.screen } }}>
        <Stack.Screen name="challenge/create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="challenge/[id]/report/index" options={{ presentation: 'modal' }} />
        <Stack.Screen name="challenge/[id]/report/payout" options={{ presentation: 'modal', gestureEnabled: false }} />
        <Stack.Screen name="challenge/[id]/review/reject" options={{ presentation: 'modal' }} />
        <Stack.Screen name="user/[id]/report/index" options={{ presentation: 'modal' }} />
        <Stack.Screen name="demo" options={{ presentation: 'modal' }} />
        <Stack.Screen name="challenge/[id]/report/success" options={{ gestureEnabled: false }} />
        <Stack.Screen name="challenge/[id]/review/success" options={{ gestureEnabled: false }} />
        <Stack.Screen name="challenge/[id]/pay/success" options={{ gestureEnabled: false }} />
        <Stack.Screen name="challenge/[id]/payment/success" options={{ gestureEnabled: false }} />
        <Stack.Screen name="user/[id]/report/success" options={{ gestureEnabled: false }} />
        <Stack.Screen name="account/support/success" options={{ gestureEnabled: false }} />
        <Stack.Screen name="account/pause/success" options={{ gestureEnabled: false }} />
        <Stack.Screen name="account/delete/success" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  );
}
