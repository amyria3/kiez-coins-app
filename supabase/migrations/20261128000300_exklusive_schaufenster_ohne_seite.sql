-- Posts aus exklusiven Schaufenstern (visibility 'invite') bekommen keine öffentliche Seite kiezcoins.de/c/<id>
-- (Daria, 2026-11-28). Dort sehen Posts nur Team und Eingeladene. Bisher prüfte can_have_share_page das Schaufenster
-- nicht: share_challenge gab solche Posts frei, und Weiterposten schickte sie auf alle Plattformen.
-- Weiterposten nimmt sie jetzt nur nach Telegram, mit Link in die App (Edge Function `weiterposten`).
-- Gilt für share_challenge, shared_post und Weiterposten. Schon geteilte Seiten solcher Posts sind danach weg.
-- Voraussetzung: 20261116000200_sehr_privat.sql. Läuft auch mehrfach ohne Fehler.

create or replace function public.can_have_share_page(c public.challenges)
returns boolean
language sql
stable
set search_path = ''
as $$
  select c.visibility = 'public' and c.group_id is null and not coalesce(c.local_only, false)
     and not coalesce(c.very_private, false)
     and c.status not in ('draft', 'deleted')
     and not exists (select 1 from public.profiles p where p.id = c.author_id and p.banned_at is not null)
     and not exists (select 1 from public.showcases s where s.id = c.showcase_id and s.visibility <> 'public');
$$;
revoke execute on function public.can_have_share_page(public.challenges) from public, anon, authenticated;
