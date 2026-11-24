import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { cardMail, cleanMeetingPlace, cleanRecipientName, cleanSenderName, isEmail, qrTable } from '../supabase/functions/visitenkarte-mail/mail';

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
    assert.equal(mail.subject, 'Schaufenster und Digitale Visitenkarte von Café <Kiezblick>');
    assert.ok(mail.html.includes('Café &lt;Kiezblick&gt;'));
    assert.ok(!mail.html.includes('<Kiezblick>'));
    assert.ok(!mail.html.includes('javascript:'));
    assert.ok(mail.html.includes('href="https://kiezcoins.de/s/kiezblick"'));
    assert.ok(mail.html.includes('Lena sendet Dir die Links zum Schaufenster'));
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

describe('Begegnung, die das Team einträgt', () => {
  it('grüßt mit Vornamen und nennt Ort und Datum', () => {
    const mail = cardMail(data, qr, '', { name: 'Anna Berg', place: 'Flohmarkt am Kanal', date: '24.11.2026' });
    assert.match(mail.text, /^Ahoi Anna!\n/);
    assert.ok(mail.text.includes('Ihr habt Euch am 24.11.2026 getroffen: Flohmarkt am Kanal.'));
    assert.ok(mail.html.includes('Ahoi Anna!'));
  });
  it('lässt Links, Adressen und Zeichen außerhalb von Namen weg', () => {
    assert.equal(cleanMeetingPlace('Kauf hier: www.spam.example'), '');
    assert.equal(cleanMeetingPlace('schreib an a@b.de'), '');
    assert.equal(cleanMeetingPlace('Flohmarkt am Kanal'), 'Flohmarkt am Kanal');
    assert.equal(cleanRecipientName('Anna <b>'), '');
    assert.equal(cleanRecipientName("Dr. Anne-Marie O'Neil"), "Dr. Anne-Marie O'Neil");
  });
});

describe('Kopie der Nachricht und Karte an sich selbst', () => {
  it('Nachricht oder Frage: Kopie mit der Nachricht', () => {
    const mail = cardMail(data, qr, '', undefined, { copy: 'Habt Ihr am Samstag offen?\nDanke!' });
    assert.ok(mail.text.includes('Deine Nachricht an Café <Kiezblick> ist angekommen. Hier ist Deine Kopie:'));
    assert.ok(mail.text.includes('> Habt Ihr am Samstag offen?\n> Danke!'));
    assert.ok(mail.html.includes('Habt Ihr am Samstag offen?<br>Danke!'));
    assert.ok(!mail.html.includes('<Kiezblick>'));
  });
  it('An mich per Mail senden', () => {
    const mail = cardMail(data, qr, 'Lena', undefined, { self: true });
    assert.ok(mail.text.includes('Du hast Dir die Digitale Visitenkarte von Café <Kiezblick> per Mail gesendet.'));
  });
});

describe('Nachricht des Teams in der Mail', () => {
  it('steht eingerückt unter der Anrede', () => {
    const mail = cardMail(data, qr, '', { name: 'Anna', date: '24.11.2026', message: 'Schön, Dich kennenzulernen!\nBis bald' });
    assert.ok(mail.text.includes('> Schön, Dich kennenzulernen!\n> Bis bald'));
    assert.ok(mail.html.includes('Schön, Dich kennenzulernen!<br>Bis bald'));
  });
});
