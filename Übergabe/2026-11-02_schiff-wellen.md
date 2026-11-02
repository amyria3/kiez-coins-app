# Schiffchen mit Linien, auf Wellen vor „Was Du so machst“

- Datum: 2026-11-02
- Status: erledigt, Notiz für die Doku
- Ziel in Documentation: `kiez-coins/ENTSCHEIDUNGEN.md` und `kiez-coins/design/Icon_Regelwerk.md`

## Daria hat entschieden

- Das Schiff-Icon bekommt Linien wie die Krone.
- In „Was Du so machst“ steht links vor dem Titel das Schiffchen, das schwarz-weiß auf ruhigen Wellen schaukelt.
- Daneben steht die Krone. Sie ist das Zeichen für „Was Du so machst“ (wie im Konto); das Schiffchen schmückt.

## Umsetzung

- `assets/icons/ship.svg` und `ship` in `src/components/icons/svgs.ts`: vier Striche aus der Krone, gedreht, als Aussparungen im Rumpf (`fill-rule="evenodd"`).
- `src/components/SchiffWellen.tsx`: Schiffchen (38 pt breit) schaukelt (±1,5 pt, −4° bis 3°, 3,2 s), zwei Wellenlinien in Textfarbe laufen nach links (vorn 3,6 s, hinten 5,2 s, halb durchsichtig). Mit „Bewegung reduzieren“ steht alles still. Nur im Kiez-Look.
- `src/app/me.tsx`: Titelzeile mit `SchiffWellen`, daneben `CrownIcon` (30 pt hoch), dann der Titel.
