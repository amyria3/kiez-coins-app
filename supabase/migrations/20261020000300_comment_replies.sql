-- Antworten auf Kommentare: Ein Kommentar kann auf einen anderen Kommentar derselben Challenge antworten.
-- Eine Ebene: Die App hängt Antworten immer an den ersten Kommentar eines Gesprächs.

alter table public.comments
  add constraint comments_id_challenge_key unique (id, challenge_id);

alter table public.comments
  add column reply_to_id uuid;

-- Zusammengesetzter Fremdschlüssel: Die Antwort gehört zwingend zur selben Challenge.
-- Wird der Ausgangskommentar gelöscht, bleibt die Antwort stehen, nur reply_to_id wird leer.
alter table public.comments
  add constraint comments_reply_to_fkey
  foreign key (reply_to_id, challenge_id) references public.comments (id, challenge_id)
  on delete set null (reply_to_id);

create index comments_reply_to_idx on public.comments (reply_to_id);
