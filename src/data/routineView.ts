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

/**
 * Kalender als Teil der Seite in Stufen (Daria, 2026-11-28: „Statt Overlay ist der Kalender ein Teil des Screens“):
 * 0 zu, 1 kurze Liste mit Terminen, 2 nur die Woche, 3 ganzer Monat. Dazwischen und den Karten liegt eine Pille zum
 * Schieben.
 */
export type CalendarLevel = 0 | 1 | 2 | 3;
let calendarLevel: CalendarLevel = 1;
const levelListeners = new Set<() => void>();
export function setCalendarLevel(level: number) {
  const next = Math.max(0, Math.min(3, Math.round(level))) as CalendarLevel;
  if (calendarLevel === next) return;
  calendarLevel = next;
  levelListeners.forEach((l) => l());
}
export const getCalendarLevel = () => calendarLevel;
const subscribeLevel = (l: () => void) => {
  levelListeners.add(l);
  return () => {
    levelListeners.delete(l);
  };
};
export function useCalendarLevel(): CalendarLevel {
  return useSyncExternalStore(subscribeLevel, () => calendarLevel, () => calendarLevel);
}

/** Ganzer Monat statt einer Woche (Daria, 2026-11-14), heute die oberste Stufe des Kalenders */
export function setCalendarMonth(on: boolean) {
  setCalendarLevel(on ? 3 : Math.min(calendarLevel, 2));
}
export function useCalendarMonth(): boolean {
  return useCalendarLevel() === 3;
}

/** Gewählter Tag: Kalender und Tagesstapel zeigen denselben (Daria, 2026-11-28: „Click auf den Tag öffnet den Tag“) */
let routineDay: string | null = null;
const dayListeners = new Set<() => void>();
export function setRoutineDay(day: string | null) {
  if (routineDay === day) return;
  routineDay = day;
  dayListeners.forEach((l) => l());
}
const subscribeDay = (l: () => void) => {
  dayListeners.add(l);
  return () => {
    dayListeners.delete(l);
  };
};
export function useRoutineDay(): string | null {
  return useSyncExternalStore(subscribeDay, () => routineDay, () => routineDay);
}
