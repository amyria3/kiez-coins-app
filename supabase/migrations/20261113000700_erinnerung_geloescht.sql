-- Erledigte Karten löschen (Daria, 2026-11-13): Die Erinnerung verschwindet aus der Liste und zählt im Kalender
-- weder als aufgegeben noch als abgebrochen. Erledigungen in reminder_done bleiben und stehen weiter im Kalender.
-- Setzt 20261113000400_erinnerung_ausgang voraus. Ohne diese Migration löscht die App trotzdem, nur ohne Angabe.
alter table public.reminders drop constraint if exists reminders_ended_as_check;
alter table public.reminders add constraint reminders_ended_as_check
  check (ended_as is null or ended_as in ('given_up', 'cancelled', 'deleted'));
