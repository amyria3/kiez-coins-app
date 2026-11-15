import { color, space } from '../../theme/tokens';

/** Farben und Maße der Routine (aus RoutineList.tsx, 2026-11-15). Ohne Abhängigkeiten, damit styles.ts sie beim Laden schon hat. */
/** Kartenfarben (Daria, 2026-11-12): Senf, Olive hell, Puder, als Rollen in tokens.ts (color.routine) */
export const MUSTARD = color.routine.task;
export const OLIVE = color.routine.fixed;
export const POWDER = color.routine.saved;
/** Schrift und Buttons auf den Karten */
export const INK = color.routine.ink;
export const INK_SOFT = color.routine.inkSoft;
export const INK_TRACK = color.routine.inkTrack;
/** Kalender: Tage ohne Eintrag und die Schraffur für ausgefallene */
export const DAY = color.routine.day;
export const HATCH = color.routine.hatch;
export const CARD_MIN = 260;
export const CARD_MAX = 480;
export const GUTTER = space[20];
/**
 * Karten anheben und ziehen (Daria, 2026-11-13): Kurz halten hebt die Karte an wie einen Zettel. Dann nach rechts
 * ziehen erledigt, nach links abbrechen, nach oben später. Normales Wischen blättert weiter durch die Karten.
 * Vorher ging Wischen nur bei der einzigen Karte einer Gruppe, und langes Drücken brach ab.
 */
export const DRAG_AT = 88;
/** Nach oben folgt die Karte nur zu diesem Teil dem Finger */
export const UP_FACTOR = 0.4;
/** Platz über der Reihe, in den die Karte beim Anheben und Hochziehen ragen darf, ohne abgeschnitten zu werden */
export const UP_ROOM = 52;
export const LIFT_MS = 350;
