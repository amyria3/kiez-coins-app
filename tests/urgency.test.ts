import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import type { Reminder } from '../src/data/reminders';
import { isUrgent, sortByUrgency } from '../src/data/urgency';

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
