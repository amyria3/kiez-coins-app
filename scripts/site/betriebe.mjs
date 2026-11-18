// Seite /betriebe: Funktionen für kleine Betriebe mit Einrichtungszeit und je einem klickbaren Ablauf (Daria, 18.11.2026).
// scripts/build-download-site.mjs baut daraus /betriebe und /<sprache>/betriebe. Texte: t('Deutsch', 'English'),
// die übrigen Sprachen in scripts/site/sprachen/<code>.json mit dem deutschen Text als Schlüssel.
//
// Eine neue Funktion ist ein neuer Eintrag in `funktionen` unten. Ohne `schritte` zeigt das Telefon „Ablauf in Vorbereitung“.
// `stand: 'app'` heißt: in der App nutzbar. `stand: 'vorbereitung'`: Die App baut die Funktion gerade.
//
// Ein Schritt ist ein Bildschirm im Telefon: `bild` (HTML), `hinweis` (Satz über dem Telefon) und `ziel`, der Wert von
// data-tap des Elements, auf das man drückt. Der letzte Schritt hat kein Ziel, dort steht „Noch einmal ansehen“.
// Regeln für die Hinweise: Documentation, kiez-coins/design/Texte.md und UX_UI_Regeln.md (pulsierender lila Ring).

/**
 * @param {(de: string, en: string) => string} t Übersetzer der Seite
 * @param {(s: string) => string} esc HTML-Escape
 * @param {Record<string, string>} ic SVG-Icons in Textfarbe des Telefons: zurueck, zahnrad, kalender, pin, haken, extern
 */
export function betriebeFunktionen(t, esc, ic) {
  const laden = t('Café Kiezliebe', 'Café Kiezliebe');
  const ort = t('Neukölln · Mo–Sa 8–18 Uhr', 'Neukölln · Mon–Sat 8 am–6 pm');
  const termin = t('Flohmarkt im Hof', 'Flea market in the courtyard');
  const wann = t('Sa, 22.11. · 14–18 Uhr', 'Sat, Nov 22 · 2–6 pm');

  // Kopf eines App-Screens: Zurück-Pfeil, Titel, rechts optional ein Knopf
  const kopf = (titel, rechts = '') =>
    `<div class="b-kopf"><span class="b-icon">${ic.zurueck}</span><b>${esc(titel)}</b>${rechts || '<span class="b-icon"></span>'}</div>`;
  const statusleiste = `<div class="p-status" aria-hidden="true"><span>9:41</span><span class="p-island"></span><span class="p-battery"></span></div>`;
  const screen = (inhalt) => `${statusleiste}<div class="b-screen">${inhalt}</div>`;

  // Schaufenster-Kopf wie in der App: Titelbild, Logo, Name, Kiez und Öffnungszeiten
  const fensterKopf = `<div class="b-cover"><span class="b-markise"></span></div>
<div class="b-wer"><span class="b-logo">K</span><div><b>${esc(laden)}</b><small>${esc(ort)}</small></div></div>`;

  // Öffentliche Seite kiezcoins.de/s/<kurzname> im Browser, mit Kalender-Abo (api/s.mjs, PR #431 vom 18.11.2026)
  const browser = (inhalt) => `<div class="b-adresse">kiezcoins.de/s/cafe-kiezliebe</div>${inhalt}`;
  const terminKarte = `<div class="b-karte">
  <span class="b-art">${esc(t('Termin', 'Event'))}</span>
  <b>${esc(termin)}</b>
  <span class="b-datum">${esc(wann)}</span>
</div>`;

  return [
    {
      id: 'kalender',
      titel: t('Kalender-Abo für Deine Termine', 'Calendar subscription for your events'),
      text: t(
        'Deine Kundschaft abonniert Deine Termine mit einem Tipp. Jeder neue Termin aus Deinem Schaufenster erscheint danach von selbst in ihrem Kalender.',
        'Your customers subscribe to your events with one tap. Every new event from your shop window then appears in their calendar by itself.',
      ),
      zeit: t('Keine, das Abo startet mit Deinem ersten Termin', 'None, the subscription starts with your first event'),
      kosten: t('Kostenlos', 'Free'),
      stand: 'app',
      schritte: [
        {
          hinweis: t('Öffne Dein Schaufenster und tippe oben rechts auf das Zahnrad.', 'Open your shop window and tap the gear at the top right.'),
          ziel: 'zahnrad',
          bild: screen(`${kopf(t('Schaufenster', 'Shop window'), `<span class="b-icon" data-tap="zahnrad">${ic.zahnrad}</span>`)}
${fensterKopf}
<h4>${esc(t('Termine', 'Events'))}</h4>
<p class="b-leer">${esc(t('Noch keine Termine', 'No events yet'))}</p>`),
        },
        {
          hinweis: t('Wähle „Termin erstellen“.', 'Choose “Create event”.'),
          ziel: 'erstellen',
          bild: screen(`${kopf(t('Schaufenster', 'Shop window'), `<span class="b-icon">${ic.zahnrad}</span>`)}
${fensterKopf}
<h4>${esc(t('Termine', 'Events'))}</h4>
<p class="b-leer">${esc(t('Noch keine Termine', 'No events yet'))}</p>
<div class="b-menue">
  <span>${esc(t('Post erstellen', 'Create post'))}</span>
  <span data-tap="erstellen">${esc(t('Termin erstellen', 'Create event'))}</span>
  <span>${esc(t('Schaufenster bearbeiten', 'Edit shop window'))}</span>
</div>`),
        },
        {
          hinweis: t('Trage Titel, Tag und Uhrzeit ein. Danach tippe auf „Termin erstellen“.', 'Enter the title, day and time. Then tap “Create event”.'),
          ziel: 'anlegen',
          bild: screen(`${kopf(t('Termin erstellen', 'Create event'))}
<div class="b-feld"><small>${esc(t('Titel', 'Title'))}</small><span class="b-tippt">${esc(termin)}</span></div>
<div class="b-feld"><small>${esc(t('Wann?', 'When?'))}</small><span class="b-chips"><i>${esc(t('Heute', 'Today'))}</i><i>${esc(t('Morgen', 'Tomorrow'))}</i><i class="an">${esc(t('Datum', 'Date'))}</i></span></div>
<div class="b-zeile"><div class="b-feld"><small>${esc(t('Beginn', 'Start'))}</small><span>14:00</span></div><div class="b-feld"><small>${esc(t('Ende', 'End'))}</small><span>18:00</span></div></div>
<div class="b-feld"><small>${esc(t('Ort', 'Place'))}</small><span>${esc(t('Hof, Weserstraße 12', 'Courtyard, Weserstraße 12'))}</span></div>
<span class="b-knopf" data-tap="anlegen">${esc(t('Termin erstellen', 'Create event'))}</span>`),
        },
        {
          hinweis: t(
            'Deine Kundschaft öffnet Dein Schaufenster im Browser und tippt auf „Kalender abonnieren“.',
            'Your customers open your shop window in the browser and tap “Subscribe to calendar”.',
          ),
          ziel: 'abo',
          bild: screen(browser(`${fensterKopf}
<h4>${esc(t('Termine', 'Events'))}</h4>
<p class="b-leer">${esc(t('Neue Termine erscheinen automatisch in Deinem Kalender.', 'New events appear in your calendar automatically.'))}</p>
<span class="b-reihe"><span class="b-knopf b-knopf-hell" data-tap="abo">${esc(t('Kalender abonnieren', 'Subscribe to calendar'))}</span><span class="b-link">${esc(t('Link kopieren', 'Copy link'))}</span></span>
${terminKarte}`)),
        },
        {
          hinweis: t(
            'Fertig. Dein Termin steht im Kalender Deiner Kundin. Neue Termine kommen von selbst dazu.',
            'Done. Your event is in your customer’s calendar. New events are added by themselves.',
          ),
          bild: screen(`<div class="b-kal">
  <div class="b-kal-kopf"><span class="b-icon">${ic.kalender}</span><b>${esc(t('Samstag, 22. November', 'Saturday, November 22'))}</b></div>
  ${['12', '13', '14', '15', '16', '17', '18', '19'].map((h) => `<div class="b-kal-stunde"><small>${h}:00</small></div>`).join('')}
  <div class="b-kal-termin"><b>${esc(termin)}</b><small>${esc(laden)} · 14:00–18:00</small></div>
</div>`),
        },
      ],
    },
    {
      id: 'karte',
      titel: t('Karte und Anfahrt', 'Map and directions'),
      text: t(
        'Deine Adresse im Schaufenster zeigt eine Karte von OpenStreetMap. Ein Tipp öffnet die Anfahrt in der Karten-App.',
        'Your address in the shop window shows a map from OpenStreetMap. One tap opens directions in the maps app.',
      ),
      zeit: t('1 Minute', '1 minute'),
      kosten: t('Kostenlos', 'Free'),
      stand: 'vorbereitung',
    },
    {
      id: 'google',
      titel: t('Google-Unternehmensprofil', 'Google Business Profile'),
      text: t(
        'Öffnungszeiten und Termine aus Deinem Schaufenster erscheinen auch in der Google-Suche und in Google Maps.',
        'Opening hours and events from your shop window also appear in Google Search and Google Maps.',
      ),
      zeit: t('15 Minuten, dazu die Bestätigung durch Google', '15 minutes, plus verification by Google'),
      kosten: t('Kostenlos', 'Free'),
      stand: 'vorbereitung',
    },
    {
      id: 'newsletter',
      titel: t('Newsletter', 'Newsletter'),
      text: t(
        'Deine Kundschaft trägt sich im Schaufenster ein. Das System verschickt Deine neuen Termine per E-Mail, über Brevo.',
        'Your customers sign up in your shop window. The system sends your new events by email, via Brevo.',
      ),
      zeit: t('20 Minuten', '20 minutes'),
      kosten: t('Kostenlos bis 300 E-Mails am Tag', 'Free up to 300 emails a day'),
      stand: 'vorbereitung',
    },
    {
      id: 'weiterposten',
      titel: t('Weiterposten', 'Cross-posting'),
      text: t(
        'Ein Post im Schaufenster erscheint auch auf Bluesky, Mastodon, Instagram und Facebook. Instagram und Facebook prüfen die Verbindung vorher.',
        'A post in your shop window also appears on Bluesky, Mastodon, Instagram and Facebook. Instagram and Facebook review the connection first.',
      ),
      zeit: t('5 Minuten je Plattform', '5 minutes per platform'),
      kosten: t('Kostenlos', 'Free'),
      stand: 'vorbereitung',
    },
    {
      id: 'buchung',
      titel: t('Online-Buchung', 'Online booking'),
      text: t(
        'Deine Kundschaft bucht Termine direkt aus dem Schaufenster, über Cal.com.',
        'Your customers book appointments right from your shop window, via Cal.com.',
      ),
      zeit: t('30 Minuten', '30 minutes'),
      kosten: t('Kostenlos selbst gehostet, sonst ab 15 € im Monat', 'Free when self-hosted, otherwise from €15 a month'),
      stand: 'vorbereitung',
    },
    {
      id: 'bezahlen',
      titel: t('Bezahlen', 'Payments'),
      text: t(
        'Deine Kundschaft bezahlt direkt im Schaufenster, über Stripe oder PayPal. Das Geld geht direkt an Dich.',
        'Your customers pay right in your shop window, via Stripe or PayPal. The money goes straight to you.',
      ),
      zeit: t('30 Minuten, dazu die Kontoprüfung des Anbieters', '30 minutes, plus the provider’s account review'),
      kosten: t('Gebühren je Zahlung beim Anbieter', 'Fees per payment with the provider'),
      stand: 'vorbereitung',
    },
  ];
}
