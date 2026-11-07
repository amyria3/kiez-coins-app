-- Posts nur mit Text: Schriftgröße und Ausrichtung (Daria, 07.11.2026).
-- Beides steht mit der Schrift in der Spalte `sheet_font`, getrennt durch `|`: Schrift, Größe (0.90 bis 1.30,
-- zwei Nachkommastellen) und Ausrichtung (left oder center), z. B. `rubik|1.15|center`.
-- Ohne Größe und Ausrichtung steht dort wie bisher nur die Schrift. Die App liest beides in src/data/sheetFonts.ts.
-- Voraussetzung: 20261107000100 (text_posts). Läuft auch mehrfach ohne Fehler.

alter table public.challenges drop constraint if exists challenges_sheet_font_check;
alter table public.challenges add constraint challenges_sheet_font_check check (
  sheet_font is null
  or (
    sheet_font ~ '^[a-z]+(\|[01]\.[0-9]{2}\|(left|center))?$'
    and split_part(sheet_font, '|', 1) in ('inter', 'redaction', 'rubik', 'barriecito', 'nothing', 'playwrite', 'patrick', 'mono')
    and (split_part(sheet_font, '|', 2) = '' or split_part(sheet_font, '|', 2)::numeric between 0.9 and 1.3)
  )
);
