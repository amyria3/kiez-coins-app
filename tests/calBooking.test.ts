import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { calBookingId, calCancelUrl, canCancel, shortNoticeKind } from '../src/data/calBooking';

// Echte Form eines Cal.com-Eintrags in Google (2026-11-25), Namen und Adressen ersetzt
const DESCRIPTION =
  'What:\n30 Minuten Termin between A and B\n\nNeed to reschedule or cancel? https://cal.com/booking/hdB22dYFukCtFmGd6518bG?changes=true\n';

describe('Cal.com-Buchung erkennen', () => {
  it('liest die Nummer aus der UID', () => {
    assert.equal(calBookingId('hdB22dYFukCtFmGd6518bG@Cal.com', null), 'hdB22dYFukCtFmGd6518bG');
  });
  it('liest die Nummer aus der Beschreibung, wenn die UID fremd ist (z. B. Kopie im Handykalender)', () => {
    assert.equal(calBookingId('abc@google.com', DESCRIPTION), 'hdB22dYFukCtFmGd6518bG');
    assert.equal(calBookingId(null, 'Link: https://app.cal.com/booking/xyz123456?cancel=true'), 'xyz123456');
  });
  it('erkennt andere Termine nicht als Buchung', () => {
    assert.equal(calBookingId('calendly-1626055315', 'https://calendly.com/x'), undefined);
    assert.equal(calBookingId('123@google.com', 'Treffen bei cal.com.example.org/booking/abcdefg'), undefined);
    assert.equal(calBookingId(undefined, undefined), undefined);
  });
  it('öffnet nur die Absageseite auf cal.com', () => {
    assert.equal(calCancelUrl('hdB22dYFukCtFmGd6518bG'), 'https://cal.com/booking/hdB22dYFukCtFmGd6518bG?cancel=true');
  });
});

describe('Absagen anbieten', () => {
  const now = new Date('2026-11-25T14:30:00Z');
  const ev = (start: string, end?: string) => ({ start, end, allDay: false });

  it('bis zum Ende des Termins, danach nicht mehr', () => {
    assert.equal(canCancel(ev('2026-11-25T15:00:00Z', '2026-11-25T15:30:00Z'), now), true);
    assert.equal(canCancel(ev('2026-11-25T14:00:00Z', '2026-11-25T14:45:00Z'), now), true);
    assert.equal(canCancel(ev('2026-11-25T13:00:00Z', '2026-11-25T13:30:00Z'), now), false);
    assert.equal(canCancel({ start: '2026-11-25', allDay: true }, now), true);
    assert.equal(canCancel({ start: '2026-11-24', allDay: true }, now), false);
  });

  it('warnt unter 24 Stunden und wenn der Termin schon läuft', () => {
    assert.equal(shortNoticeKind(ev('2026-11-25T15:00:00Z'), now), 'soon');
    assert.equal(shortNoticeKind(ev('2026-11-26T14:00:00Z'), now), 'soon');
    assert.equal(shortNoticeKind(ev('2026-11-27T09:00:00Z'), now), undefined);
    assert.equal(shortNoticeKind(ev('2026-11-25T14:00:00Z'), now), 'running');
    assert.equal(shortNoticeKind({ start: '2026-11-25', allDay: true }, now), undefined);
  });
});
