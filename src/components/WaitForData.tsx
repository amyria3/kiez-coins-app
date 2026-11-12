import type { ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';

import { useStore } from '../data/store';
import { useGoBack } from '../lib/goBack';
import { color } from '../theme/tokens';
import { SubScreen } from './Screen';

/**
 * true, sobald frische Daten vom Server da sind (oder klar ist, dass sie nicht kommen: offline, Fehler, Demo).
 * Vorher stehen im Store nur der Startspeicher (vom letzten App-Start, evtl. veraltet) oder gar nichts.
 */
export function useDataReady(): boolean {
  const { fresh, feedState, mode } = useStore();
  return mode === 'demo' || fresh || feedState === 'offline' || feedState === 'error';
}

/**
 * Formulare, die ihre Startwerte einmal aus einem Beitrag oder Entwurf übernehmen, warten hiermit auf frische Daten
 * (Prüfung 12.11.2026). Nach einem Neuladen oder über einen direkten Link starteten sie sonst leer oder mit einem
 * alten Stand, und Speichern überschrieb damit den echten Beitrag (Beschreibung weg, Bounty weg, privat wurde öffentlich).
 * `skip`: Formular braucht keine geladenen Daten (z. B. ganz neuer Beitrag ohne Entwurf).
 */
export function WaitForData({
  title,
  navigation = 'close',
  skip = false,
  children,
}: {
  title: string;
  navigation?: 'close' | 'back';
  skip?: boolean;
  children: ReactNode;
}) {
  const ready = useDataReady();
  const goBack = useGoBack();
  if (skip || ready) return <>{children}</>;
  return (
    <SubScreen title={title} navigation={navigation} onLeadingPress={goBack}>
      <ActivityIndicator color={color.text.secondary} />
    </SubScreen>
  );
}
