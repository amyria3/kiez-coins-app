import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { oeffnungszeiten } from '../api/_oeffnungszeiten.mjs';

type Spec = { dayOfWeek: string[]; opens: string; closes: string };
const kurz = (text: string) =>
  (oeffnungszeiten(text) as Spec[] | null)?.map((s) => `${s.dayOfWeek.map((d) => d.slice(0, 2)).join(',')} ${s.opens}-${s.closes}`);

describe('Öffnungszeiten für Google', () => {
  it('versteht Tagesbereiche mit Uhr', () => {
    assert.deepEqual(kurz('Mo–Fr 9–18 Uhr'), ['Mo,Tu,We,Th,Fr 09:00-18:00']);
    assert.deepEqual(kurz('Di-So: 10:00-18:30'), ['Tu,We,Th,Fr,Sa,Su 10:00-18:30']);
    assert.deepEqual(kurz('Montag bis Freitag 8.30 bis 17 Uhr'), ['Mo,Tu,We,Th,Fr 08:30-17:00']);
  });

  it('versteht mehrere Zeilen, Listen und Mittagspausen', () => {
    assert.deepEqual(kurz('Mo, Mi, Fr 8–12 und 14–18\nSa 10–14 Uhr\nSo geschlossen'), [
      'Mo,We,Fr 08:00-12:00',
      'Mo,We,Fr 14:00-18:00',
      'Sa 10:00-14:00',
    ]);
    assert.deepEqual(kurz('täglich 7–24 Uhr'), ['Mo,Tu,We,Th,Fr,Sa,Su 07:00-23:59']);
    assert.deepEqual(kurz('Fr–Mo 18–2'), ['Fr,Sa,Su,Mo 18:00-02:00']);
  });

  it('gibt bei unklaren Angaben nichts weiter', () => {
    assert.equal(oeffnungszeiten('Nach Vereinbarung'), null);
    assert.equal(oeffnungszeiten('Mo–Fr 9–18 Uhr\nan Feiertagen nach Absprache'), null);
    assert.equal(oeffnungszeiten('Mo 25–26'), null);
    assert.equal(oeffnungszeiten(''), null);
    assert.equal(oeffnungszeiten('So geschlossen'), null);
  });
});
