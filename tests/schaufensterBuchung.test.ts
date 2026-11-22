import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { buchungsLink } from '../api/_buchung.mjs';

describe('Termin buchen im Schaufenster', () => {
  it('nimmt Links mit https://', () => {
    assert.equal(buchungsLink({ booking_url: 'https://cal.com/kiezblick' }), 'https://cal.com/kiezblick');
    assert.equal(buchungsLink({ booking_url: '  https://cal.com/kiezblick/30min ' }), 'https://cal.com/kiezblick/30min');
  });

  it('lässt unsichere, leere und zu lange Links weg', () => {
    assert.equal(buchungsLink({ booking_url: 'http://cal.com/kiezblick' }), null);
    assert.equal(buchungsLink({ booking_url: 'javascript:alert(1)' }), null);
    assert.equal(buchungsLink({ booking_url: '' }), null);
    assert.equal(buchungsLink({ booking_url: null }), null);
    assert.equal(buchungsLink(null), null);
    assert.equal(buchungsLink({ booking_url: `https://cal.com/${'x'.repeat(300)}` }), null);
  });
});
