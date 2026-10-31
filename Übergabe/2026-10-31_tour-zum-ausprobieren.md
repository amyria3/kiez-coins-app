# Wie geht KiezCoins: Beispiele zum Ausprobieren

Datum: 2026-10-31 · Status: umgesetzt, noch in die Doku übernehmen · Ziel in Documentation: `kiez-coins/app/Anleitung_App.md` (Tour), `kiez-coins/design/UX_UI_Regeln.md` (lila Ring)

## Entscheidungen von Daria (31.10.2026)

- „Dein Konto“: große Karte „Wie geht KiezCoins“ mit Fragezeichen statt der Zeile „So geht KiezCoins · Kurze Videos“ (es gab keine Videos).
- Die Beispiele der Tour lassen sich antippen (Variante A). Ein lila Ring zeigt den nächsten Schritt.

## Umsetzung

- `src/components/tour/TourDemo.tsx`: je Seite ein Beispiel mit Zustand, `NextStep` = pulsierender Ring in `color.accent.primary` (steht still bei „Bewegung reduzieren“). Nichts wird gespeichert.
    - Posten: Kamera → Erstellen-Karte → „Posten“ → Beitrag und Kater, „Noch mal“.
    - Annehmen und Gruppen: „Challenge annehmen“ → „Erledigt melden“ → Kater (Gruppe nennt die Edensteine).
    - Coins: Schalter „Das ist mir bares Geld wert“ → Coins am Beitrag.
    - Bild: Herz → Zahl zählt hoch.
    - Sichtbarkeit: Schalter 5 km → Satz, wer den Beitrag sieht.
    - Privat: Umschalter, der Hinweis wechselt mit, bei „Privat“ erscheint das private Bild.
- `src/app/tour.tsx`: Die Vorschau ist antippbar; beim Zurückblättern fängt ein Beispiel von vorn an.
- `TourOffer.tsx`: Text der Frage nennt Beispiele statt Videos und den neuen Namen.

## Offene Punkte

- Beim Bild umrahmt der Ring den ganzen Beitrag, nicht nur das Herz.
