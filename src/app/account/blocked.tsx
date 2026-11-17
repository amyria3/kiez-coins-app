import { Redirect } from 'expo-router';

/**
 * Route `account/blocked`: Blockierte Personen stehen seit 2026-11-17 im Reiter „Gesperrt“ der Kontakte
 * (components/BlockedList). Die Route bleibt für alte Links und leitet dorthin.
 */
export default function BlockedUsers() {
  return <Redirect href={{ pathname: '/account/friends', params: { reiter: 'gesperrt' } }} />;
}
