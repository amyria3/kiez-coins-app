import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { revealDelta, visibleSpan } from '../src/lib/reveal';

// Sichtbarer Bereich wie im Screenshot vom 2026-11-23: Kopfzeile bis 100, Tastatur ab 500
const visible = { top: 100, bottom: 500 };

describe('Aktives Feld über der Tastatur', () => {
  it('lässt alles stehen, wenn Feld und nächstes Feld mit Luft zu sehen sind', () => {
    assert.equal(revealDelta({ top: 200, bottom: 280 }, visible, { top: 296, bottom: 376 }), 0);
  });

  it('scrollt das Feld knapp über der Tastatur samt nächstem Feld nach oben', () => {
    // Feld endet 8 über der Tastatur (Screenshot), das nächste ist ganz verdeckt
    const delta = revealDelta({ top: 412, bottom: 492 }, visible, { top: 508, bottom: 588 });
    assert.equal(delta, 588 + 24 - 500);
  });

  it('holt ein Feld unter der Kopfzeile mit Luft nach unten', () => {
    assert.equal(revealDelta({ top: 90, bottom: 170 }, visible, { top: 186, bottom: 266 }), 90 - 24 - 100);
  });

  it('reicht das aktive Feld, wenn beide nicht hineinpassen', () => {
    // Nur 200 Platz: Feld 80 plus nächstes 80 plus Abstände passen nicht
    const small = { top: 100, bottom: 300 };
    assert.equal(revealDelta({ top: 280, bottom: 360 }, small, { top: 376, bottom: 456 }), 360 + 24 - 300);
  });

  it('zeigt den Anfang eines Felds, das höher ist als der Platz', () => {
    assert.equal(revealDelta({ top: 300, bottom: 900 }, visible), 300 - 24 - 100);
  });

  it('ignoriert ein „nächstes“ Feld, das gar nicht darunter liegt', () => {
    assert.equal(revealDelta({ top: 200, bottom: 280 }, visible, { top: 0, bottom: 80 }), 0);
  });
});

describe('Sichtbarer Bereich', () => {
  it('schneidet die Scrollfläche mit Tastatur und Statusleiste', () => {
    assert.deepEqual(visibleSpan({ top: -60, bottom: 700 }, { top: 47, bottom: 480 }), { top: 47, bottom: 480 });
    assert.deepEqual(visibleSpan({ top: 100, bottom: 400 }, { top: 0, bottom: 480 }), { top: 100, bottom: 400 });
  });
});
