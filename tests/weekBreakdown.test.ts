import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { weekBreakdown } from '../src/data/reminderDates';

// Samstag, 28.11.2026; die Woche beginnt am Montag, 23.11.
const now = new Date(2026, 10, 28, 11, 0);
const states = (r: Parameters<typeof weekBreakdown>[0], done: string[] = [], skipped: string[] = []) =>
  weekBreakdown(r, new Set(done), new Set(skipped), now).map((d) => d.state);

describe('Woche auf der ausgeklappten Karte (2026-11-28)', () => {
  it('feste Tage: verpasst, erledigt, ausgesetzt, heute, kommt noch, frei', () =>
    assert.deepEqual(states({ weekdays: [1, 2, 3, 6, 7], doneToday: false }, ['2026-11-24'], ['2026-11-25']), [
      'missed',
      'done',
      'skipped',
      'free',
      'free',
      'today',
      'coming',
    ]));
  it('x-mal pro Woche: vergangene Tage ohne Strich sind frei, nicht verpasst', () =>
    assert.deepEqual(states({ doneToday: true }, ['2026-11-23']), ['done', 'free', 'free', 'free', 'free', 'done', 'coming']));
  it('heute ausgesetzt zählt auch ohne Eintrag', () => assert.equal(states({ skippedToday: true, doneToday: false })[5], 'skipped'));
});
