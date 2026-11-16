import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { placeLabel, queryVariants } from '../src/data/placeLabel';

describe('Ort aus Vorschlag (2026-11-16)', () => {
  it('Park: Name, Ortsteil, Stadt', () =>
    assert.equal(placeLabel({ name: 'Richard-Wagner-Hain', district: 'Zentrum-West', city: 'Leipzig' }), 'Richard-Wagner-Hain, Zentrum-West, Leipzig'));
  it('Laden: Name, Straße, Postleitzahl und Stadt, ohne Ortsteil', () =>
    assert.equal(
      placeLabel({ name: 'Auentee', street: 'Engelsdorfer Straße', housenumber: '156', district: 'Mölkau', city: 'Leipzig', postcode: '04316' }),
      'Auentee, Engelsdorfer Straße 156, 04316 Leipzig',
    ));
  it('Straße ohne Namen, keine Dopplung', () =>
    assert.equal(placeLabel({ name: 'Leipzig', city: 'Leipzig', state: 'Sachsen' }), 'Leipzig'));
});

describe('Zusammengesetzte Ortsnamen (2026-11-16)', () => {
  it('„Wagnerhain“ sucht auch „Wagner hain“', () => assert.deepEqual(queryVariants('Wagnerhain'), ['Wagnerhain', 'Wagner hain']));
  it('mit Leerzeichen oder ohne Ortswort nur die Eingabe', () => {
    assert.deepEqual(queryVariants('Clara Zetkin Park'), ['Clara Zetkin Park']);
    assert.deepEqual(queryVariants('Auentee'), ['Auentee']);
  });
});
