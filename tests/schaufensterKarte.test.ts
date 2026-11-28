import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { anfahrtLink, hatPunkt, KARTE_B, KARTE_H, karteEinbetten, karteGross, kartenKacheln } from '../api/_karte.mjs';

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

  it('setzt das Kartenbild aus Kacheln zusammen, der Punkt liegt in der Mitte', () => {
    const kacheln = kartenKacheln(laden);
    // 680 × 340 braucht drei bis vier Kacheln nebeneinander und zwei bis drei übereinander
    assert.ok(kacheln.length >= 6 && kacheln.length <= 12);
    // Die Kacheln decken das ganze Bild ab
    assert.ok(kacheln.some((k) => k.links <= 0 && k.oben <= 0));
    assert.ok(kacheln.some((k) => k.links + 256 >= KARTE_B && k.oben + 256 >= KARTE_H));
    // Der Punkt liegt in der Kachel, die die Bildmitte enthält, an der richtigen Stelle
    const z = 17;
    const welt = 2 ** z * 256;
    const px = ((laden.lng + 180) / 360) * welt;
    const rad = (laden.lat * Math.PI) / 180;
    const py = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * welt;
    const mitte = kacheln.find((k) => k.links <= KARTE_B / 2 && KARTE_B / 2 < k.links + 256 && k.oben <= KARTE_H / 2 && KARTE_H / 2 < k.oben + 256)!;
    assert.equal(mitte.x, Math.floor(px / 256));
    assert.equal(mitte.y, Math.floor(py / 256));
    assert.ok(Math.abs(mitte.links + (px - mitte.x * 256) - KARTE_B / 2) <= 1);
    assert.ok(Math.abs(mitte.oben + (py - mitte.y * 256) - KARTE_H / 2) <= 1);
  });
});
