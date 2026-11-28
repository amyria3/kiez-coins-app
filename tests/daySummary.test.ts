import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { daySummary } from '../src/data/daySummary';

const tr = (s: string, vars?: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? ''));

describe('Pille über dem Tagesstapel (2026-11-28)', () => {
  it('Vorhaben und drei Termine', () =>
    assert.equal(
      daySummary({ day: 'Heute', today: true, tasks: ['Tatum anrufen', 'Klavier spielen', '5 min Yoga'], dates: 3 }, tr),
      'Du hast Dir vorgenommen: Tatum anrufen, Klavier spielen und 5 min Yoga. Du hast heute außerdem ganze 3 Termine. WTF.',
    ));
  it('nur Termine', () => assert.equal(daySummary({ day: 'Heute', today: true, tasks: [], dates: 1 }, tr), 'Du hast heute einen Termin.'));
  it('ein Vorhaben, keine Termine', () =>
    assert.equal(daySummary({ day: 'Heute', today: true, tasks: ['Yoga'], dates: 0 }, tr), 'Du hast Dir vorgenommen: Yoga.'));
  it('heute nichts offen: leer', () => assert.equal(daySummary({ day: 'Heute', today: true, tasks: [], dates: 0 }, tr), ''));
  it('morgen und später', () => {
    assert.equal(daySummary({ day: 'Morgen', today: false, tasks: [], dates: 2 }, tr), 'Morgen hast Du zwei Termine.');
    assert.equal(daySummary({ day: 'Mo, 30.11.', today: false, tasks: [], dates: 4 }, tr), 'Am Mo, 30.11. hast Du ganze 4 Termine. WTF.');
    assert.equal(daySummary({ day: 'Mo, 30.11.', today: false, tasks: [], dates: 0 }, tr), 'Am Mo, 30.11. steht noch nichts an.');
  });
  it('vergangener Tag: geschafft und ausgefallen', () => {
    assert.equal(
      daySummary({ day: 'Mi, 25.11.', today: false, tasks: [], dates: 0, past: { done: ['Klavier', 'Yoga'], missed: ['Tatum anrufen'] } }, tr),
      'Am Mi, 25.11. hast Du geschafft: Klavier und Yoga. Ausgefallen: Tatum anrufen.',
    );
    assert.equal(daySummary({ day: 'Mi, 25.11.', today: false, tasks: [], dates: 0, past: { done: [], missed: [] } }, tr), 'Am Mi, 25.11. stand nichts an.');
  });
});
