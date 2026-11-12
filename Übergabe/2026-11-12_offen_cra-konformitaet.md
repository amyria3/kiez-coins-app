# CRA-Konformität: Einstufung, Stand und Pflichtaufgaben

Datum: 12.11.2026. Status: offen. Gehört in Documentation nach `kiez-coins/cra/` (neuer Ordner), die Pflichtliste zusätzlich nach `kiez-coins/app/Stand_App.md`.

Pflichtaufgabe: Die Liste „Pflichtaufgaben für Daria“ unten und in `TODO.md`.

Diese Notiz hält fest, was der EU Cyber Resilience Act (CRA, Verordnung (EU) 2024/2847) für KiezCoins verlangt, was Claude am 12.11.2026 erledigt hat und was Daria selbst tun muss. Die Einordnung stammt von Claude und ersetzt keine Rechtsberatung. Der Verordnungstext auf EUR-Lex war aus der Cloud-Sitzung nicht abrufbar. Fristen, Übergangsregel und Supportdauer sind über Fachquellen (Kanzleien, CRA-Leitfäden) abgeglichen. Drei Punkte stammen aus Claudes Kenntnis des Verordnungstexts und sind am 12.11.2026 nicht nachgelesen: CE-Kennzeichen bei Software (Art. 30), vereinfachte Doku für Kleinstunternehmen (Art. 33 Abs. 5), Ausnahme vom Bußgeld bei der 24-Stunden-Frist (Art. 64 Abs. 10).

## KiezCoins fällt in die Standardkategorie mit Selbstbewertung

- Die App ist ein soziales Netzwerk für Nachbarschaften und gehört zu keiner Produktart der Anhänge III und IV (zum Beispiel Passwortmanager, Browser, VPN, Identitätsmanagement). Es gilt die Standardkategorie. Die Konformität bewertet die Herstellerin selbst (interne Kontrolle, Modul A), ohne Prüfstelle.
- Der CRA gilt für Produkte, die im Rahmen einer geschäftlichen Tätigkeit angeboten werden. KiezCoins ist im Testbetrieb und kostenlos. Mit dem ersten bezahlten Angebot (Weiterposten, bezahlte Schaufenster) ist die Android-App ein Produkt mit digitalen Elementen.
- Das Supabase-Backend zählt dann als Datenfernverarbeitung der App mit. Die reine Web-App ohne installierte App gilt als Dienst und fällt für sich genommen nicht unter den CRA.
- Herstellerin ist Maria Arkadieff als Anbieterin laut Impressum.

## Diese Fristen gelten

- Seit 11.09.2026: Meldepflicht (Art. 14). Aktiv ausgenutzte Schwachstellen und schwere Sicherheitsvorfälle gehen über die Meldeplattform von ENISA an das zuständige CSIRT (in Deutschland das BSI): Frühwarnung nach 24 Stunden, Meldung nach 72 Stunden, Abschlussbericht 14 Tage nach dem Update (bei Vorfällen nach einem Monat). Die Pflicht gilt auch für Produkte, die schon auf dem Markt sind.
- Ab 11.12.2027: alle übrigen Pflichten. Produkte, die vorher auf dem Markt sind, fallen erst nach einer wesentlichen Änderung darunter. KiezCoins ändert sich laufend, deshalb gilt der 11.12.2027 als Stichtag.

## Der eingefügte Text stimmt im Kern und lässt Pflichten aus

Daria hat am 12.11.2026 eine KI-Zusammenfassung mit fünf Schritten eingefügt. Geprüft:

- Richtig: Standardkategorie, Selbstbewertung nach Modul A, SBOM, technische Dokumentation, Konformitätserklärung, CE-Kennzeichen.
- Ungenau: Das CE-Kennzeichen steht bei Software auf der Konformitätserklärung oder auf der Website zum Produkt. Die technische Dokumentation umfasst mehr als vier Punkte (Anhang VII: auch Entwurf und Entwicklung, Umgang mit Schwachstellen, Prüfberichte).
- Fehlt: die Meldepflicht seit 11.09.2026, der geregelte Umgang mit Schwachstellen samt Kontaktadresse, die Supportdauer von in der Regel mindestens fünf Jahren, die Aufbewahrung der Unterlagen über zehn Jahre, die Bedingung „geschäftliche Tätigkeit“.
- Ungeprüft: die genannten Kosten und die Förderprogramme (SECURE, OSCRAT).

## Das hat Claude am 12.11.2026 erledigt

- Code geprüft: Suche nach Geheimnissen, `npm audit`, Supabase Security Advisor, Durchsicht der Edge Functions und Vercel-Funktionen. Im Repo liegen keine geheimen Schlüssel.
- Risikobewertung mit allen Befunden geschrieben. Sie nennt konkrete Schwachstellen und liegt deshalb nur im Claude-Projektordner: `cra/2026-11-12_risikobewertung-und-befunde.md`. Sie gehört nach Documentation, nicht in dieses Repo.
- SBOM erzeugt (CycloneDX 1.7, 558 Komponenten): Claude-Projektordner `cra/2026-11-12_sbom-cyclonedx.json`. Neu erzeugen: `npx @cyclonedx/cyclonedx-npm --package-lock-only --omit dev --output-file sbom.json`.
- `SECURITY.md` angelegt: Meldeweg für Sicherheitslücken.
- Dependabot (`.github/dependabot.yml`) und `website/.well-known/security.txt` angelegt (PR #352, von Daria am 12.11.2026 gemergt).
- Nicht gelaufen: die statische Analyse mit Semgrep, weil die Regeln aus der Cloud-Sitzung nicht ladbar sind. Ersatz ist CodeQL in GitHub (Pflichtaufgabe 6).

## Pflichtaufgaben für Daria

Sofort:

1. Einordnung rechtlich prüfen lassen: Fällt KiezCoins unter den CRA, ab welchem Zeitpunkt, und zählen Web-App und Backend mit.
2. Postfach für Sicherheitsmeldungen bestätigen. `SECURITY.md` nennt die Adresse aus dem Impressum. Das Postfach muss täglich gelesen werden.
3. In GitHub einschalten: Settings › Code security › „Private vulnerability reporting“.
4. Zwei-Faktor-Anmeldung einschalten bei GitHub, Expo, Supabase, Vercel, Brevo und INWX.
5. In Supabase einschalten: Authentication › Schutz vor geleakten Passwörtern („Leaked password protection“).
6. In GitHub einschalten: Settings › Code security › CodeQL „Default setup“ und Dependabot alerts.
7. Erledigt am 12.11.2026: PR #352 mit Dependabot und `security.txt` ist gemergt. Im Browser prüfen, dass `https://kiezcoins.de/.well-known/security.txt` lädt.
8. Die Maßnahmen aus der Risikobewertung entscheiden (drei mit hoher Dringlichkeit). Claude setzt sie danach um.

Vor dem ersten bezahlten Angebot:

9. Meldeweg zum BSI kennen: Zugang zur CRA-Meldeplattform von ENISA einrichten und den Ablauf 24 Stunden, 72 Stunden, 14 Tage ablegen.
10. Supportdauer festlegen und mit Enddatum (Monat und Jahr) auf der Website nennen. Regel: mindestens fünf Jahre, kürzer nur bei kürzerer erwarteter Nutzungsdauer.
11. Herstellerangaben vervollständigen: Name, Postanschrift und E-Mail stehen am Produkt oder auf der Website. Die Anschrift im Impressum ist offen.

Bis 11.12.2027:

12. Technische Dokumentation abnehmen (Claude schreibt sie aus Risikobewertung, SBOM, Beschreibung der App und Prüfberichten) und zehn Jahre aufbewahren.
13. Sicherheitshinweise für Nutzer:innen abnehmen (Anhang II: Kontakt, Supportdauer, sichere Nutzung).
14. EU-Konformitätserklärung unterschreiben und das CE-Kennzeichen auf der Website und der Erklärung anbringen.

Freiwillig: Förderprogramme für Kleinstunternehmen prüfen. Für Kleinstunternehmen sieht der CRA eine vereinfachte technische Dokumentation vor.

## Offene Fragen an Daria

- Welche Supportdauer soll gelten?
- Soll für Sicherheitsmeldungen ein eigenes Postfach entstehen, zum Beispiel security@kiezcoins.de?
