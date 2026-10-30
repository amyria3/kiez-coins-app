# Neue Community-Regeln sind in App und Website

Stand: 27.10.2026. Status: offen (Migration und ein Widerspruch zum Alter). Das Ergebnis gehört in Documentation nach `kiez-coins/ENTSCHEIDUNGEN.md`, Abschnitt „Rechtstexte“, und in die Datenbank-Doku zu `app_texts`.

Pflichtaufgabe: Migration `supabase/migrations/20261028000200_app_texts_community_regeln.sql` im Supabase-SQL-Editor ausführen. Sie trägt die neuen Texte ins Texte-CMS ein. Ohne sie zeigt die App die Regeln trotzdem richtig, der Editor unter „Dein Konto › Texte“ listet sie nur nicht.

## Was sich geändert hat

- Daria hat am 27.10.2026 neue Community-Regeln geschickt. Sie stehen wortgetreu in `src/data/legal.ts`, bis auf diese Korrekturen: „nichttoleriert“ → „nicht toleriert“, „ebensowenig“ → „ebenso wenig“, „KI generierte“ → „KI-generierte“, „wohl fühlen“ → „wohlfühlen“, Bindestrich → Gedankenstrich vor „besser Vorsicht als Nachsicht“, „Beabsichtigte Falschmeldungen mit Absicht“ → „Beabsichtigte Falschmeldungen“.
- Neue Abschnitte: „KiezCoins baut auf gegenseitiges Vertrauen“, „Gemeinschaft braucht Verlässlichkeit“, „Kinder“ und der Schluss „Let’s have fun & do some good / Cat The Käptn“ (Abschnitt ohne Überschrift).
- `LEGAL_STAND` ist jetzt 27.10.2026. Das Datum gilt für alle vier Rechtstexte.
- Übersetzungen in `src/i18n/{en,fr,uk,ru,ar,he}.json` sind neu, die alten Schlüssel entfernt. Die Website-Seite `website/community-regeln.html` ist mit `node scripts/build-download-site.mjs` neu erzeugt.

## Offene Fragen an Daria

- Der Abschnitt „Kinder“ erlaubt Kindern die Nutzung über Eltern oder Lehrkräfte. Nutzungsbedingungen (Abschnitt 2, „ab 18 Jahren“) und Datenschutz (Abschnitt „Alter“: „ab 18 Jahren. Wir verarbeiten keine Daten von Kindern.“) sagen das Gegenteil. Beide Texte brauchen eine Anpassung, bevor die Regel gilt.
- Die Überschrift schreibt „KiezCoins“, der Rest der App „KiezCoins“. Siehe `2026-10-24_offen_umbenennung-kiezkoinz.md`.
- Die Nutzungsbedingungen (Abschnitt 3) erwähnen noch „Werbung“ als verboten; die neuen Regeln nennen Werbung nicht mehr.
