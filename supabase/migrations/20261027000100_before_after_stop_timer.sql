-- Me-Challenge: Timer stoppen, der Entwurf bleibt (Daria, 26.10.2026).
-- Wer den Timer aus Versehen oder zu früh gestartet hat, macht daraus wieder einen Entwurf ohne Timer.
-- Danach zählt die Challenge nicht mehr als gestartet: keine Leiste im Feed, kein Posten nach 48 h.
-- Voraussetzung: 20261023000300_before_after. Das Skript läuft auch ein zweites Mal ohne Fehler.

create or replace function public.stop_before_after_timer(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.challenges
     set timer_started_at = null
   where id = p_challenge_id and author_id = auth.uid() and status = 'draft' and type = 'before_after';
  if not found then perform public.challenge_not_changed('gestoppt werden'); end if;
end;
$$;

revoke execute on function public.stop_before_after_timer(uuid) from public, anon;
grant execute on function public.stop_before_after_timer(uuid) to authenticated;
