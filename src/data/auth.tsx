import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { ensureOwnProfile, loadOwnProfile, saveOwnProfile } from './remote';
import { useStore } from './store';
import type { Profile } from './types';
import { t } from './texts';

const MIN_PASSWORD = 8;

// Anmeldung per E-Mail-Code (sendCode/verifyCode, onboarding/email → onboarding/code). Supabase Auth
// verschickt die Codes über Brevo als registration.noreply@kiezcoins.de. Alternativ meldet sich die
// Nutzerin mit Passwort an. Das Passwort legt sie unter `account/password` fest oder ändert es dort;
// bei vergessenem Passwort meldet sie sich per Code an und legt dort ein neues fest.
// Nach dem Anmelden lädt die App Profil und Einstellungen aus den Tabellen `profiles` und
// `profile_settings` sowie alle Daten für den Feed. Änderungen am Profil werden zurückgeschrieben.

type Auth = {
  session: Session | null;
  /** true, bis die gespeicherte Sitzung vom Gerät gelesen ist */
  loading: boolean;
  /** Schickt einen Code an die Adresse. Mit `createUser` legt Supabase bei Bedarf ein Konto an. */
  sendCode: (email: string, createUser: boolean) => Promise<string | null>;
  /** Prüft den Code. Gibt eine Fehlermeldung zurück oder null. */
  verifyCode: (email: string, code: string) => Promise<string | null>;
  /** Neues Konto mit Passwort anlegen. Gibt eine Fehlermeldung zurück oder null. */
  signUpWithPassword: (email: string, password: string) => Promise<string | null>;
  /** Mit Passwort anmelden. Gibt eine Fehlermeldung zurück oder null. */
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  /** Mit Passwort anmelden und ohne Konto eins anlegen. Gibt eine Fehlermeldung zurück oder null. */
  signInOrUpWithPassword: (email: string, password: string) => Promise<string | null>;
  /** true, wenn das Konto ein Passwort hat (Merker `has_password` in den Nutzer-Metadaten). */
  hasPassword: boolean;
  /** Passwort für das angemeldete Konto festlegen oder ändern. Gibt eine Fehlermeldung zurück oder null. */
  setPassword: (password: string) => Promise<string | null>;
  /** Schickt einen Code an die neue Adresse. Gibt eine Fehlermeldung zurück oder null. */
  requestEmailChange: (email: string) => Promise<string | null>;
  /** Prüft den Code der neuen Adresse und schließt den Wechsel ab. */
  confirmEmailChange: (email: string, code: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const SKIP_ONCE = 'skip-once';

const AuthContext = createContext<Auth | null>(null);

/** Supabase-Fehler in Kater-taugliches Deutsch übersetzen. */
export function authErrorText(error: AuthError): string {
  switch (error.code) {
    case 'otp_expired':
      return 'Der Code ist abgelaufen oder stimmt nicht. Lasse Dir einen neuen schicken.';
    case 'otp_disabled':
    case 'signup_disabled':
    case 'user_not_found':
      return 'Zu dieser Adresse gibt es noch kein Konto. Lasse Dir einen Code schicken.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Zu viele Codes auf einmal. Warte kurz und versuche es dann noch mal.';
    case 'email_address_invalid':
      return 'Diese E-Mail-Adresse klappt nicht. Prüfe sie bitte noch mal.';
    case 'invalid_credentials':
      return 'E-Mail oder Passwort stimmen nicht.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Zu dieser Adresse gibt es schon ein Konto. Melde Dich mit Code oder Passwort an.';
    case 'same_password':
      return 'Das ist schon Dein Passwort. Nimm ein anderes.';
    case 'reauthentication_needed':
      return 'Melde Dich bitte neu an und versuche es dann noch mal.';
    case 'weak_password':
      return 'Das Passwort ist zu schwach. Nimm mindestens 8 Zeichen.';
    case 'email_not_confirmed':
      return 'Diese Adresse ist noch nicht bestätigt. Schreibe uns, dann schalten wir Dich frei.';
    case 'user_banned':
      return 'Dieses Konto ist gesperrt. Schreibe uns, wenn Du Einspruch einlegen willst.';
  }
  if (error.status === 0 || /fetch|network/i.test(error.message)) {
    return 'Keine Verbindung. Prüfe Dein Internet und versuche es noch mal.';
  }
  return 'Da ist etwas schiefgegangen. Versuche es bitte noch mal.';
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
        let fromDb = await loadOwnProfile(userId);
        // Kein Profil in der Datenbank (sollte der Trigger anlegen): nachholen, sonst speichert die App ins Leere.
        if (!fromDb) {
          await ensureOwnProfile().catch(() => undefined);
          fromDb = await loadOwnProfile(userId);
        }
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
      signUpWithPassword: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { has_password: true } } });
        if (error) return authErrorText(error);
        // Ohne Sitzung verlangt Supabase noch eine Bestätigungsmail („Confirm email“ ist an).
        if (!data.session) return 'Konto angelegt, aber noch nicht freigeschaltet. Schreibe uns bitte.';
        return null;
      },
      signInWithPassword: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return authErrorText(error);
        // Ältere Passwort-Konten haben den Merker noch nicht.
        if (!data.user.user_metadata?.has_password) {
          await supabase.auth.updateUser({ data: { has_password: true } });
        }
        return null;
      },
      signInOrUpWithPassword: async (email, password) => {
        // Ein Weg für alle (Daria, 24.10.2026): Erst anmelden. Klappt das nicht, gibt es entweder kein Konto
        // (dann anlegen) oder das Passwort stimmt nicht (dann meldet Supabase beim Anlegen „gibt es schon“).
        const signIn = await supabase.auth.signInWithPassword({ email, password });
        if (!signIn.error) {
          if (!signIn.data.user.user_metadata?.has_password) {
            await supabase.auth.updateUser({ data: { has_password: true } });
          }
          return null;
        }
        if (signIn.error.code !== 'invalid_credentials') return authErrorText(signIn.error);
        if (password.length < MIN_PASSWORD) {
          return t('E-Mail oder Passwort stimmen nicht. Ein neues Passwort braucht mindestens {MIN_PASSWORD} Zeichen.', { MIN_PASSWORD });
        }
        const signUp = await supabase.auth.signUp({ email, password, options: { data: { has_password: true } } });
        if (signUp.error) {
          if (signUp.error.code === 'user_already_exists' || signUp.error.code === 'email_exists') {
            return 'E-Mail oder Passwort stimmen nicht.';
          }
          return authErrorText(signUp.error);
        }
        if (!signUp.data.session) return 'Konto angelegt, aber noch nicht freigeschaltet. Schreibe uns bitte.';
        return null;
      },
      hasPassword: !!session?.user.user_metadata?.has_password,
      setPassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password, data: { has_password: true } });
        return error ? authErrorText(error) : null;
      },
      requestEmailChange: async (email) => {
        const { error } = await supabase.auth.updateUser({ email });
        return error ? authErrorText(error) : null;
      },
      confirmEmailChange: async (email, code) => {
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email_change' });
        if (error) return authErrorText(error);
        dispatch({ type: 'updateProfile', patch: { email } });
        return null;
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
