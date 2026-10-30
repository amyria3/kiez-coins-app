-- Knöpfe zählen (Daria, 30.10.2026): Welcher Kamera-Knopf wird häufiger gedrückt, oben neben den Reitern
-- oder unten in der Leiste? Jede Berührung ist eine Zeile mit Knopf, Look und Zeitpunkt. Ohne Person, ohne Gerät.
--
-- Einfügen dürfen alle, auch ohne Konto (Beispieldaten). Lesen nur Moderatorinnen, im Umfrage-Ergebnis.
-- Ohne Funktion und ohne Dollarzeichen, damit das Skript beim Kopieren aus dem Chat heil bleibt.
-- Läuft auch mehrfach ohne Fehler.

create table if not exists public.button_presses (
  id bigint generated always as identity primary key,
  button text not null check (char_length(button) between 1 and 40),
  look text check (look is null or char_length(look) <= 20),
  created_at timestamptz not null default now()
);

alter table public.button_presses enable row level security;
revoke all on public.button_presses from anon, authenticated;
grant insert (button, look) on public.button_presses to anon, authenticated;
grant select on public.button_presses to authenticated;

drop policy if exists "Knopf zählen" on public.button_presses;
create policy "Knopf zählen" on public.button_presses for insert to anon, authenticated
  with check (true);

drop policy if exists "Knöpfe auswerten" on public.button_presses;
create policy "Knöpfe auswerten" on public.button_presses for select to authenticated
  using ((select public.is_moderator()));
