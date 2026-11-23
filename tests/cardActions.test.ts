import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { cardActionLabel, cardActions, cardOrigin } from '../src/data/cardActions.mjs';

const ids = (input: Parameters<typeof cardActions>[0]) => cardActions(input).map((a) => a.id);
const primary = (input: Parameters<typeof cardActions>[0]) => cardActions(input).find((a) => a.primary)?.id;

describe('Herkunft der Visitenkarte', () => {
  it('liest QR-Code der Karte, Schaufenster-Seite und Verwaltung aus der Adresse', () => {
    assert.equal(cardOrigin({ via: 'karte' }), 'card');
    assert.equal(cardOrigin({ via: 'karte', von: 'schaufenster' }), 'card');
    assert.equal(cardOrigin({ von: 'schaufenster' }), 'showcase');
    assert.equal(cardOrigin({ von: 'verwaltung' }), 'manage');
    assert.equal(cardOrigin({}), 'link');
    assert.equal(cardOrigin({ via: null, von: 'irgendwas' }), 'link');
  });
});

describe('Knöpfe der Visitenkarte', () => {
  it('Team: weitergeben und Kontakte von Hand, nichts zum Folgen oder Speichern', () => {
    assert.deepEqual(ids({ viewer: 'team', origin: 'manage', hasContactMail: true, canBefriend: true }), [
      'share',
      'qr',
      'addContact',
      'mail',
      'copyLink',
    ]);
    assert.equal(primary({ viewer: 'team', origin: 'manage' }), 'share');
  });

  it('Mitglied: Kontakt speichern zuerst, Kontakt schicken nur mit Kontakt-Mail', () => {
    assert.deepEqual(ids({ viewer: 'member', origin: 'showcase', hasContactMail: true }), [
      'saveContact',
      'share',
      'sendContact',
      'exchange',
      'qr',
      'mail',
      'follow',
      'showcase',
    ]);
    const without = ids({ viewer: 'member', origin: 'showcase', hasContactMail: false });
    assert.ok(!without.includes('sendContact') && !without.includes('exchange'));
  });

  it('Mitglied, das schon folgt, bekommt keinen Folgen-Knopf; Anfreunden nur, wenn möglich', () => {
    assert.ok(!ids({ viewer: 'member', origin: 'link', following: true }).includes('follow'));
    assert.ok(ids({ viewer: 'member', origin: 'link', canBefriend: true }).includes('befriend'));
    assert.ok(!ids({ viewer: 'member', origin: 'link' }).includes('befriend'));
  });

  it('Gast nach dem QR-Code der Karte: speichern zuerst, schicken und tauschen, kein QR-Code', () => {
    const list = ids({ viewer: 'guest', origin: 'card', hasContactMail: true });
    assert.equal(list[0], 'saveContact');
    assert.ok(list.includes('sendContact') && list.includes('exchange'));
    assert.ok(!list.includes('qr') && !list.includes('copyLink') && !list.includes('addContact'));
  });

  it('Gast über Link: Teilen zuerst, kein Kontakt schicken', () => {
    const list = ids({ viewer: 'guest', origin: 'link', hasContactMail: true });
    assert.equal(list[0], 'share');
    assert.ok(list.includes('saveContact') && list.includes('qr') && list.includes('follow'));
    assert.ok(!list.includes('sendContact') && !list.includes('exchange'));
  });

  it('genau ein Hauptknopf, nie doppelt', () => {
    for (const viewer of ['team', 'member', 'guest'] as const)
      for (const origin of ['card', 'link', 'showcase', 'manage'] as const) {
        const list = cardActions({ viewer, origin, hasContactMail: true, canBefriend: true });
        assert.equal(list.filter((a) => a.primary).length, 1, `${viewer}/${origin}`);
        assert.equal(new Set(list.map((a) => a.id)).size, list.length, `${viewer}/${origin}`);
      }
  });

  it('Kontakt speichern und Mail stehen beim Team hintereinander, Link kopieren zuletzt', () => {
    for (const origin of ['card', 'link', 'showcase', 'manage'] as const) {
      const list = ids({ viewer: 'team', origin, hasContactMail: true });
      assert.equal(list.indexOf('mail'), list.indexOf('addContact') + 1, origin);
      assert.equal(list.at(-1), 'copyLink', origin);
    }
    assert.equal(cardActionLabel('mail', { name: 'X', viewer: 'team', origin: 'manage' }), 'Nur per Mail schicken');
    assert.equal(cardActionLabel('mail', { name: 'X', viewer: 'guest', origin: 'link' }), 'Per Mail schicken');
  });

  it('setzt den Namen ein und nennt den Rückweg zum Schaufenster', () => {
    assert.equal(cardActionLabel('follow', { name: 'Café Kiezblick', viewer: 'guest', origin: 'link' }), 'Café Kiezblick in KiezCoins folgen');
    assert.equal(cardActionLabel('follow', { name: 'Café Kiezblick', viewer: 'member', origin: 'link' }), 'Café Kiezblick folgen');
    assert.equal(cardActionLabel('showcase', { name: 'X', viewer: 'guest', origin: 'showcase' }), 'Zurück zum Schaufenster');
    assert.equal(cardActionLabel('showcase', { name: 'X', viewer: 'guest', origin: 'link' }), 'Zum Schaufenster');
    assert.equal(cardActionLabel('qr', { name: 'X', viewer: 'team', origin: 'manage' }), 'QR-Code zeigen');
  });
});
