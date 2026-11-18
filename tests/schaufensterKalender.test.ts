import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { hatTermine, icsFold, icsText, schaufensterKalender } from '../api/_kalender.mjs';

const jetzt = new Date('2026-11-18T12:00:00Z');
const schaufenster = {
  name: 'Café Kiezblick, Lindenau',
  slug: 'kiezblick',
  address: 'Merseburger Str. 1\n04177 Leipzig',
  about: 'Kaffee; Kuchen',
  entries: [
    { kind: 'post', id: 'p1', title: 'Neu', body: 'x' },
    { kind: 'event', id: 'e1', title: 'Lesung', body: 'Mit Tee', starts_at: '2026-11-20T18:00:00+00:00', ends_at: '2026-11-20T20:00:00+00:00', location: null, cancelled: false },
    { kind: 'event', id: 'e2', title: 'Flohmarkt', body: null, starts_at: '2026-11-22T09:00:00+00:00', ends_at: null, location: 'Hof', cancelled: true },
  ],
};

describe('Kalender-Abo eines Schaufensters', () => {
  const ics = schaufensterKalender(schaufenster, 'https://kiezcoins.de/s/kiezblick', jetzt);
  const zeilen = ics.split('\r\n');

  it('enthält nur Termine, keine Posts', () => {
    assert.equal(zeilen.filter((z: string) => z === 'BEGIN:VEVENT').length, 2);
    assert.ok(!ics.includes('p1@'));
  });

  it('schreibt Zeiten in UTC und ergänzt eine Stunde, wenn das Ende fehlt', () => {
    assert.ok(zeilen.includes('DTSTART:20261120T180000Z'));
    assert.ok(zeilen.includes('DTEND:20261120T200000Z'));
    assert.ok(zeilen.includes('DTSTART:20261122T090000Z'));
    assert.ok(zeilen.includes('DTEND:20261122T100000Z'));
  });

  it('nimmt die Adresse, wenn der Termin keinen Ort hat, und markiert Absagen', () => {
    assert.ok(zeilen.includes('LOCATION:Merseburger Str. 1\\n04177 Leipzig'));
    assert.ok(zeilen.includes('LOCATION:Hof'));
    assert.ok(zeilen.includes('STATUS:CANCELLED'));
    assert.ok(zeilen.includes('STATUS:CONFIRMED'));
  });

  it('maskiert Sonderzeichen im Namen', () => {
    assert.ok(zeilen.includes('X-WR-CALNAME:Café Kiezblick\\, Lindenau'));
    assert.equal(icsText('a;b,c\\d\ne'), 'a\\;b\\,c\\\\d\\ne');
  });

  it('endet mit CRLF und faltet lange Zeilen', () => {
    assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
    const lang = icsFold('X'.repeat(150));
    assert.deepEqual(lang.split('\r\n').map((z: string) => z.length), [70, 71, 11]);
  });

  it('zeigt das Abo nur mit Terminen', () => {
    assert.equal(hatTermine(schaufenster), true);
    assert.equal(hatTermine({ entries: [{ kind: 'post' }] }), false);
    assert.equal(hatTermine(null), false);
  });
});
