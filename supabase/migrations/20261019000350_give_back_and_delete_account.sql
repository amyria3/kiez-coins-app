-- Funktionen, die Zeilen löschen: Challenge abgeben und Konto löschen.

create function public.give_back_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.challenges
     set status = 'open', assignee_id = null, accepted_at = null, rejection_reason = null,
         report_photo_path = null, report_note = null, reported_at = null
   where id = p_challenge_id and status = 'accepted' and assignee_id = auth.uid();
  if not found then perform public.challenge_not_changed('abgegeben werden'); end if;
  delete from public.payout_shares where challenge_id = p_challenge_id;
  delete from public.operation_names where challenge_id = p_challenge_id;
end;
$$;

-- Konto löschen (Apple-Pflicht, DSGVO). Löscht das Konto samt Profil, Challenges,
-- Kommentaren und Zahlungsdaten über die Fremdschlüssel.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet.' using errcode = 'P0001';
  end if;
  if public.has_open_work() then
    raise exception 'Offene Bounties musst Du vorher klären.' using errcode = 'P0001', hint = 'open_work';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.give_back_challenge(uuid), public.delete_my_account() from public, anon;
grant execute on function public.give_back_challenge(uuid), public.delete_my_account() to authenticated;
