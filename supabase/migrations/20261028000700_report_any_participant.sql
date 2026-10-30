-- Erledigt melden: jede teilnehmende Person, nicht nur die erste (Daria, 28.10.2026).
-- Die Meldung gilt weiter für alle. Läuft auch ein zweites Mal ohne Fehler.

create or replace function public.report_challenge(p_challenge_id uuid, p_photo_path text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_photo_path is null or p_photo_path not like auth.uid()::text || '/%' then
    raise exception 'Ein eigenes Nachher-Foto ist Pflicht.' using errcode = 'P0001', hint = 'photo_required';
  end if;
  update public.challenges c
     set status = 'reported', report_photo_path = p_photo_path, report_note = nullif(btrim(p_note), ''),
         reported_at = now()
   where c.id = p_challenge_id and c.status = 'accepted'
     and (
       c.assignee_id = auth.uid()
       or exists (
         select 1 from public.challenge_participants p
          where p.challenge_id = c.id and p.user_id = auth.uid() and p.status = 'joined'
       )
     );
  if not found then perform public.challenge_not_changed('als erledigt gemeldet werden'); end if;
end;
$$;
