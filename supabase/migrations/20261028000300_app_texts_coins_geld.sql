-- Coins und Geld in den Nutzungsbedingungen (Daria, 28.10.2026): die geänderten Texte aus src/data/legal.ts im Texte-CMS.
-- Übersetzungen liegen in src/i18n/<sprache>.json; die Sprachspalten bleiben leer.
-- Voraussetzung: 1400 (app_texts_languages). Läuft auch mehrfach ohne Fehler.

insert into public.app_texts (original, text, ort) values
  ('Coins sind Versprechen von realem Geld. Das Konzept befindet sich in der Testphase. Kiez Coins ist nicht Vertragspartei, nimmt kein Geld an und zahlt keins aus. Das Geld fließt direkt per Überweisung oder PayPal. Barzahlung und Treffen zur Zahlung sind nicht vorgesehen.', 'Coins sind Versprechen von realem Geld. Das Konzept befindet sich in der Testphase. Kiez Coins ist nicht Vertragspartei, nimmt kein Geld an und zahlt keins aus. Das Geld fließt direkt per Überweisung oder PayPal. Barzahlung und Treffen zur Zahlung sind nicht vorgesehen.', 'src/data/legal.ts (Rechtstexte, Nutzungsbedingungen)'),
  ('Edensteine sind eine ideelle Anerkennung. Sie lassen sich weder kaufen noch in Geld tauschen.', 'Edensteine sind eine ideelle Anerkennung. Sie lassen sich weder kaufen noch in Geld tauschen.', 'src/data/legal.ts (Rechtstexte, Nutzungsbedingungen)')
on conflict (original) do update set ort = excluded.ort;
