-- Kurzname eines öffentlichen Schaufensters zur id, auch ohne Anmeldung (2026-11-24).
-- Wer ohne Anmeldung app.kiezcoins.de/schaufenster/<id> öffnet, darf die Tabelle showcases nicht lesen. Die App sah
-- „Dieses Schaufenster gibt es nicht mehr“. Jetzt leitet sie Gäste zur öffentlichen Seite kiezcoins.de/s/<kurzname>
-- weiter (Daria, 2026-11-24: „Ja“). Die Funktion verrät nur, was die öffentliche Seite ohnehin zeigt: den Kurznamen,
-- und nur bei Sichtbarkeit „Alle“ und wenn das Schaufenster online ist. Sonst null.
--
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

create or replace function public.public_showcase_slug_of(p_showcase uuid)
returns text language sql stable security definer set search_path = '' as $$
  select s.slug from public.showcases s
   where s.id = p_showcase and s.visibility = 'public' and public.showcase_online(s.id);
$$;
revoke all on function public.public_showcase_slug_of(uuid) from public;
grant execute on function public.public_showcase_slug_of(uuid) to anon, authenticated;
