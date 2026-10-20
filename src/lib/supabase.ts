import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Supabase-Projekt „Kiez Coins Data“. URL und Publishable Key sind öffentlich und dürfen in die App;
// geschützt werden die Daten über Row Level Security. Für ein anderes Projekt in `.env.local` setzen:
// EXPO_PUBLIC_SUPABASE_URL und EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://aqxzxpxrshizlaqyjplw.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_WqrL7Y7Wm0l9cq4tHQpjAQ_iooAaNe0';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Sitzung bleibt auf dem Gerät gespeichert, man bleibt also nach dem Neustart angemeldet.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Token nur erneuern, solange die App im Vordergrund ist (Empfehlung von Supabase für React Native).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
