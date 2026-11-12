import { useEffect, useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { scrollIntoView } from './Nudge';

/**
 * Sprungziel auf einer längeren Seite (Daria, 2026-11-12): Ein Knopf wie „Kalender verbinden“ öffnet die
 * Seite mit `?abschnitt=kalender`, und die Seite scrollt gleich zu diesem Abschnitt statt oben zu bleiben.
 *
 * Verwendung: `router.push({ pathname: '/account/features', params: { abschnitt: 'kalender' } })`
 * und auf der Zielseite `<Abschnitt id="kalender">…</Abschnitt>`.
 */
export function Abschnitt({ id, children }: { id: string; children: ReactNode }) {
  const { abschnitt } = useLocalSearchParams<{ abschnitt?: string }>();
  const ref = useRef<View>(null);
  const opened = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const active = abschnitt === id;

  useEffect(() => () => clearTimeout(timer.current), []);

  // Inhalte darüber laden oft nach und schieben den Abschnitt nach unten. Deshalb nach jedem neuen Layout
  // erneut zielen, aber nur in den ersten Sekunden, damit es später beim eigenen Scrollen nicht springt.
  const onLayout = () => {
    if (!active || Date.now() - opened.current > 2500) return;
    clearTimeout(timer.current);
    // Erst nach der Übergangsanimation messen, sonst stimmt die Lage noch nicht
    timer.current = setTimeout(() => scrollIntoView(ref.current), 350);
  };

  return (
    <View ref={ref} onLayout={onLayout} collapsable={false}>
      {children}
    </View>
  );
}
