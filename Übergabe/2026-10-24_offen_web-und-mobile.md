# Web-App und Mobile: offene Abweichungen

Datum: 2026-10-24
Status: offen
Ergebnis gehört nach Documentation: `kiez-coins/app/Web_und_Mobile.md`

Aus Claudes Code-Prüfung vom 2026-10-23, nicht von Daria. Umsetzen erst nach ihrem Auftrag.

- **Modale Seiten.** Auf iOS und Android fahren Bearbeiten, Melden und Ablehnen von unten herein (`presentation: 'modal'`). Im Web erscheinen sie wie normale Seiten ohne Bewegung von unten.
- **Push-Nachrichten.** Die PWA kann keine Push-Nachrichten empfangen. Die native App kann es auch noch nicht, da expo-notifications fehlt. Der Schalter in `onboarding/push` speichert nur den Wunsch.
- **Kamera-Pill im Feed.** Die Pill zeigt eine Kamera. Im Web öffnet sie nur die Dateiauswahl, da die Option „Foto aufnehmen“ fehlt. Auf iPhone-Safari bietet die Dateiauswahl die Kamera trotzdem an.
- **App-Icon auf dem Home-Bildschirm.** iOS hält das alte Touch-Icon im Speicher. Ein neues Icon erscheint erst, nachdem die Verknüpfung gelöscht und neu angelegt wurde.
