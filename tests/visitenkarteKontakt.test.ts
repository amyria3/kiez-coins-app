import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { appVisitenkarte, karteQrLink, serviceListe, vcard, vorschauSeite } from '../api/_visitenkarte.mjs';
import { cleanText } from '../src/data/vcard.mjs';

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
    assert.equal(cleanText('a\u0000b\tc', 10), 'a b c');
    assert.equal(cleanText('x'.repeat(200), 120).length, 120);
  });
});

describe('Weiterleitung zur Karte in der Web-App', () => {
  it('listet Services ohne Auszeichnung', () => {
    assert.deepEqual(serviceListe(schaufenster.services), ['Reparatur', 'Werkzeugverleih']);
  });

  it('der QR-Code führt zur Ansicht mit Kennung der Karte', () => {
    assert.equal(karteQrLink('lindenhof-werkstatt'), 'https://kiezcoins.de/s/lindenhof-werkstatt/visitenkarte?via=karte');
  });

  it('nimmt Herkunft und Team-Kennung mit, sonst nichts', () => {
    assert.equal(appVisitenkarte('lindenhof-werkstatt'), 'https://app.kiezcoins.de/s/lindenhof-werkstatt/visitenkarte');
    assert.equal(
      appVisitenkarte('lindenhof-werkstatt', { via: 'karte', von: 'schaufenster', team: true }),
      'https://app.kiezcoins.de/s/lindenhof-werkstatt/visitenkarte?via=karte&von=schaufenster&als=team',
    );
    assert.equal(appVisitenkarte('lindenhof-werkstatt', { via: 'x', von: 'y' }), 'https://app.kiezcoins.de/s/lindenhof-werkstatt/visitenkarte');
  });

  it('Linkvorschau: Kopf, Bild und Weiterleitung, nicht in Suchmaschinen', () => {
    const ziel = appVisitenkarte('lindenhof-werkstatt', { via: 'karte' });
    const html = vorschauSeite(schaufenster, '<meta property="og:title" content="T">', ziel);
    assert.ok(html.includes('<meta property="og:title" content="T">'));
    assert.ok(html.includes(`content="0; url=${ziel}"`));
    assert.ok(html.includes('src="/s/lindenhof-werkstatt/visitenkarte.png"'));
    assert.ok(html.includes('<meta name="robots" content="noindex">'));
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
  });

  it('Text der Vorschau nennt Services und Ort', async () => {
    const { bildText } = await import('../api/_visitenkarte-bild.mjs');
    assert.equal(bildText({ name: 'X', kiez: 'Lindenau', services: '- A\n- **B**' }), 'A, B in Lindenau');
    assert.equal(bildText({ name: 'X', services: '- A\n- B\n- C\n- D' }), 'A, B, C …');
    assert.equal(bildText({ name: 'Maria' }), 'Digitale Visitenkarte von Maria auf KiezCoins');
  });
});

describe('Kontakt, Webseiten und soziale Netzwerke', () => {
  it('teilt Mail, Webseiten und Netzwerke auf und lässt http weg', async () => {
    const { contactGroups } = await import('../src/data/digitalCard.mjs');
    const g = contactGroups({
      email: ' hallo@lindenhof.example ',
      links: ['https://lindenhof.example', 'https://www.linkedin.com/in/maria-arkadieff', 'http://unsicher.example', 'https://instagram.com/lindenhof'],
    });
    assert.equal(g.email, 'hallo@lindenhof.example');
    assert.deepEqual(g.websites, ['https://lindenhof.example']);
    assert.deepEqual(g.social, ['https://www.linkedin.com/in/maria-arkadieff', 'https://instagram.com/lindenhof']);
  });
  it('nennt Netzwerk und @Name ohne Pfadteile wie /in/', async () => {
    const { socialLink } = await import('../src/data/digitalCard.mjs');
    assert.deepEqual(socialLink('https://www.linkedin.com/in/maria-arkadieff-4994033b0/'), { network: 'LinkedIn', handle: '@maria-arkadieff-4994033b0' });
    assert.deepEqual(socialLink('https://bsky.app/profile/kiez.bsky.social'), { network: 'Bluesky', handle: '@kiez.bsky.social' });
    assert.equal(socialLink('https://arkadieff.art'), null);
  });
});

describe('Telefon im Kontakt', () => {
  it('steht in der Gruppe Kontakt, als Link zum Anrufen und in der vCard', async () => {
    const { contactGroups, telLink } = await import('../src/data/digitalCard.mjs');
    assert.equal(contactGroups({ phone: '0341 123456', links: [] }).phone, '0341 123456');
    assert.equal(contactGroups({ phone: 'ruf an', links: [] }).phone, '');
    assert.equal(telLink('+49 (0)341 / 123-456'), 'tel:+49341123456');
    const v = vcard({ ...schaufenster, phone: '0341 123456' }, {}, jetzt);
    assert.match(v, /\r\nTEL;TYPE=WORK,VOICE:0341 123456\r\n/);
  });
});
