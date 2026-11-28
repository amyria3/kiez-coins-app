import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import type { Reminder } from '../src/data/reminders';
import { isRelaxed, slackOf } from '../src/data/reminderDates';
import { eventOver, isUrgent, sortAgenda, sortByUrgency, titleTime } from '../src/data/urgency';

const NOW = new Date(2026, 10, 18, 10, 0);
const r = (id: string, patch: Partial<Reminder>): Reminder => ({ id, want: id, doneThisWeek: 0, doneToday: false, ...patch }) as Reminder;

describe('Dringlichkeit der Routine-Karten', () => {
  it('dringend: in höchstens einer Stunde fällig oder schon vorbei', () => {
    assert.equal(isUrgent(r('a', { onDate: '2026-11-18', atTime: '10:45' }), NOW, {}), true);
    assert.equal(isUrgent(r('b', { onDate: '2026-11-18', atTime: '9:00' }), NOW, {}), true);
    assert.equal(isUrgent(r('c', { onDate: '2026-11-18', atTime: '12:00' }), NOW, {}), false);
  });
  it('nicht dringend, wenn erledigt oder auf später geschoben', () => {
    assert.equal(isUrgent(r('a', { onDate: '2026-11-18', atTime: '10:30', doneToday: true }), NOW, {}), false);
    assert.equal(isUrgent(r('a', { onDate: '2026-11-18', atTime: '10:30' }), NOW, { a: NOW.getTime() + 60_000 }), false);
  });
  it('Reihenfolge: mit Zeit nach Zeit, dann ohne Zeit, dann später, dann ruhend', () => {
    const list = [
      r('ruht', { perWeek: 1, doneThisWeek: 1 }),
      r('ohneZeit', { perWeek: 3 }),
      r('spaeter', { onDate: '2026-11-18', atTime: '10:30' }),
      r('mittag', { onDate: '2026-11-18', atTime: '12:00' }),
      r('gleich', { onDate: '2026-11-18', atTime: '10:15' }),
    ];
    const order = sortByUrgency(list, NOW, { spaeter: NOW.getTime() + 3_600_000 }).map((x) => x.id);
    assert.deepEqual(order, ['gleich', 'mittag', 'ohneZeit', 'spaeter', 'ruht']);
  });
});

describe('Aufgaben mit Puffer in der Woche (2026-11-16)', () => {
  const SUN = new Date(2026, 10, 22, 10, 0);
  const THU = new Date(2026, 10, 19, 10, 0);
  it('1× pro Woche: Mittwoch hinten, Sonntag nicht mehr', () => {
    assert.equal(isRelaxed(r('a', { perWeek: 1 }), NOW), true);
    assert.equal(isRelaxed(r('a', { perWeek: 1 }), SUN), false);
  });
  it('3× pro Woche: Mittwoch noch zwei Tage Puffer, Donnerstag nicht mehr', () => {
    assert.equal(slackOf(r('b', { perWeek: 3 }), NOW), 2);
    assert.equal(isRelaxed(r('b', { perWeek: 3 }), NOW), true);
    assert.equal(isRelaxed(r('b', { perWeek: 3 }), THU), false);
  });
  it('Lieblingstag: bis dahin hinten, ab dann vorn', () => {
    assert.equal(isRelaxed(r('c', { perWeek: 1, preferredDay: 4 }), NOW), true);
    assert.equal(isRelaxed(r('c', { perWeek: 1, preferredDay: 4 }), THU), false);
    assert.equal(isRelaxed(r('c', { perWeek: 1, preferredDay: 3 }), NOW), false);
  });
  it('feste Tage und einmalige zählen nicht', () => {
    assert.equal(isRelaxed(r('d', { weekdays: [5] }), NOW), false);
    assert.equal(isRelaxed(r('e', { onDate: '2026-11-22' }), NOW), false);
  });
  it('Reihenfolge: offene ohne Uhrzeit vor Aufgaben mit viel Puffer, wenig Puffer zuerst', () => {
    const list = [r('locker1', { perWeek: 1 }), r('fest', { weekdays: [3] }), r('locker3', { perWeek: 3 })];
    assert.deepEqual(sortByUrgency(list, NOW, {}).map((x) => x.id), ['fest', 'locker3', 'locker1']);
  });
});

describe('Ausgesetzte Karten', () => {
  it('ruhen hinten und sind nicht dringend', () => {
    const skipped = r('weg', { weekdays: [3], atTime: '10:30', skippedToday: true, skippedThisWeek: 1 });
    assert.equal(isUrgent(skipped, NOW, {}), false);
    const order = sortByUrgency([skipped, r('offen', { perWeek: 3 })], NOW, {}).map((x) => x.id);
    assert.deepEqual(order, ['offen', 'weg']);
  });
});

describe('Reihenfolge der Termine (2026-11-27)', () => {
  const FRI = new Date(2026, 10, 27, 15, 0);
  it('erledigter Termin hinten, vergangener Kalendertermin vorn zum Hinausgleiten', () => {
    const toepfe = r('toepfe', { onDate: '2026-12-02', atTime: '14:00', doneToday: true, doneThisWeek: 1 });
    const offen = r('offen', { onDate: '2026-11-29', atTime: '10:00' });
    const heute = { id: 'heute', start: new Date(2026, 10, 27, 16, 0).toISOString(), allDay: false };
    const morgen = { id: 'morgen', start: '2026-11-28', allDay: true };
    const vorbei = { id: 'vorbei', start: new Date(2026, 10, 27, 9, 0).toISOString(), end: new Date(2026, 10, 27, 10, 0).toISOString(), allDay: false };
    const order = sortAgenda([toepfe, offen], [vorbei, heute, morgen], FRI, {}).map((x) => (x.kind === 'event' ? x.event.id : x.reminder.id));
    assert.deepEqual(order, ['vorbei', 'heute', 'morgen', 'offen', 'toepfe']);
  });
  it('Aufgaben: heute fällige ohne Uhrzeit vor Fristen an späteren Tagen', () => {
    const list = [
      r('frist', { onDate: '2026-12-01', untilTime: '18:00' }),
      r('montags', { weekdays: [1] }),
      r('heute', { weekdays: [5] }),
      r('heuteFrist', { onDate: '2026-11-27', untilTime: '18:00' }),
    ];
    assert.deepEqual(sortByUrgency(list, FRI, {}).map((x) => x.id), ['heuteFrist', 'heute', 'montags', 'frist']);
  });
});

describe('Vergangene Kalendertermine (2026-11-27)', () => {
  const day = (h: number, m = 0) => new Date(2026, 10, 27, h, m);
  it('Uhrzeit im Titel', () => {
    assert.equal(titleTime('Josef bei Polina um 16.00'), 16 * 60);
    assert.equal(titleTime('Treffen ab 9:30'), 9 * 60 + 30);
    assert.equal(titleTime('Arzt 14:15'), 14 * 60 + 15);
    assert.equal(titleTime('Chor 19 Uhr'), 19 * 60);
    assert.equal(titleTime('Abgabe am 02.12.'), null);
    assert.equal(titleTime('Geburtstag Polina'), null);
  });
  it('ganztägig mit Uhrzeit im Titel: vorbei eine Stunde danach', () => {
    const e = { start: '2026-11-27', allDay: true, title: 'Josef bei Polina um 16.00' };
    assert.equal(eventOver(e, day(16, 30)), false);
    assert.equal(eventOver(e, day(23, 44)), true);
  });
  it('ganztägig ohne Uhrzeit: bleibt den ganzen Tag', () => {
    assert.equal(eventOver({ start: '2026-11-27', allDay: true, title: 'Geburtstag Polina' }, day(23, 59)), false);
  });
  it('mit Uhrzeit: am Ende vorbei, ohne Ende nach einer Stunde', () => {
    const start = day(10).toISOString();
    assert.equal(eventOver({ start, end: day(12).toISOString(), allDay: false }, day(11)), false);
    assert.equal(eventOver({ start, end: day(12).toISOString(), allDay: false }, day(12)), true);
    assert.equal(eventOver({ start, allDay: false }, day(10, 30)), false);
    assert.equal(eventOver({ start, allDay: false }, day(11)), true);
  });
});
