import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { contactFileName, contactVcard } from '../src/lib/contactCard';
import { contactMail } from '../supabase/functions/visitenkarte-mail/mail';

const now = new Date('2026-11-23T10:00:00Z');

describe('Kontakt von Hand eintragen', () => {
  it('baut eine vCard mit Name, Mail und Begegnung', () => {
    const v = contactVcard({ name: 'Jana Beispiel', email: 'jana@example.org', place: 'Flohmarkt; Kanal', note: 'Rennrad' }, now);
    assert.match(v, /^BEGIN:VCARD\r\nVERSION:3\.0\r\n/);
    assert.match(v, /\r\nN:Beispiel;Jana;;;\r\n/);
    assert.match(v, /\r\nFN:Jana Beispiel\r\n/);
    assert.match(v, /\r\nEMAIL:jana@example\.org\r\n/);
    assert.ok(v.replace(/\r\n /g, '').includes('NOTE:Kennengelernt am 23.11.2026 bei Flohmarkt\\; Kanal.\\nRennrad'));
    assert.ok(v.endsWith('END:VCARD\r\n'));
  });

  it('ohne Ort und Mail nur Name und Datum', () => {
    const v = contactVcard({ name: 'Jana' }, now);
    assert.ok(!v.includes('EMAIL'));
    assert.match(v, /\r\nN:Jana;;;;\r\n/);
    assert.ok(v.includes('NOTE:Kennengelernt am 23.11.2026.'));
  });

  it('Dateiname ohne Sonderzeichen', () => {
    assert.equal(contactFileName('Jana/Beispiel'), 'Jana Beispiel.vcf');
    assert.equal(contactFileName('  '), 'Kontakt.vcf');
  });
});

describe('Mail an das Team bei Kontakt über die Visitenkarte', () => {
  it('nennt die Angaben, maskiert HTML und sagt, ob die Karte rausging', () => {
    const m = contactMail('Lindenhof', 'https://kiezcoins.de/s/lindenhof', { name: 'Jana <b>', email: 'jana@example.org', place: 'Markt', cardSent: true }, '23.11.2026');
    assert.equal(m.subject, 'Neuer Kontakt über Deine Visitenkarte: Jana <b>');
    assert.ok(m.html.includes('Jana &lt;b&gt;'));
    assert.ok(!m.html.includes('<b>'));
    assert.ok(m.text.includes('Kennengelernt: am 23.11.2026 bei Markt'));
    assert.ok(m.text.includes('im selben Schritt Eure Visitenkarte'));
    assert.ok(!m.text.includes('Telefon'));
  });
});
