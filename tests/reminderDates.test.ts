import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { addDays, capitalize, dueAt, dueToday, goalOf, isoWeekday, kindOf, localDate, parseDate, routineLabel, weekStart } from '../src/data/reminderDates';
import type { Reminder } from '../src/data/reminders';

// Mittwoch, 2026-11-18, 10:00 Ortszeit
const NOW = new Date(2026, 10, 18, 10, 0);
const reminder = (patch: Partial<Reminder>): Reminder => ({ id: 'r', want: 'joggen gehen', doneThisWeek: 0, doneToday: false, ...patch }) as Reminder;

describe('Datum', () => {
  it('localDate schreibt JJJJ-MM-TT in Ortszeit', () => assert.equal(localDate(NOW), '2026-11-18'));
  it('addDays geht über Monatsgrenzen', () => assert.equal(localDate(addDays(14, NOW)), '2026-12-02'));
  it('isoWeekday: Montag 1 bis Sonntag 7', () => {
    assert.equal(isoWeekday(NOW), 3);
    assert.equal(isoWeekday(new Date(2026, 10, 22)), 7);
  });
  it('weekStart ist Montag 0:00', () => {
    const d = weekStart(NOW);
    assert.equal(localDate(d), '2026-11-16');
    assert.equal(d.getHours(), 0);
  });
});

describe('Art und Ziel', () => {
  it('„um“ ist ein Termin, „bis“ eine Aufgabe, wiederkehrend ohne Art', () => {
    assert.equal(kindOf({ onDate: '2026-11-20', atTime: '9:00' }), 'termin');
    assert.equal(kindOf({ onDate: '2026-11-20', untilTime: '9:00' }), 'aufgabe');
    assert.equal(kindOf({ onDate: '2026-11-20', atTime: '9:00', untilTime: '10:00' }), 'aufgabe');
    assert.equal(kindOf({}), undefined);
  });
  it('Ziel: einmalig 1, sonst x-mal pro Woche oder Anzahl fester Tage', () => {
    assert.equal(goalOf({ onDate: '2026-11-20', perWeek: 3 }), 1);
    assert.equal(goalOf({ perWeek: 3 }), 3);
    assert.equal(goalOf({ weekdays: [1, 3, 5] }), 3);
    assert.equal(goalOf({}), 1);
  });
});

describe('Fälligkeit', () => {
  it('feste Tage: heute fällig, wenn heute einer ist', () => {
    assert.equal(dueToday(reminder({ weekdays: [3] }), NOW), true);
    assert.equal(dueToday(reminder({ weekdays: [1] }), NOW), false);
    assert.equal(dueToday(reminder({ weekdays: [3], doneToday: true }), NOW), false);
  });
  it('x-mal pro Woche: fällig, bis das Ziel erreicht ist', () => {
    assert.equal(dueToday(reminder({ perWeek: 2, doneThisWeek: 1 }), NOW), true);
    assert.equal(dueToday(reminder({ perWeek: 2, doneThisWeek: 2 }), NOW), false);
  });
  it('dueAt: einmalig zum „bis“, sonst zum „um“', () => {
    assert.equal(dueAt(reminder({ onDate: '2026-11-20', atTime: '9:00', untilTime: '11:30' }), NOW)?.getTime(), new Date(2026, 10, 20, 11, 30).getTime());
    assert.equal(dueAt(reminder({ onDate: '2026-11-20', atTime: '9:00' }), NOW)?.getTime(), new Date(2026, 10, 20, 9, 0).getTime());
    assert.equal(dueAt(reminder({ onDate: '2026-11-20' }), NOW), null);
  });
  it('dueAt: feste Tage am nächsten dieser Tage, heute nur wenn noch offen', () => {
    assert.equal(dueAt(reminder({ weekdays: [3], atTime: '18:00' }), NOW)?.getTime(), new Date(2026, 10, 18, 18, 0).getTime());
    assert.equal(dueAt(reminder({ weekdays: [3], atTime: '18:00', doneToday: true }), NOW)?.getTime(), new Date(2026, 10, 25, 18, 0).getTime());
    assert.equal(dueAt(reminder({ perWeek: 3 }), NOW), null);
  });
  it('dueAt: feste Tage mit „bis“ zum „bis“ (2026-11-16)', () => {
    assert.equal(dueAt(reminder({ weekdays: [3, 5], untilTime: '10:30' }), NOW)?.getTime(), new Date(2026, 10, 18, 10, 30).getTime());
    assert.equal(dueAt(reminder({ weekdays: [3], atTime: '9:00', untilTime: '11:00' }), NOW)?.getTime(), new Date(2026, 10, 18, 11, 0).getTime());
  });
});

describe('Datum eingeben', () => {
  it('ohne Jahr: der nächste solche Tag', () => {
    assert.equal(parseDate('24.12', NOW), '2026-12-24');
    assert.equal(parseDate('24.12.', NOW), '2026-12-24');
    assert.equal(parseDate('1.3', NOW), '2027-03-01');
  });
  it('mit Jahr, zwei- oder vierstellig', () => {
    assert.equal(parseDate('24.12.26', NOW), '2026-12-24');
    assert.equal(parseDate('24.12.2027', NOW), '2027-12-24');
  });
  it('vergangene oder ungültige Tage ergeben null', () => {
    assert.equal(parseDate('1.1.2026', NOW), null);
    assert.equal(parseDate('31.2.2027', NOW), null);
    assert.equal(parseDate('morgen', NOW), null);
  });
  it('29.02. springt zum nächsten Schaltjahr', () => assert.equal(parseDate('29.2', NOW), '2028-02-29'));
});

describe('Markierung im Post', () => {
  it('großer Anfangsbuchstabe und Stand der Woche, höchstens das Ziel', () => {
    assert.equal(capitalize('joggen gehen'), 'Joggen gehen');
    assert.equal(routineLabel(reminder({ perWeek: 4, doneThisWeek: 1 })), 'Joggen gehen 2/4');
    assert.equal(routineLabel(reminder({ perWeek: 2, doneThisWeek: 5 })), 'Joggen gehen 2/2');
  });
});
