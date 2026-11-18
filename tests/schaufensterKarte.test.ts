import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { anfahrtLink, hatPunkt, karteEinbetten, karteGross } from '../api/_karte.mjs';

const laden = { name: 'Café Kiezblick', address: 'Merseburger Str. 1\n04177 Leipzig', lat: 51.33412345, lng: 12.33598765 };

describe('Karte und Anfahrt über OpenStreetMap', () => {
  it('erkennt gültige Punkte', () => {
    assert.equal(hatPunkt(laden), true);
    assert.equal(hatPunkt({ lat: null, lng: 12 }), false);
    assert.equal(hatPunkt({ lat: 0, lng: 0 }), false);
    assert.equal(hatPunkt({ lat: 91, lng: 12 }), false);
    assert.equal(hatPunkt(null), false);
  });

  it('führt die Anfahrt zum Punkt, ohne Punkt zur Adresse in einer Zeile', () => {
    assert.equal(anfahrtLink(laden), 'https://www.openstreetmap.org/directions?to=51.33412%2C12.33599');
    assert.equal(
      anfahrtLink({ address: 'Merseburger Str. 1\n04177 Leipzig' }),
      'https://www.openstreetmap.org/directions?to=Merseburger+Str.+1%2C+04177+Leipzig',
    );
  });

  it('bettet einen Ausschnitt mit Markierung ein', () => {
    const url = new URL(karteEinbetten(laden));
    assert.equal(url.origin + url.pathname, 'https://www.openstreetmap.org/export/embed.html');
    assert.equal(url.searchParams.get('marker'), '51.33412,12.33599');
    const [w, s, e, n] = url.searchParams.get('bbox')!.split(',').map(Number);
    assert.ok(w < laden.lng && laden.lng < e && s < laden.lat && laden.lat < n);
    assert.equal(karteGross(laden), 'https://www.openstreetmap.org/?mlat=51.33412&mlon=12.33599#map=17/51.33412/12.33599');
  });
});
