import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { placeMenu } from '../src/lib/menuPlacement';

// iPhone hoch: 393 × 852, Statusleiste 59, Home-Balken 34
const phone = { windowWidth: 393, windowHeight: 852, insets: { top: 59, bottom: 34, left: 0, right: 0 } };
const screen = { x: 0, y: 0, w: 393, h: 852 };
const gear = (y: number) => ({ x: 330, y, w: 44, h: 44 });

describe('Zahnrad-Menü platzieren', () => {
  it('klappt nach unten, wenn es dort passt', () => {
    const p = placeMenu({ ...phone, anchor: gear(120), bounds: screen, menuHeight: 300 });
    assert.equal(p.above, false);
    assert.equal(p.top, 170);
    assert.equal(p.scroll, false);
  });
  it('klappt nach oben, wenn unten der Platz fehlt (Bild-Detail mit Blatt unten)', () => {
    const p = placeMenu({ ...phone, anchor: gear(700), bounds: screen, menuHeight: 300 });
    assert.equal(p.above, true);
    assert.equal(p.top, 700 - 6 - 300);
    assert.equal(p.scroll, false);
  });
  it('bleibt über dem Home-Balken', () => {
    const p = placeMenu({ ...phone, anchor: gear(560), bounds: screen, menuHeight: 200 });
    // Unten: 852 − 34 − 8 − 610 = 200 → passt genau
    assert.equal(p.above, false);
    assert.ok(p.top + 200 <= 852 - 34);
  });
  it('bleibt unter der Statusleiste und scrollt, wenn es nirgends ganz passt', () => {
    const p = placeMenu({ ...phone, anchor: gear(400), bounds: screen, menuHeight: 900 });
    assert.equal(p.scroll, true);
    assert.ok(p.top >= 59 + 8);
    assert.ok(p.top + p.maxHeight <= 852 - 34 - 8);
  });
  it('rechnet relativ zur Fläche, in der es liegt', () => {
    const p = placeMenu({ ...phone, anchor: gear(120), bounds: { x: 100, y: 50, w: 293, h: 802 }, menuHeight: 100 });
    assert.equal(p.top, 170 - 50);
    assert.equal(p.right, 393 - 374);
  });
  it('stößt rechts am Rand an statt überzulaufen', () => {
    const p = placeMenu({ ...phone, anchor: { x: 380, y: 100, w: 44, h: 44 }, bounds: screen, menuHeight: 100 });
    assert.equal(p.right, 8);
  });
});
