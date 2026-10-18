import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { useStore } from './store';
import type { Profile } from './types';

// Anmeldung per E-Mail-Code (Supabase Auth, ohne Passwort), siehe kiez-coins/konto/MVP_Konto.md.
// Solange es noch keine Tabelle `profiles` gibt, liegen Deckname, Ansprache, Kiez, Push und
// „Onboarding fertig“ in den user_metadata des Supabase-Kontos. So kennt die App sie nach dem
// Neustart oder auf einem zweiten Gerät wieder.

/** Felder aus Profile, die im Konto gespeichert werden. */
const syncedKeys = ['handle', 'addressForm', 'addressCustom', 'kiez', 'push', 'onboarded', 'pausedUntil'] as const;
type SyncedProfile = Pick<Profile, (typeof syncedKeys)[number]>;

function pickSynced(profile: Profile): SyncedProfile {
  const out: Record<string, unknown> = {};
  for (const key of syncedKeys) if (profile[key] !== undefined) out[key] = profile[key];
  return out as SyncedProfile;
}

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
  const { profile, dispatch } = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  /** Zuletzt mit Supabase abgeglichener Stand, damit nicht jede Änderung doppelt geschrieben wird. */
  const lastSynced = useRef<string>('');

  useEffect(() => {
    const apply = (next: Session | null) => {
      setSession(next);
      if (next) {
        const meta = (next.user.user_metadata ?? {}) as Partial<SyncedProfile>;
        const fromAccount: Partial<Profile> = { email: next.user.email ?? '' };
        for (const key of syncedKeys) if (meta[key] !== undefined) (fromAccount as Record<string, unknown>)[key] = meta[key];
        lastSynced.current = JSON.stringify(pickSynced({ ...profile, ...fromAccount }));
        dispatch({ type: 'updateProfile', patch: fromAccount });
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      apply(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      // Nur bei echten Wechseln das Profil neu laden, nicht bei jedem Token-Refresh.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') apply(next);
      else setSession(next);
      if (event === 'SIGNED_OUT') dispatch({ type: 'signOut' });
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Profiländerungen (Onboarding fertig, Deckname, Ansprache, Push, Pause) ins Konto schreiben.
  // Erst nach dem Onboarding, damit halbfertige Angaben nicht gespeichert werden.
  useEffect(() => {
    if (!session || !profile.onboarded) return;
    const next = JSON.stringify(pickSynced(profile));
    if (next === lastSynced.current) return;
    const timer = setTimeout(() => {
      lastSynced.current = next;
      supabase.auth.updateUser({ data: pickSynced(profile) }).then(({ error }) => {
        if (error) lastSynced.current = ''; // beim nächsten Mal erneut versuchen
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
        await supabase.auth.signOut();
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
