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
 * @param {Record<string, string>} ic SVG-Icons: zurueck, zahnrad (Textfarbe des Telefons), kalender, pin, haken
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
  const adresse = 'Weserstraße 12, 12047 Berlin';

  // Bausteine der Bildschirme
  const feld = (label, wert, tippt = false, ton = '') =>
    `<div class="b-feld${ton ? ` b-feld-${ton}` : ''}"><small>${esc(label)}</small><span${tippt ? ' class="b-tippt"' : ''}>${esc(wert)}</span></div>`;
  // ton: '' Haupt-Knopf, 'zweit' mit Rand, 'hell' Signalfarbe des Schaufensters, 'karte' auf heller Karte, 'google'/'stripe' fremde Seiten
  const knopf = (label, tap = '', ton = '') =>
    `<span class="b-knopf${ton ? ` b-knopf-${ton}` : ''}"${tap ? ` data-tap="${tap}"` : ''}>${esc(label)}</span>`;
  // Angabe auf der öffentlichen Seite: Titel klein, darunter der Inhalt (wie api/s.mjs)
  const fakt = (label, inhalt) => `<div class="b-fakt"><small>${esc(label)}</small><div>${inhalt}</div></div>`;
  // Fremde Seite (Google, Stripe, Bluesky …): hell, oben die Adresse
  const fremd = (domain, inhalt) => `<div class="b-fremd"><div class="b-adresse">${esc(domain)}</div>${inhalt}</div>`;
  // Zahnrad im Schaufenster, danach ein Eintrag im Menü (ziel: 'erstellen', 'bearbeiten' für „Inhalte bearbeiten“ oder
  // 'einstellungen'); Menü wie in der App seit 2026-11-23 (Inhalte und Einstellungen getrennt)
  const zahnradMenue = (ziel) => [
    {
      hinweis: t('Öffne Dein Schaufenster und tippe oben rechts auf das Zahnrad.', 'Open your shop window and tap the gear at the top right.'),
      ziel: 'zahnrad',
      bild: screen(`${kopf(t('Schaufenster', 'Shop window'), `<span class="b-icon" data-tap="zahnrad">${ic.zahnrad}</span>`)}
${fensterKopf}
<h4>${esc(t('Termine', 'Events'))}</h4>
<p class="b-leer">${esc(t('Noch keine Termine', 'No events yet'))}</p>`),
    },
    {
      hinweis:
        ziel === 'erstellen'
          ? t('Wähle „Termin erstellen“.', 'Choose “Create event”.')
          : ziel === 'einstellungen'
            ? t('Wähle „Einstellungen“.', 'Choose “Settings”.')
            : t('Wähle „Inhalte bearbeiten“.', 'Choose “Edit content”.'),
      ziel,
      bild: screen(`${kopf(t('Schaufenster', 'Shop window'), `<span class="b-icon">${ic.zahnrad}</span>`)}
${fensterKopf}
<h4>${esc(t('Termine', 'Events'))}</h4>
<p class="b-leer">${esc(t('Noch keine Termine', 'No events yet'))}</p>
<div class="b-menue">
  <span>${esc(t('Post erstellen', 'Create post'))}</span>
  <span${ziel === 'erstellen' ? ' data-tap="erstellen"' : ''}>${esc(t('Termin erstellen', 'Create event'))}</span>
  <span${ziel === 'bearbeiten' ? ' data-tap="bearbeiten"' : ''}>${esc(t('Inhalte bearbeiten', 'Edit content'))}</span>
  <span${ziel === 'einstellungen' ? ' data-tap="einstellungen"' : ''}>${esc(t('Einstellungen', 'Settings'))}</span>
</div>`),
    },
  ];

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
        ...zahnradMenue('erstellen'),
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
        'Findet die Kartensuche Deine Adresse, zeigt Dein Schaufenster eine Karte von OpenStreetMap. Ein Tipp auf „Anfahrt“ öffnet den Routenplaner.',
        'If the map search finds your address, your shop window shows a map from OpenStreetMap. A tap on “Directions” opens the route planner.',
      ),
      zeit: t('1 Minute', '1 minute'),
      kosten: t('Kostenlos', 'Free'),
      stand: 'app',
      schritte: [
        ...zahnradMenue('bearbeiten'),
        {
          hinweis: t('Trage Deine Adresse ein und tippe auf „Speichern“.', 'Enter your address and tap “Save”.'),
          ziel: 'speichern',
          bild: screen(`${kopf(t('Schaufenster bearbeiten', 'Edit shop window'))}
${feld(t('Name', 'Name'), laden)}
${feld(t('Adresse', 'Address'), adresse, true)}
${feld(t('Öffnungszeiten', 'Opening hours'), t('Mo–Sa 8–18 Uhr', 'Mon–Sat 8 am–6 pm'))}
${knopf(t('Speichern', 'Save'), 'speichern')}`),
        },
        {
          hinweis: t(
            'Deine Kundschaft sieht die Adresse auf Deiner Seite. Ein Tipp auf „Karte anzeigen“ lädt die Karte.',
            'Your customers see the address on your page. A tap on “Show map” loads the map.',
          ),
          ziel: 'karte',
          bild: screen(browser(`${fensterKopf}
${fakt(t('Adresse', 'Address'), `${esc(adresse)}<span class="b-reihe"><span class="b-link">${esc(t('In Karten öffnen', 'Open in maps'))}</span><span class="b-link">${esc(t('Anfahrt', 'Directions'))}</span></span>
<span class="b-kasten" data-tap="karte">${esc(t('Karte anzeigen', 'Show map'))}</span>`)}`)),
        },
        {
          hinweis: t(
            'Fertig. Die Karte zeigt Deinen Laden. „Anfahrt“ öffnet den Routenplaner von OpenStreetMap.',
            'Done. The map shows your shop. “Directions” opens the OpenStreetMap route planner.',
          ),
          bild: screen(browser(`${fakt(t('Adresse', 'Address'), esc(adresse))}
<div class="b-osm" aria-hidden="true"><i class="b-strasse b-s1"></i><i class="b-strasse b-s2"></i><i class="b-strasse b-s3"></i><i class="b-park"></i><span class="b-pin">${ic.pin}</span></div>
<small class="b-quelle">${esc(t('Karte © OpenStreetMap-Mitwirkende', 'Map © OpenStreetMap contributors'))}</small>
<span class="b-reihe"><span class="b-knopf b-knopf-hell">${esc(t('Anfahrt', 'Directions'))}</span><span class="b-link">${esc(t('Ort teilen', 'Share place'))}</span></span>`)),
        },
      ],
    },
    {
      id: 'google',
      titel: t('Google-Unternehmensprofil', 'Google Business Profile'),
      text: t(
        'Google liest Deine Seite im Web: Name, Adresse, Karte, Öffnungszeiten und Termine. Mit einem kostenlosen Unternehmensprofil erscheinst Du auch in Google Maps.',
        'Google reads your page on the web: name, address, map, opening hours and events. With a free business profile you also appear in Google Maps.',
      ),
      zeit: t('15 Minuten, dazu einige Tage Prüfung durch Google', '15 minutes, plus a few days of review by Google'),
      kosten: t('Kostenlos', 'Free'),
      stand: 'app',
      schritte: [
        {
          hinweis: t(
            'Öffne „Dein Schaufenster“. Im Abschnitt „Google“ tippe auf „Google-Unternehmensprofil anlegen“.',
            'Open “Your shop window”. In the “Google” section, tap “Create Google Business Profile”.',
          ),
          ziel: 'google',
          bild: screen(`${kopf(t('Schaufenster', 'Shop window'))}
<h4>${esc(t('Deine Seite', 'Your page'))}</h4>
${knopf(t('Schaufenster im Web', 'Shop window on the web'), '', 'zweit')}
<h4>Google</h4>
<div class="b-chat"><span class="b-frage">${esc(t('Wie finden mich Leute bei Google Maps?', 'How do people find me on Google Maps?'))}</span>
<span class="b-antwort">${esc(t('Google liest Deine Seite im Web. Für Google Maps legst Du kostenlos ein Unternehmensprofil an und trägst dort den Link zu Deiner Seite als Website ein.', 'Google reads your page on the web. For Google Maps you create a free business profile and enter the link to your page as the website.'))}</span></div>
${knopf(t('Google-Unternehmensprofil anlegen', 'Create Google Business Profile'), 'google', 'zweit')}`),
        },
        {
          hinweis: t('Google fragt nach Namen und Art Deines Betriebs. Trage beides ein und tippe auf „Weiter“.', 'Google asks for the name and type of your business. Enter both and tap “Next”.'),
          ziel: 'weiter',
          bild: screen(fremd('business.google.com', `<b class="b-fremd-titel">${esc(t('Unternehmen hinzufügen', 'Add your business'))}</b>
${feld(t('Name des Unternehmens', 'Business name'), laden, true, 'hell')}
${feld(t('Kategorie', 'Category'), t('Café', 'Café'), false, 'hell')}
${knopf(t('Weiter', 'Next'), 'weiter', 'google')}`)),
        },
        {
          hinweis: t('Trage den Link zu Deiner Seite als Website ein und tippe auf „Weiter“.', 'Enter the link to your page as the website and tap “Next”.'),
          ziel: 'website',
          bild: screen(fremd('business.google.com', `<b class="b-fremd-titel">${esc(t('Kontaktdaten', 'Contact details'))}</b>
${feld(t('Adresse', 'Address'), adresse, false, 'hell')}
${feld(t('Website', 'Website'), 'kiezcoins.de/s/cafe-kiezliebe', true, 'hell')}
${knopf(t('Weiter', 'Next'), 'website', 'google')}`)),
        },
        {
          hinweis: t(
            'Fertig. Google prüft den Eintrag, das dauert einige Tage. Danach findet Dich Deine Kundschaft in Google Maps.',
            'Done. Google reviews the listing, which takes a few days. After that your customers find you in Google Maps.',
          ),
          bild: screen(fremd('google.com/maps', `<div class="b-osm b-osm-klein" aria-hidden="true"><i class="b-strasse b-s1"></i><i class="b-strasse b-s2"></i><i class="b-park"></i><span class="b-pin">${ic.pin}</span></div>
<b class="b-fremd-titel">${esc(laden)}</b>
<small>${esc(t('Café · Weserstraße 12', 'Café · Weserstraße 12'))}</small>
<small class="b-gruen">${esc(t('Geöffnet · Schließt um 18 Uhr', 'Open · Closes 6 pm'))}</small>
<span class="b-reihe"><span class="b-pille">${esc(t('Route', 'Directions'))}</span><span class="b-pille">${esc(t('Website', 'Website'))}</span></span>`)),
        },
      ],
    },
    {
      id: 'weiterposten',
      titel: t('Weiterposten', 'Cross-posting'),
      text: t(
        'Posts und Termine aus Deinem Schaufenster erscheinen auch auf Bluesky, Mastodon, Instagram und Facebook. Instagram und Facebook prüfen die Verbindung vorher.',
        'Posts and events from your shop window also appear on Bluesky, Mastodon, Instagram and Facebook. Instagram and Facebook review the connection first.',
      ),
      zeit: t('5 Minuten je Plattform', '5 minutes per platform'),
      kosten: t('Kostenlos', 'Free'),
      stand: 'app',
      schritte: [
        {
          hinweis: t('Öffne „Dein Konto › Funktionen“ und schalte Bluesky ein.', 'Open “Your account › Features” and switch on Bluesky.'),
          ziel: 'bluesky',
          bild: screen(`${kopf(t('Funktionen', 'Features'))}
<h4>${esc(t('Weiterposten', 'Cross-posting'))}</h4>
${['Bluesky', 'Mastodon', 'Instagram', 'Facebook'].map((p) => `<span class="b-schalter-zeile">${p}<i class="b-schalter"${p === 'Bluesky' ? ' data-tap="bluesky"' : ''}></i></span>`).join('')}`),
        },
        {
          hinweis: t('Trage Deinen Handle und ein App-Passwort von Bluesky ein. Danach tippe auf „Verbinden“.', 'Enter your Bluesky handle and an app password. Then tap “Connect”.'),
          ziel: 'verbinden',
          bild: screen(`${kopf(t('Funktionen', 'Features'))}
<h4>Bluesky</h4>
${feld(t('Handle', 'Handle'), '@cafe-kiezliebe.bsky.social', true)}
${feld(t('App-Passwort', 'App password'), '•••• •••• •••• ••••')}
${knopf(t('Verbinden', 'Connect'), 'verbinden')}`),
        },
        {
          hinweis: t('Erstelle einen Termin wie gewohnt. „Weiterposten“ ist schon an. Tippe auf „Termin erstellen“.', 'Create an event as usual. “Cross-posting” is already on. Tap “Create event”.'),
          ziel: 'anlegen',
          bild: screen(`${kopf(t('Termin erstellen', 'Create event'))}
${feld(t('Titel', 'Title'), termin)}
<div class="b-zeile">${feld(t('Beginn', 'Start'), '14:00')}${feld(t('Ende', 'End'), '18:00')}</div>
<span class="b-schalter-zeile">${esc(t('Weiterposten', 'Cross-posting'))}<small>Bluesky</small><i class="b-schalter an"></i></span>
${knopf(t('Termin erstellen', 'Create event'), 'anlegen')}`),
        },
        {
          hinweis: t('Fertig. Dein Termin steht auch auf Bluesky, mit Link zu Deinem Schaufenster.', 'Done. Your event is also on Bluesky, with a link to your shop window.'),
          bild: screen(fremd('bsky.app', `<div class="b-post"><span class="b-logo b-logo-klein">K</span><div><b>${esc(laden)}</b><small>@cafe-kiezliebe.bsky.social</small></div></div>
<p class="b-post-text">${esc(termin)} · ${esc(wann)}</p>
<div class="b-karte b-karte-rand"><span class="b-art">kiezcoins.de</span><b>${esc(termin)}</b><span class="b-datum">${esc(wann)}</span></div>`)),
        },
      ],
    },
    {
      id: 'newsletter',
      titel: t('Newsletter', 'Newsletter'),
      text: t(
        'Deine Kundschaft trägt sich auf Deiner Seite ein. Das System verschickt Deine neuen Termine per E-Mail, über Brevo.',
        'Your customers sign up on your page. The system sends your new events by email, via Brevo.',
      ),
      zeit: t('20 Minuten', '20 minutes'),
      kosten: t('Kostenlos bis 300 E-Mails am Tag', 'Free up to 300 emails a day'),
      stand: 'vorbereitung',
      schritte: [
        {
          hinweis: t('Öffne „Dein Schaufenster“. Im Abschnitt „Newsletter“ tippe auf „Brevo verbinden“.', 'Open “Your shop window”. In the “Newsletter” section, tap “Connect Brevo”.'),
          ziel: 'brevo',
          bild: screen(`${kopf(t('Schaufenster', 'Shop window'))}
<h4>${esc(t('Newsletter', 'Newsletter'))}</h4>
<p class="b-leer">${esc(t('Neue Termine gehen per E-Mail an alle, die sich eingetragen haben.', 'New events go by email to everyone who signed up.'))}</p>
${knopf(t('Brevo verbinden', 'Connect Brevo'), 'brevo', 'zweit')}`),
        },
        {
          hinweis: t('Kopiere den API-Schlüssel aus Deinem Brevo-Konto, füge ihn ein und tippe auf „Verbinden“.', 'Copy the API key from your Brevo account, paste it and tap “Connect”.'),
          ziel: 'verbinden',
          bild: screen(`${kopf(t('Newsletter', 'Newsletter'))}
${feld(t('API-Schlüssel von Brevo', 'Brevo API key'), 'xkeysib-••••••••••••', true)}
${feld(t('Absender', 'Sender'), laden)}
${knopf(t('Verbinden', 'Connect'), 'verbinden')}`),
        },
        {
          hinweis: t('Deine Kundschaft trägt auf Deiner Seite ihre E-Mail ein und tippt auf „Eintragen“.', 'Your customers enter their email on your page and tap “Sign up”.'),
          ziel: 'eintragen',
          bild: screen(browser(`${fensterKopf}
${fakt(t('Newsletter', 'Newsletter'), `${esc(t('Neue Termine per E-Mail', 'New events by email'))}
${feld(t('E-Mail', 'Email'), 'lena@example.org', true, 'hell')}
${knopf(t('Eintragen', 'Sign up'), 'eintragen', 'hell')}`)}`)),
        },
        {
          hinweis: t('Fertig. Bei jedem neuen Termin bekommt Deine Kundschaft eine E-Mail.', 'Done. With every new event your customers get an email.'),
          bild: screen(fremd(t('Posteingang', 'Inbox'), `<div class="b-mail"><small>${esc(laden)}</small><b>${esc(t('Neuer Termin: {t}', 'New event: {t}').replace('{t}', termin))}</b><small>${esc(wann)}</small></div>
<div class="b-mail b-mail-alt"><small>${esc(t('Bäckerei Krume', 'Krume Bakery'))}</small><b>${esc(t('Frische Brötchen ab 7 Uhr', 'Fresh rolls from 7 am'))}</b></div>`)),
        },
      ],
    },
    {
      id: 'buchung',
      titel: t('Online-Buchung', 'Online booking'),
      text: t(
        'Deine Kundschaft bucht Termine direkt von Deiner Seite, über Cal.com.',
        'Your customers book appointments right from your page, via Cal.com.',
      ),
      zeit: t('30 Minuten', '30 minutes'),
      kosten: t('Kostenlos im Gratis-Tarif von Cal.com', 'Free on Cal.com’s free plan'),
      stand: 'app',
      schritte: [
        ...zahnradMenue('einstellungen'),
        {
          hinweis: t('Tippe unter „Einstellungen“ auf „Online-Buchung“.', 'Under “Settings”, tap “Online booking”.'),
          ziel: 'buchung',
          bild: screen(`${kopf(t('Schaufenster', 'Shop window'))}
<h4>${esc(t('Einstellungen', 'Settings'))}</h4>
<div class="b-menue">
  <span>${esc(t('Wer sieht das Schaufenster?', 'Who can see the shop window?'))}</span>
  <span>${esc(t('Wer darf posten?', 'Who can post?'))}</span>
  <span data-tap="buchung">${esc(t('Online-Buchung', 'Online booking'))}</span>
</div>`),
        },
        {
          hinweis: t('Trage den Link zu Deiner Buchungsseite bei Cal.com ein und tippe auf „Speichern“.', 'Enter the link to your Cal.com booking page and tap “Save”.'),
          ziel: 'speichern',
          bild: screen(`${kopf(t('Online-Buchung', 'Online booking'))}
${feld(t('Buchungslink', 'Booking link'), 'cal.com/cafe-kiezliebe', true)}
${knopf(t('Speichern', 'Save'), 'speichern')}`),
        },
        {
          hinweis: t('Deine Kundschaft tippt auf Deiner Seite auf „Termin buchen“.', 'Your customers tap “Book an appointment” on your page.'),
          ziel: 'buchen',
          bild: screen(browser(`${fensterKopf}
${knopf(t('Termin buchen', 'Book an appointment'), 'buchen', 'hell')}
${fakt(t('Adresse', 'Address'), esc(adresse))}`)),
        },
        {
          hinweis: t('Sie wählt eine freie Uhrzeit.', 'They choose a free time.'),
          ziel: 'zeit',
          bild: screen(fremd('cal.com', `<b class="b-fremd-titel">${esc(t('Tisch für den Brunch', 'Brunch table'))}</b>
<small>${esc(t('Samstag, 22. November', 'Saturday, November 22'))}</small>
<div class="b-slots">${['10:00', '10:30', '11:00', '11:30', '12:00', '12:30'].map((z) => `<span${z === '11:00' ? ' data-tap="zeit"' : ''}>${z}</span>`).join('')}</div>`)),
        },
        {
          hinweis: t('Fertig. Die Buchung steht in Deinem Kalender bei Cal.com, Deine Kundin bekommt eine Bestätigung.', 'Done. The booking is in your Cal.com calendar, and your customer gets a confirmation.'),
          bild: screen(fremd('cal.com', `<div class="b-fertig"><span class="b-haken">${ic.haken}</span><b>${esc(t('Gebucht', 'Booked'))}</b>
<small>${esc(t('Tisch für den Brunch', 'Brunch table'))} · ${esc(t('Sa, 22.11. · 11:00', 'Sat, Nov 22 · 11:00 am'))}</small><small>${esc(laden)}</small></div>`)),
        },
      ],
    },
    {
      id: 'bezahlen',
      titel: t('Bezahlen', 'Payments'),
      text: t(
        'Deine Kundschaft bezahlt über einen Zahlungslink auf Deiner Seite, zum Beispiel von Stripe, SumUp oder PayPal. Das Geld geht direkt an Dich.',
        'Your customers pay via a payment link on your page, for example from Stripe, SumUp or PayPal. The money goes straight to you.',
      ),
      zeit: t('15 Minuten, dazu die Kontoprüfung des Anbieters', '15 minutes, plus the provider’s account review'),
      kosten: t('Gebühren je Zahlung beim Anbieter', 'Fees per payment with the provider'),
      stand: 'app',
      schritte: [
        ...zahnradMenue('bearbeiten'),
        {
          hinweis: t(
            'Lege bei Stripe, SumUp oder PayPal einen Zahlungslink an. Trage ihn unter „Bezahlen“ mit Titel und Betrag ein und tippe auf „Speichern“.',
            'Create a payment link with Stripe, SumUp or PayPal. Enter it under “Payments” with a title and amount, then tap “Save”.',
          ),
          ziel: 'speichern',
          bild: screen(`${kopf(t('Inhalte bearbeiten', 'Edit content'))}
<h4>${esc(t('Bezahlen', 'Payments'))}</h4>
${feld(t('Titel', 'Title'), t('Gutschein: Frühstück für zwei', 'Voucher: breakfast for two'))}
${feld(t('Betrag', 'Amount'), '24,00 €')}
${feld(t('Link zum Bezahlen', 'Payment link'), 'buy.stripe.com/…', true)}
${knopf(t('Speichern', 'Save'), 'speichern')}`),
        },
        {
          hinweis: t('Deine Kundschaft tippt auf Deiner Seite auf „Bezahlen“.', 'Your customers tap “Pay” on your page.'),
          ziel: 'bezahlen',
          bild: screen(browser(`${fensterKopf}
<div class="b-karte"><span class="b-art">${esc(t('Bezahlen', 'Payments'))}</span><b>${esc(t('Gutschein: Frühstück für zwei', 'Voucher: breakfast for two'))}</b><span class="b-datum">24,00 €</span>
${knopf(t('Bezahlen', 'Pay'), 'bezahlen', 'karte')}</div>`)),
        },
        {
          hinweis: t('Fertig. Das Geld geht direkt an Dich. Wer bezahlt hat, siehst Du in Deinem Konto beim Anbieter.', 'Done. The money goes straight to you. You can see who paid in your account with the provider.'),
          bild: screen(fremd('checkout.stripe.com', `<div class="b-fertig"><span class="b-haken">${ic.haken}</span><b>${esc(t('Bezahlt', 'Paid'))}</b>
<small>${esc(t('Gutschein: Frühstück für zwei', 'Voucher: breakfast for two'))} · 24,00 €</small><small>${esc(laden)}</small></div>`)),
        },
      ],
    },
  ];
}
