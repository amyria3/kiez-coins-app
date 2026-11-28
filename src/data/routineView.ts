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
 * 0 zu, 1 nur der Kater mit seinem Gruß, 2 die Woche, 3 kurze Liste mit Terminen, 4 ganzer Monat. Dazwischen und den
 * Karten liegt eine Pille zum Schieben. Die Liste kommt nach der Woche (Daria, 2026-11-28: „Diese Ansicht NACH der
 * Ansicht mit den Wochen-Kreisen“), der Kater vor dem Kalender („first see good morning, THEN the stage 1 of the
 * overview calendar“).
 */
export type CalendarLevel = 0 | 1 | 2 | 3 | 4;
export const CALENDAR_TOP: CalendarLevel = 4;
let calendarLevel: CalendarLevel = 1;
const levelListeners = new Set<() => void>();
export function setCalendarLevel(level: number) {
  const next = Math.max(0, Math.min(CALENDAR_TOP, Math.round(level))) as CalendarLevel;
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
  setCalendarLevel(on ? CALENDAR_TOP : Math.min(calendarLevel, 2));
}
export function useCalendarMonth(): boolean {
  return useCalendarLevel() === CALENDAR_TOP;
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

/**
 * Karte, zu der die Seite springen soll (Daria, 2026-11-28: „Tap auf einen Termin sollte zur Karte scrollen und die
 * Karte wählen“). Der Stapel des Tages holt sie nach vorn und meldet sie danach als erledigt.
 */
let focusCard: string | null = null;
const focusListeners = new Set<() => void>();
export function setFocusCard(key: string | null) {
  if (focusCard === key) return;
  focusCard = key;
  focusListeners.forEach((l) => l());
}
const subscribeFocus = (l: () => void) => {
  focusListeners.add(l);
  return () => {
    focusListeners.delete(l);
  };
};
export function useFocusCard(): string | null {
  return useSyncExternalStore(subscribeFocus, () => focusCard, () => focusCard);
}

/** Was der Kater über den gewählten Tag sagt: Die Liste rechnet es aus, die Stufen über dem Kalender zeigen es */
let katerLine = '';
const katerListeners = new Set<() => void>();
export function setKaterLine(line: string) {
  if (katerLine === line) return;
  katerLine = line;
  katerListeners.forEach((l) => l());
}
const subscribeKater = (l: () => void) => {
  katerListeners.add(l);
  return () => {
    katerListeners.delete(l);
  };
};
export function useKaterLine(): string {
  return useSyncExternalStore(subscribeKater, () => katerLine, () => katerLine);
}

/**
 * Ausgeklappte Karte (Daria, 2026-11-28: „Wenn ich die Karte ausklappe: Katze oben ausgeblendet, dafür Katze auf der
 * Karte und eine Aufdröselung des Fortschritts“). Höchstens eine zur Zeit; solange eine offen ist, schweigt der Kater
 * über dem Kalender.
 */
let expandedCard: string | null = null;
const expandedListeners = new Set<() => void>();
export function setExpandedCard(key: string | null) {
  if (expandedCard === key) return;
  expandedCard = key;
  expandedListeners.forEach((l) => l());
}
export const getExpandedCard = () => expandedCard;
const subscribeExpanded = (l: () => void) => {
  expandedListeners.add(l);
  return () => {
    expandedListeners.delete(l);
  };
};
export function useExpandedCard(): string | null {
  return useSyncExternalStore(subscribeExpanded, () => expandedCard, () => expandedCard);
}
