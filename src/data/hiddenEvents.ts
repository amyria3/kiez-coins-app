import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { eventDate, type CalendarEvent } from './calendar';
import { localDate } from './reminders';

/**
 * Importierte Termine einzeln ausblenden (Daria, 2026-11-14): Tippen auf die Karte › „Ausblenden“ oder nach links
 * ziehen. Der Termin verschwindet aus Routine und aus dem Kalender oben, im eigenen Kalender bleibt er. Gespeichert
 * auf diesem Gerät, je Termin mit seinem Tag; vergangene Einträge räumt das Laden weg. Unter Funktionen › Kalender
 * holt „Ausgeblendete Termine wieder zeigen“ alle zurück.
 */
const KEY = 'routine-ausgeblendet';
const EMPTY = new Set<string>();

let hidden: Record<string, string> = {};
let ids: Set<string> = EMPTY;
const listeners = new Set<() => void>();

function publish(next: Record<string, string>) {
  hidden = next;
  ids = new Set(Object.keys(next));
  listeners.forEach((l) => l());
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
}

AsyncStorage.getItem(KEY).then(
  (v) => {
    if (!v) return;
    const today = localDate();
    const kept = Object.fromEntries(Object.entries(JSON.parse(v) as Record<string, string>).filter(([, day]) => day >= today));
    publish({ ...kept, ...hidden });
  },
  () => {},
);

export function hideEvent(e: CalendarEvent) {
  publish({ ...hidden, [e.id]: eventDate(e) });
}

export function showHiddenEvents() {
  publish({});
}

/** ids der ausgeblendeten Termine */
export function useHiddenEvents(): Set<string> {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => ids,
    () => ids,
  );
}
