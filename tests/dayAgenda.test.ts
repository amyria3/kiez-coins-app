import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { dayAgenda } from '../src/data/dayAgenda';
import { dateIssue, datePartial, parseDate } from '../src/data/reminderDates';

// Mittwoch, 2026-11-18, 10:00 Ortszeit
const NOW = new Date(2026, 10, 18, 10, 0);

describe('Datum wie getippt (2026-11-26)', () => {
  it('2.12, 2.12., 02.12., 2.12.2026 sind der 2. Dezember', () => {
    for (const v of ['2.12', '2.12.', '02.12.', '2.12.2026', '2.12.26', '2,12', '2/12'])
      assert.equal(parseDate(v, NOW), '2026-12-02', v);
  });
  it('ohne Jahr und schon vorbei: nächstes Jahr', () => assert.equal(parseDate('2.1', NOW), '2027-01-02'));
  it('Meldungen: vorbei, unverständlich, keine', () => {
    assert.equal(dateIssue('2.1.2026', NOW), 'past');
    assert.equal(dateIssue('32.12', NOW), 'format');
    assert.equal(dateIssue('Dienstag', NOW), 'format');
    assert.equal(dateIssue('2.12', NOW), null);
    assert.equal(dateIssue('', NOW), null);
  });
  it('unfertige Eingaben erkennt datePartial', () => {
    for (const v of ['2', '2.', '2.1', '2.12.20']) assert.ok(datePartial(v), v);
    assert.ok(!datePartial('2.12.2026x'));
  });
});

describe('Was an einem Tag ansteht', () => {
  const list = [
    { id: 'a', want: 'zahnarzt', onDate: '2026-12-02', atTime: '10:00' },
    { id: 'b', want: 'steuer abgeben', onDate: '2026-12-02', untilTime: '18:00' },
    { id: 'c', want: 'joggen', weekdays: [3] },
    { id: 'd', want: 'chor', weekdays: [3], atTime: '9:30' },
    { id: 'e', want: 'anderer Tag', onDate: '2026-12-03', atTime: '8:00' },
    { id: 'f', want: 'frist', onDate: '2026-12-02', untilTime: '23:59' },
  ];
  const events = [
    { title: 'Team', start: new Date(2026, 11, 2, 14, 0).toISOString(), allDay: false },
    { title: 'Feiertag', start: '2026-12-02', allDay: true },
  ];
  const saved = [
    { title: 'Lesung', startsAt: new Date(2026, 11, 2, 19, 0).toISOString() },
    { title: 'Abgesagt', startsAt: new Date(2026, 11, 2, 20, 0).toISOString(), cancelled: true },
  ];
  it('Termine mit Uhrzeit sortiert, Rest ohne Uhrzeit', () => {
    const a = dayAgenda('2026-12-02', { list, events, saved });
    assert.deepEqual(
      a.timed.map((e) => `${e.until ? 'bis ' : ''}${e.time} ${e.title}`),
      ['9:30 Chor', '10:00 Zahnarzt', '14:00 Team', 'bis 18:00 Steuer abgeben', '19:00 Lesung'],
    );
    assert.deepEqual(a.untimed, ['Feiertag', 'Joggen', 'Frist']);
  });
  it('bearbeitete Erinnerung zählt nicht mit', () =>
    assert.ok(!dayAgenda('2026-12-02', { list, events: [], saved: [] }, 'a').timed.some((e) => e.title === 'Zahnarzt')));
  it('leerer Tag', () => assert.deepEqual(dayAgenda('2026-12-04', { list, events, saved }), { timed: [], untimed: [] }));
});
