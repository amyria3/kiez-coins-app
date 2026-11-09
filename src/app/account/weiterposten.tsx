import { Redirect } from 'expo-router';

/**
 * Route `account/weiterposten`: Die verbundenen Konten stehen seit 2026-11-09 unter Dein Konto › Funktionen, je
 * Plattform mit Schalter (Daria). Alte Links führen dorthin.
 */
export default function CrosspostAccounts() {
  return <Redirect href="/account/features" />;
}
