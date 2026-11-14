import { useSyncExternalStore } from 'react';

import type { CalendarEvent } from './calendar';
import type { Reminder } from './reminders';
import type { ShowcaseEvent } from './showcase';

/**
 * Was die Routine gerade zeigt, für den Kalender im Feed-Kopf (Daria, 2026-11-14): Der Kalender liegt hinter den
 * Umschaltern und kommt beim Aufziehen hervor. Die Liste lädt `RoutineContent` und meldet sie hier.
 */
export type RoutineData = {
  list: Reminder[];
  events: CalendarEvent[];
  saved: (ShowcaseEvent & { showcase: string })[];
};

let current: RoutineData | null = null;
const listeners = new Set<() => void>();

export function publishRoutineData(data: RoutineData | null) {
  current = data;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useRoutineData(): RoutineData | null {
  return useSyncExternalStore(subscribe, () => current, () => current);
}

/** Kalender im Feed-Kopf offen: Dann tritt der Kater in der Liste zur Seite (Daria, 2026-11-14) */
let calendarShown = false;
const calendarListeners = new Set<() => void>();
export function setCalendarShown(on: boolean) {
  if (calendarShown === on) return;
  calendarShown = on;
  calendarListeners.forEach((l) => l());
}
const subscribeCalendar = (l: () => void) => {
  calendarListeners.add(l);
  return () => {
    calendarListeners.delete(l);
  };
};
export function useCalendarShown(): boolean {
  return useSyncExternalStore(subscribeCalendar, () => calendarShown, () => calendarShown);
}

/** Ganzer Monat statt einer Woche (Daria, 2026-11-14): auch über dieselbe Bewegung wie das Aufklappen */
let calendarMonth = false;
const monthListeners = new Set<() => void>();
export function setCalendarMonth(on: boolean) {
  if (calendarMonth === on) return;
  calendarMonth = on;
  monthListeners.forEach((l) => l());
}
const subscribeMonth = (l: () => void) => {
  monthListeners.add(l);
  return () => {
    monthListeners.delete(l);
  };
};
export function useCalendarMonth(): boolean {
  return useSyncExternalStore(subscribeMonth, () => calendarMonth, () => calendarMonth);
}
