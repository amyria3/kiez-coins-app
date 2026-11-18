import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { cardMail, cleanSenderName, isEmail, qrTable } from '../supabase/functions/visitenkarte-mail/mail';

const qr = [
  [true, true, false],
  [false, true, false],
  [true, false, true],
];
const data = {
  name: 'Café <Kiezblick>',
  kiez: 'Lindenau',
  services: '- **UX/UI-Design**\n- Webdesign',
  email: 'hallo@kiezblick.de',
  links: ['https://kiezblick.de/', 'javascript:alert(1)'],
  url: 'https://kiezcoins.de/s/kiezblick',
  appUrl: 'https://app.kiezcoins.de/schaufenster/abc?folgen=1',
};

describe('Visitenkarte per Mail', () => {
  it('Vorname: nur Buchstaben, höchstens 30 Zeichen', () => {
    assert.equal(cleanSenderName(undefined), '');
    assert.equal(cleanSenderName('  Lena  '), 'Lena');
    assert.equal(cleanSenderName('Anne-Marie'), 'Anne-Marie');
    assert.equal(cleanSenderName('Zoë'), 'Zoë');
    assert.equal(cleanSenderName('Gewinn auf www.spam.de'), null);
    assert.equal(cleanSenderName('<b>Lena</b>'), null);
    assert.equal(cleanSenderName('a'.repeat(31)), null);
    assert.equal(cleanSenderName(42), null);
  });

  it('Mail-Adressen', () => {
    assert.ok(isEmail('name@beispiel.de'));
    assert.ok(!isEmail('name@beispiel'));
    assert.ok(!isEmail('a b@c.de'));
  });

  it('Instant-Code fasst gleichfarbige Module zusammen', () => {
    const html = qrTable(qr, 4);
    // erste Zeile: zwei dunkle Module als eine Zelle, dann ein helles
    assert.match(html, /colspan="2" width="8" height="4" bgcolor="#000027"/);
    assert.equal((html.match(/<tr>/g) ?? []).length, 4);
  });

  it('Name wird maskiert, unsichere Links fallen weg', () => {
    const mail = cardMail(data, qr, 'Lena');
    assert.equal(mail.subject, 'Schaufenster und Visitenkarte von Café <Kiezblick>');
    assert.ok(mail.html.includes('Café &lt;Kiezblick&gt;'));
    assert.ok(!mail.html.includes('<Kiezblick>'));
    assert.ok(!mail.html.includes('javascript:'));
    assert.ok(mail.html.includes('href="https://kiezcoins.de/s/kiezblick"'));
    assert.ok(mail.html.includes('Lena schickt Dir die Links zum Schaufenster'));
    assert.ok(mail.html.includes('Tritt der Community bei und abonniere das Schaufenster von'));
    assert.ok(mail.html.includes('href="https://app.kiezcoins.de/schaufenster/abc?folgen=1"'));
    assert.ok(mail.html.includes('Hier sind das'));
    assert.ok(mail.text.includes('https://app.kiezcoins.de/schaufenster/abc?folgen=1'));
    assert.ok(mail.html.includes('· UX/UI-Design'));
    assert.ok(mail.text.includes('Schaufenster ansehen: https://kiezcoins.de/s/kiezblick'));
  });

  it('ohne Vornamen und ohne Rückseite', () => {
    const mail = cardMail({ name: 'Paul', links: [], url: 'https://kiezcoins.de/s/paul' }, qr, '');
    assert.ok(mail.html.includes('Hier sind das'));
    assert.ok(!mail.html.includes('Tritt der Community bei'));
    assert.ok(!mail.html.includes(`bgcolor="#2B2B57"`));
  });

  it('bleibt unter der Grenze, ab der Gmail kürzt', () => {
    const big = Array.from({ length: 33 }, (_, r) => Array.from({ length: 33 }, (_, c) => (r * 7 + c * 3) % 2 === 0));
    assert.ok(cardMail(data, big, 'Lena').html.length < 100_000);
  });
});
