# Store-Eintrag Google Play (Entwurf)

Stand: 2026-11-14. Vorbereitet von Claude, Daria prüft und trägt in der Play Console ein. Texte stammen größtenteils von der Startseite kiezcoins.de. Apple folgt später mit denselben Texten.

## Grunddaten

| Feld | Eintrag |
|:---|:---|
| App-Name (max. 30) | KiezCoins |
| Kurzbeschreibung (max. 80) | Kleine Challenges für mehr echte Gemeinschaft – im Kiez, in Gruppen, für Dich |
| Kategorie | Soziale Netzwerke |
| Tags | Gemeinschaft, Nachbarschaft, Aufgaben |
| E-Mail für Nutzer:innen | kiezkoins@protonmail.com |
| Website | https://kiezcoins.de |
| Datenschutzerklärung | https://kiezcoins.de/datenschutz |
| Konto löschen (Web) | https://kiezcoins.de/konto-loeschen |
| Werbung | Nein |
| Preis | Kostenlos, keine In-App-Käufe |
| Händlerstatus (EU) | Nicht-Händlerin |

## Langbeschreibung (max. 4000)

Kennst Du das? Irgendwas muss erledigt werden, doch wer soll das machen? KiezCoins verteilt Arbeit besser, zu Hause oder im Kiez. Zusammen sind wir stärker, gesünder und glücklicher und bekommen sogar mehr gebacken.

KiezCoins ist ein pro-soziales Netzwerk. Aufgaben, die sonst liegen bleiben, erledigt jemand, als wäre es ein Spiel.

So funktioniert es:
• We-Challenges: Stell eine Aufgabe in Deinen Kiez oder Deine Gruppe. Jemand nimmt sie an und erledigt sie.
• Me-Challenges: Nimm Dir selbst etwas vor und zeig Vorher und Nachher.
• Gruppen: Für WG, Hausgemeinschaft, Verein oder Freundeskreis, mit Rangliste für alle, die es kompetitiv mögen.
• Routine: Erinnerungen, Aufgaben und Termine an einem Ort, auf Wunsch mit Deinen Kalendern verbunden.
• Freundschaften und Nachrichten: Schreib Menschen, die Du kennst.
• Schaufenster: Läden, Vereine und Clubs zeigen Termine und Neuigkeiten aus dem Kiez.

Warum KiezCoins anders ist:
• Wir ketten Dich nicht suchtartig an die App.
• Dein Feed sortiert nach Nähe und Zeit, nicht nach Empörung.
• Keine Hassrede, keine Inhalte, die Krankheiten wie Bulimie fördern.
• Deine Konto- und Inhaltsdaten liegen auf Servern in der EU.
• Wir verkaufen Deine Daten nicht und trainieren keine KI damit.
• KiezCoins zeigt keine Werbung.
• Du entscheidest: nutze die App für Dich, in Gruppen, im Kiez, landesweit oder alles davon.

KiezCoins ist in der Testphase und für Personen ab 18 Jahren.

## Grafiken

| Was | Format | Stand |
|:---|:---|:---|
| App-Icon | 512 × 512 PNG, 32 Bit | fertig: `KiezCoins-Fotos/store-grafiken/app-icon-512.png` |
| Vorstellungsgrafik | 1024 × 500 PNG oder JPG | fertig: `vorstellungsgrafik-1024x500.png` (Kater aus der Start-Animation, Schriftzug, Satz der Startseite) |
| Handy-Screenshots | 2–8 Stück, 9:16, mind. 1080 px breit | fertig: 5 Stück, 1080 × 1920 (Kiez, Me & Myself, Gruppe, Erstellen, Routine) |

Die Screenshots zeigen die echte Web-App mit den Beispieldaten aus `src/data/sample.ts` und Beispiel-Erinnerungen, gebaut am 2026-11-14. Die Fotos stammen aus den Beispieldaten (Unsplash-Lizenz). Schaufenster fehlt noch, da es Daten vom Server braucht.


## Datensicherheit (Formular in der Play Console)

Allgemein:

| Frage | Antwort |
|:---|:---|
| Erhebt oder teilt die App Nutzerdaten? | Ja |
| Werden alle Daten bei der Übertragung verschlüsselt? | Ja (HTTPS) |
| Können Nutzer:innen das Löschen ihrer Daten anfordern? | Ja, in der App und unter kiezcoins.de/konto-loeschen |
| Weitergabe an Dritte | Nein. Weiterposten zu BlueSky, Mastodon, Instagram und Facebook geschieht nur auf Wunsch der Person und zählt laut Google nicht als Weitergabe. |

Erhobene Daten (alle: „erhoben“, nicht „geteilt“, nicht nur vorübergehend verarbeitet):

| Datentyp | Pflicht oder freiwillig | Zweck |
|:---|:---|:---|
| Persönliche Daten › E-Mail-Adresse | freiwillig (Konto geht auch ohne E-Mail) | Kontoverwaltung |
| Persönliche Daten › Name (Deckname) | Pflicht | App-Funktionen, Kontoverwaltung |
| Persönliche Daten › Nutzer-IDs | Pflicht | App-Funktionen, Kontoverwaltung |
| Standort › Ungefährer Standort | freiwillig | App-Funktionen (Kiez, gerundeter Punkt der Challenge) |
| Finanzdaten › Sonstige Finanzdaten (IBAN, PayPal) | freiwillig | App-Funktionen (Coins zwischen Personen) |
| Nachrichten › Andere In-App-Nachrichten | freiwillig | App-Funktionen |
| Fotos und Videos › Fotos | freiwillig | App-Funktionen |
| Kalender › Kalendertermine | freiwillig | App-Funktionen (Routine, Kalender-Abo) |
| App-Aktivitäten › Andere nutzergenerierte Inhalte (Posts, Kommentare) | freiwillig | App-Funktionen |

Nicht erhoben: genauer Standort (bleibt auf dem Gerät), Kontakte, Gesundheitsdaten, Web-Verlauf, Geräte-IDs, Absturzberichte. Die anonyme Knopf-Zählung enthält keine Person und kein Gerät und zählt deshalb nicht.

## Einstufung des Inhalts (Fragebogen IARC)

- Kategorie: Soziale Netzwerke / Kommunikation
- Nutzer:innen können miteinander interagieren: Ja (Kommentare, Nachrichten, Gruppen)
- Nutzer:innen teilen Inhalte: Ja (Fotos, Texte)
- Ungefährer Standort wird geteilt: Ja (Kiez als Text, gerundeter Punkt)
- Digitale Käufe: Nein
- Gewalt, Sexualität, Glücksspiel, Drogen: Nein
- Zielgruppe in der Play Console: 18 und älter

## App-Zugriff für die Prüfung

Google prüft die App angemeldet. Daria legt dafür ein Testkonto an (Konto ohne E-Mail mit Deckname und Passwort reicht) und trägt Deckname und Passwort unter „App-Zugriff“ ein. Das Testkonto sollte Mitglied einer Beispielgruppe sein, damit die Prüfung alle Bereiche sieht.

## Ablauf bis zur Veröffentlichung

1. Konto anlegen (25 $), Identität bestätigen, als Nicht-Händlerin einstufen.
2. App anlegen, die Abschnitte oben ausfüllen.
3. EAS-Build `production` (Android App Bundle) hochladen, geschlossener Test.
4. 12 Tester:innen über 14 Tage.
5. Zugang zur Produktion beantragen, danach veröffentlichen.
