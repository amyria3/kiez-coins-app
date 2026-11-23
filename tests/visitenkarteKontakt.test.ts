import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { karteQrLink, sauber, serviceListe, vcard, visitenkarteAnsicht } from '../api/_visitenkarte.mjs';

const jetzt = new Date('2026-11-23T10:00:00Z');
const schaufenster = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Lindenhof Werkstatt; Café',
  slug: 'lindenhof-werkstatt',
  kiez: 'Connewitz',
  address: 'Bornaische Str. 12\n04277 Leipzig',
  email: 'hallo@lindenhof.example',
  links: ['https://lindenhof.example', 'http://unsicher.example'],
  services: '- **Reparatur**\n- Werkzeugverleih',
  opening_hours: 'Di–Sa 10–18 Uhr',
};

describe('Kontakt als vCard', () => {
  it('enthält Name, Adresse, Mail, Links und die Begegnung in der Notiz', () => {
    const v = vcard(schaufenster, { ort: 'Flohmarkt am Kanal', notiz: 'Bremsen nachstellen' }, jetzt);
    assert.match(v, /^BEGIN:VCARD\r\nVERSION:3\.0\r\n/);
    assert.match(v, /\r\nFN:Lindenhof Werkstatt\\; Café\r\n/);
    assert.match(v, /\r\nADR;TYPE=WORK:;;Bornaische Str\. 12\\, 04277 Leipzig;;;;\r\n/);
    assert.match(v, /\r\nEMAIL;TYPE=WORK:hallo@lindenhof\.example\r\n/);
    assert.match(v, /\r\nURL;TYPE=WORK:https:\/\/lindenhof\.example\r\n/);
    assert.ok(!v.includes('unsicher.example'));
    // Gefaltete Zeilen wieder zusammensetzen (RFC 6350, 3.2)
    const notiz = v.replace(/\r\n /g, '').split('\r\n').find((z) => z.startsWith('NOTE:')) ?? '';
    assert.ok(notiz.includes('Kennengelernt am 23.11.2026 bei Flohmarkt am Kanal.'));
    assert.ok(notiz.includes('Bremsen nachstellen'));
    assert.ok(v.endsWith('END:VCARD\r\n'));
  });

  it('ohne Ort nennt die Notiz nur das Datum', () => {
    const v = vcard(schaufenster, {}, jetzt);
    assert.ok(v.includes('Gespeichert am 23.11.2026.'));
    assert.ok(!v.includes('Kennengelernt'));
  });

  it('faltet lange Zeilen auf höchstens 70 Zeichen', () => {
    const v = vcard(schaufenster, { notiz: 'x'.repeat(400) }, jetzt);
    for (const z of v.split('\r\n')) assert.ok(Array.from(z).length <= 71, z);
  });

  it('kürzt Freitext und entfernt Steuerzeichen', () => {
    assert.equal(sauber('a\u0000b\tc', 10), 'a b c');
    assert.equal(sauber('x'.repeat(200), 120).length, 120);
  });
});

describe('Visitenkarten-Ansicht', () => {
  it('listet Services ohne Auszeichnung', () => {
    assert.deepEqual(serviceListe(schaufenster.services), ['Reparatur', 'Werkzeugverleih']);
  });

  it('fragt nur nach dem Ort, wenn die Person über die Karte kam', () => {
    const opts = { logo: null, kater: '', mailFunktion: 'https://x', schluessel: 'k' };
    assert.ok(visitenkarteAnsicht(schaufenster, { ...opts, via: 'karte' }).includes('Wo habt Ihr Euch getroffen?'));
    assert.ok(!visitenkarteAnsicht(schaufenster, { ...opts, via: undefined }).includes('Wo habt Ihr Euch getroffen?'));
  });

  it('Kontakt schicken und tauschen nur nach dem Instant-Code und mit Kontakt-Mail', () => {
    const opts = { logo: null, kater: '', mailFunktion: 'https://x', schluessel: 'k' };
    const karte = visitenkarteAnsicht(schaufenster, { ...opts, via: 'karte' });
    assert.ok(karte.includes('Deinen Kontakt schicken'));
    assert.ok(karte.includes('Kontakte tauschen'));
    assert.ok(karte.includes('name="einwilligung" required'));
    assert.ok(!visitenkarteAnsicht(schaufenster, { ...opts, via: undefined }).includes('Deinen Kontakt schicken'));
    assert.ok(!visitenkarteAnsicht({ ...schaufenster, email: '' }, { ...opts, via: 'karte' }).includes('vk-p-tauschen'));
  });

  it('der Instant-Code führt zur Ansicht mit Kennung der Karte', () => {
    assert.equal(karteQrLink('lindenhof-werkstatt'), 'https://kiezcoins.de/s/lindenhof-werkstatt/visitenkarte?via=karte');
  });
});

describe('Ort und Linkvorschau der Visitenkarte', () => {
  it('Ort als „Kiez, Stadt“, die Stadt aus der Adresse', async () => {
    const { ortZeile } = await import('../api/_visitenkarte.mjs');
    assert.equal(ortZeile(schaufenster), 'Connewitz, Leipzig');
    assert.equal(ortZeile({ kiez: 'Lindenau' }), 'Lindenau');
    assert.equal(ortZeile({ kiez: '', address: 'Hauptstr. 1, 10115 Berlin' }), 'Berlin');
    assert.equal(ortZeile({ kiez: 'Leipzig-Lindenau', address: '04177 Leipzig' }), 'Leipzig-Lindenau');
    assert.equal(ortZeile({ kiez: '04177', address: '04177 Leipzig' }), 'Leipzig');
    assert.ok(visitenkarteAnsicht(schaufenster, {}).includes('<div class="vk-kiez">Connewitz, Leipzig</div>'));
  });

  it('Text der Vorschau nennt Services und Ort', async () => {
    const { bildText } = await import('../api/_visitenkarte-bild.mjs');
    assert.equal(bildText({ name: 'X', kiez: 'Lindenau', services: '- A\n- **B**' }), 'A, B in Lindenau');
    assert.equal(bildText({ name: 'X', services: '- A\n- B\n- C\n- D' }), 'A, B, C …');
    assert.equal(bildText({ name: 'Maria' }), 'Visitenkarte von Maria auf KiezCoins');
  });
});
