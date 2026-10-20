import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { loadOwnProfile, saveOwnProfile } from './remote';
import { useStore } from './store';
import type { Profile } from './types';

// Anmeldung per E-Mail-Code (Supabase Auth, ohne Passwort), siehe kiez-coins/konto/MVP_Konto.md.
// Nach dem Anmelden lädt die App Profil und Einstellungen aus den Tabellen `profiles` und
// `profile_settings` sowie alle Daten für den Feed. Änderungen am Profil werden zurückgeschrieben.

type Auth = {
  session: Session | null;
  /** true, bis die gespeicherte Sitzung vom Gerät gelesen ist */
  loading: boolean;
  /** Schickt einen Code an die Adresse. `createUser: false` für „Ich hab schon ein Konto“. */
  sendCode: (email: string, createUser: boolean) => Promise<string | null>;
  /** Prüft den Code. Gibt eine Fehlermeldung zurück oder null. */
  verifyCode: (email: string, code: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const SKIP_ONCE = 'skip-once';

const AuthContext = createContext<Auth | null>(null);

/** Supabase-Fehler in Kater-taugliches Deutsch übersetzen. */
export function authErrorText(error: AuthError): string {
  switch (error.code) {
    case 'otp_expired':
      return 'Der Code ist abgelaufen oder stimmt nicht. Lass Dir einen neuen schicken.';
    case 'otp_disabled':
    case 'signup_disabled':
    case 'user_not_found':
      return 'Zu dieser Adresse gibt es noch kein Konto. Heuer einfach neu an.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Zu viele Codes auf einmal. Warte kurz und versuch es dann noch mal.';
    case 'email_address_invalid':
      return 'Diese E-Mail-Adresse klappt nicht. Prüf sie bitte noch mal.';
    case 'user_banned':
      return 'Dieses Konto ist gesperrt. Schreib uns, wenn Du Einspruch einlegen willst.';
  }
  if (error.status === 0 || /fetch|network/i.test(error.message)) {
    return 'Keine Verbindung. Prüf Dein Internet und versuch es noch mal.';
  }
  return 'Da ist etwas schiefgegangen. Versuch es bitte noch mal.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { profile, dispatch, load } = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  /** Zuletzt mit Supabase abgeglichener Stand, damit nicht jede Änderung doppelt geschrieben wird. */
  const lastSynced = useRef<string>('');
  /** Erst schreiben, wenn das Profil aus der Datenbank gelesen ist, sonst überschreibt der leere Startstand es. */
  const profileLoaded = useRef(false);

  useEffect(() => {
    const apply = async (next: Session | null) => {
      setSession(next);
      profileLoaded.current = false;
      if (!next) return;
      const userId = next.user.id;
      try {
        const fromDb = await loadOwnProfile(userId);
        const patch: Partial<Profile> = { email: next.user.email ?? '', ...fromDb };
        dispatch({ type: 'updateProfile', patch });
        lastSynced.current = SKIP_ONCE;
      } catch {
        // Ohne Verbindung bleibt der lokale Stand; der Feed zeigt dann „offline“.
      }
      profileLoaded.current = true;
      await load(userId);
    };

    supabase.auth.getSession().then(async ({ data }) => {
      await apply(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      // Nur bei echten Wechseln neu laden, nicht bei jedem Token-Refresh.
      // Supabase empfiehlt, im Callback nichts abzuwarten, daher setTimeout.
      if (event === 'SIGNED_IN') setTimeout(() => apply(next), 0);
      else setSession(next);
      if (event === 'SIGNED_OUT') dispatch({ type: 'signOut' });
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Profiländerungen (Deckname, Ansprache, Kiez, Kodex, Push, Pause, Onboarding fertig) speichern.
  useEffect(() => {
    if (!session || !profileLoaded.current) return;
    const { email: _email, ...rest } = profile;
    const next = JSON.stringify(rest);
    if (lastSynced.current === SKIP_ONCE) {
      // Gerade aus der Datenbank gelesen, nichts zu speichern.
      lastSynced.current = next;
      return;
    }
    if (next === lastSynced.current) return;
    const timer = setTimeout(() => {
      lastSynced.current = next;
      saveOwnProfile(session.user.id, profile).catch(() => {
        lastSynced.current = ''; // beim nächsten Mal erneut versuchen
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [session, profile]);

  const value = useMemo<Auth>(
    () => ({
      session,
      loading,
      sendCode: async (email, createUser) => {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: createUser } });
        return error ? authErrorText(error) : null;
      },
      verifyCode: async (email, code) => {
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
        return error ? authErrorText(error) : null;
      },
      signOut: async () => {
        // Nur dieses Gerät abmelden. Klappt auch, wenn das Konto gerade gelöscht wurde.
        await supabase.auth.signOut({ scope: 'local' });
        dispatch({ type: 'signOut' });
      },
    }),
    [session, loading, dispatch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden');
  return auth;
}
