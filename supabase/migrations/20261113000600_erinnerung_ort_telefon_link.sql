-- Ort, Telefon und Link an Erinnerungen (Daria, 2026-11-13): Ein Tipp öffnet die Karten-App, ruft an oder öffnet
-- den Link. Alle drei freiwillig. Setzt 20261110000100_erinnerungen voraus.
alter table public.reminders add column if not exists place text;
alter table public.reminders add column if not exists phone text;
alter table public.reminders add column if not exists link text;

alter table public.reminders drop constraint if exists reminders_place_len;
alter table public.reminders add constraint reminders_place_len check (place is null or char_length(place) <= 200);
alter table public.reminders drop constraint if exists reminders_phone_len;
alter table public.reminders add constraint reminders_phone_len check (phone is null or char_length(phone) <= 40);
alter table public.reminders drop constraint if exists reminders_link_len;
alter table public.reminders add constraint reminders_link_len check (link is null or char_length(link) <= 500);
