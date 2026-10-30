# Website: Link /laden, Seite /qr und Überarbeitung vom 29.10.2026

Datum: 2026-10-29 · Status: offen, bis /laden und /qr live geprüft sind · Ziel in Documentation: `website/` (bzw. Abschnitt „Website“ in `app/Stand_App.md`), `kiez-coins/ENTSCHEIDUNGEN.md` (Abschnitt „Website“)

Quelle der Website: `scripts/build-download-site.mjs`, `scripts/site/`. Der Ordner `website/` entsteht beim Bauen und wird nicht committet.

## Entscheidungen von Daria (29.10.2026)

- Ein Link für alle Geräte: `kiezcoins.vercel.app/laden`.
    - Android: Fenster „Download startet in 30 Sek.“ mit Sekundärknopf „Download abbrechen“, danach startet die APK.
    - iPhone: zeigt die Web-App und erklärt, wie man sie auf den Home-Bildschirm legt. In App-Browsern (Instagram, TikTok …) Hinweis auf Safari.
    - Computer: QR-Code zu `/laden`.
- Zwei QR-Codes mit klarer Überschrift: „KiezCoins auschecken (zur Webseite)“ → `kiezcoins.vercel.app`, „KiezCoins direkt runterladen“ → `kiezcoins.vercel.app/laden`.
- Seite `/qr` zum Vorzeigen auf dem Handy: beide Codes mit flex-wrap, hochkant übereinander, quer nebeneinander. Knopf „Vollbild“; das Handy geht dabei nicht in den Ruhezustand.
- Startseite:
    - Telefon: Ort-Umschalter und Szenario-Leiste ausgeblendet, Me-Challenge-Titel „Waschtag mit Aussicht“, Sätze passen zum Stand des Prototyps.
    - Schwebender Knopf „Testen“ ab „Kann die App noch mehr?“, wackelt ab und zu.
    - Gründe als überlappende Karten wie ein Wiesental, die mittlere vorn und größer. Am Desktop kommt eine Karte per Hover nach vorn, die anderen blassen nach Abstand aus.
    - Leute: Auf dem Telefon ist die Person in der Bildschirmmitte 25 % größer und zeigt ihren Text, die anderen 10–15 % größer. Am Desktop alle größer.
    - Download-Überschrift „Überzeugt? Oder zumindest neugierig?“
    - Gegen Ruckeln und Springen: kein sticky Kartenstapel und kein Blur auf Telefon und Tablet, kein verzögertes Aufsteigen der Abschnitte.

## Umsetzung

- `/laden`: `ladenSeite` in `build-download-site.mjs` → `website/laden.html`. Erkennung per User-Agent. Der Countdown startet pro Tab nur einmal (`sessionStorage` `kc-laden`). Wer selbst auf den Download-Knopf tippt, stoppt den Countdown. Die iPhone-Web-App auf dem Home-Bildschirm springt direkt nach `/app/`.
- `/qr`: `qrSeite` → `website/qr.html`. QR-Codes als SVG aus dem Paket `qrcode`. Wach halten per Wake Lock, sonst per stummem Film in Schleife (`scripts/site/qr/qr-hoch.mp4`, `qr-quer.mp4`, je nach Ausrichtung). Vollbild per Fullscreen-API, auf dem iPhone über den Film (`webkitEnterFullscreen`).
- Druckvorlagen: QR-KiezCoins.pdf und PNGs, an Daria geschickt (nicht im Repo).

## Offene Punkte

- [x] `/laden` und `/qr` sind live (29.10.2026, per Abruf geprüft: Countdown und flex-wrap ausgeliefert).
- [ ] Am Telefon testen: `/laden` auf Android (Countdown, Abbrechen, Download), auf dem iPhone (Anleitung), in Instagram (Safari-Hinweis); `/qr` hochkant und quer, Vollbild, kein Ruhezustand.
- [ ] QR-Codes drucken (Daria). `/laden` ist live, die Druckvorlagen passen.
- Am Rechner zeigt `/qr` die Codes nebeneinander, so groß es geht.

## Nachgereicht (Daria, 29./30.10.2026, alles auf `main`)

- Startseite am Desktop: Szenario-Texte („Me-Challenge“, „We-Challenge“ …) so breit wie der Umschalter „Nur ich · Meine Gruppen · Mein Kiez · Überall“.
- Telefon-Prototyp: gewählter Reiter immer ganz lesbar, die anderen kürzen mit „…“ (auf Englisch ist „Neighborhood“ lang).
- Große Abschnitte und Karten unten mit doppeltem Abstand (`seite.css`, Block am Ende).
- Vercel leitet alte deutsche Pfade der Web-App auf die englischen um (`vercel.json`, siehe `2026-10-30_routen-englisch.md`).
- Der Prototyp sagt in den Gruppen noch „Aufgabe“ statt „We-Challenge“.
