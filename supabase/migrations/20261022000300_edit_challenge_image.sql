-- Foto einer eigenen Challenge austauschen, solange niemand sie angenommen hat (wie edit_open_challenge).
-- Die App lädt das neue Foto vorher in den Speicher hoch und übergibt hier nur den Pfad.

create function public.set_challenge_image(p_challenge_id uuid, p_image_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_image_path is null or btrim(p_image_path) = '' then
    raise exception 'Das Foto fehlt.' using errcode = 'P0001', hint = 'missing_image';
  end if;
  update public.challenges
     set image_path = p_image_path
   where id = p_challenge_id and author_id = auth.uid() and status = 'open' and assignee_id is null;
  if not found then perform public.challenge_not_changed('bearbeitet werden'); end if;
end;
$$;

revoke execute on function public.set_challenge_image(uuid, text) from public, anon;
grant execute on function public.set_challenge_image(uuid, text) to authenticated;
