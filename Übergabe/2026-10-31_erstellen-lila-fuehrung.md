# Erstellen: Ort und Typ werden nacheinander lila

- Datum: 2026-10-31
- Status: erledigt, Notiz für die Doku
- Ziel in Documentation: `kiez-coins/design/UX_UI_Regeln.md` (Umschalter) und `kiez-coins/app/Stand_App.md` (Erstellen)

## Daria hat entschieden

- Beim Erstellen ist die Auswahl im Ort-Umschalter (Privat, Gruppe, Kiez, Überall) zuerst lila. Berührt die Person den Umschalter, wird er schwarz-weiß.
- Danach wird die Auswahl im Typ-Umschalter (Bild, Me-Challenge, We-Challenge) lila, bis die Person ihn berührt. So bekommt sie mit, was eingestellt ist.
- Der Abstand zwischen beiden Umschaltern ist kleiner (12 statt 24 Punkte).

## Umsetzung

- `src/components/FeedHeader.tsx`: `Segments` und `TabsNavigation` nehmen `accent`.
- `src/components/compose/TypeSwitch.tsx`: lila, solange `turn` gilt und niemand getippt hat; sonst schwarz-weiß. Auch in `challenge/create/step-1.tsx` und `groups/[id]/task.tsx` lila bis zum ersten Tippen.
- `src/app/feed.tsx`: `placeTouched` steuert beides; ist nur ein Modus sichtbar, ist der Typ sofort dran.
