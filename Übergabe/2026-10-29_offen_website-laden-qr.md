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

- [ ] Prüfen, ob `/laden` und `/qr` auf Vercel live sind (Push am 29.10.2026, Commit `04848db`). Am Telefon: `/laden` auf Android (Countdown, Abbrechen, Download), auf dem iPhone (Anleitung), in Instagram (Safari-Hinweis); `/qr` hochkant und quer, Vollbild, kein Ruhezustand.
- [ ] Die QR-Codes erst drucken, wenn `/laden` live ist.
- Am Rechner zeigt `/qr` die Codes nebeneinander, so groß es geht.
