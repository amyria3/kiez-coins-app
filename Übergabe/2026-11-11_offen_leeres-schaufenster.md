# Leeres Schaufenster mit Platzhaltern

- Stand: 11.11.2026
- Auftrag: Daria, 11.11.2026: Verlauf als Hintergrundbild, schwarzer Avatar mit Kater-Maske als Platzhalter, Abschnitte für alle Angaben sichtbar („Noch keine Termine“, erster Platzhalter-Post, „AGB noch nicht hinterlegt“).
- Umgesetzt: öffentliche Seite `api/s.mjs` und Ansicht in der App `src/app/schaufenster/[id]/index.tsx` (Komponenten in `src/components/ShowcasePlaceholder.tsx`). Jede fehlende Angabe zeigt eine graue Zeile; ohne Titelbild ein Verlauf Lila–Rosa–Pfirsich, ohne Logo der schwarze Kater-Kreis.
- Neu: Feld „AGB“ (`showcases.terms`, Migration `supabase/migrations/20261111000100_schaufenster_agb.sql`), im Editor unter dem Impressum, auf der Seite eingeklappt. Ohne Migration bleibt alles wie vorher, nur ohne AGB-Feld.
- Offen: Migration ausführen; Datenbank-Doku in Documentation um `showcases.terms` ergänzen. Die öffentliche Seite ist wie bisher nur auf Deutsch; die App-Texte übersetzt DeepL im PR.
