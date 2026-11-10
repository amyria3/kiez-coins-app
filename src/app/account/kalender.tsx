import { Redirect } from 'expo-router';

/**
 * Alte Route `account/kalender`: Der Kalender steht jetzt unter Dein Konto › Funktionen wie die anderen Features
 * (Daria, 2026-11-10). Die Route bleibt für alte Links.
 */
export default function CalendarRedirect() {
  return <Redirect href="/account/features" />;
}
