-- Kiez Coins: Datenmodell für Konto und Challenge-Ablauf (MVP).
-- Regeln aus kiez-coins/konto/MVP_Konto.md und den Figma-Flows
-- „Challenge erfüllen“, „Challenge erstellen“, „Erledigung bestätigen“, „Bounty auf Vertrauen“.
--
-- Grundsätze:
-- * Jede Tabelle hat Row Level Security. Die App nutzt nur den Publishable Key.
-- * Statuswechsel einer Challenge laufen ausschließlich über die Funktionen unten.
--   Direktes UPDATE auf challenges ist für die App nicht erlaubt.
-- * Zahlungsdaten sind privat. Die Ersteller:in sieht eine Freigabe erst nach der Bestätigung.

-- ---------------------------------------------------------------------------
-- Profile
-- ---------------------------------------------------------------------------

-- Öffentlicher Teil: Deckname, Kiez, Bild. Für alle angemeldeten Personen lesbar.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text check (char_length(btrim(handle)) between 1 and 30),
  avatar_path text,
  kiez text,
  is_group boolean not null default false,
  -- Wird nach einer bestätigten Meldung „Bounty nicht gezahlt“ von der Moderation auf false gesetzt.
  can_offer_bounties boolean not null default true,
  banned_at timestamptz,
  ban_reason text,
  created_at timestamptz not null default now()
);
comment on column public.profiles.handle is 'Deckname, öffentlich und einmalig (ohne Groß-/Kleinschreibung)';
create unique index profiles_handle_unique on public.profiles (lower(btrim(handle)));

-- Privater Teil: nur für die Person selbst.
create table public.profile_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  address_form text check (address_form in ('pirat_colon', 'pirat_star', 'pirat', 'piratin', 'the_pirat', 'custom')),
  address_custom text check (char_length(address_custom) <= 30),
  push boolean not null default true,
  onboarded boolean not null default false,
  paused_until timestamptz,
  age_confirmed_at timestamptz,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Gespeicherte Zahlungsdaten im Konto, optional und privat.
create table public.payout_details (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  account_holder text,
  iban text,
  paypal text,
  updated_at timestamptz not null default now(),
  constraint payout_details_method check (nullif(btrim(iban), '') is not null or nullif(btrim(paypal), '') is not null)
);

-- Profil und Einstellungen entstehen automatisch mit dem Konto.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.profile_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Challenges
-- ---------------------------------------------------------------------------

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'individual' check (type in ('individual', 'wave')),
  title text not null check (char_length(btrim(title)) between 1 and 60),
  body text not null default '' check (char_length(body) <= 500),
  -- Nur bei Wave: Text der ursprünglichen Challenge
  challenge_text text,
  author_id uuid not null references public.profiles (id) on delete cascade,
  assignee_id uuid references public.profiles (id) on delete set null,
  location text not null check (char_length(btrim(location)) between 1 and 120),
  kiez text,
  bounty_amount integer check (bounty_amount between 5 and 50),
  status text not null default 'open'
    check (status in ('open', 'accepted', 'reported', 'confirmed', 'payment_open', 'paid_marked', 'paid')),
  image_path text,
  image_before_path text,
  image_after_path text,
  deadline timestamptz not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  report_photo_path text,
  report_note text check (char_length(report_note) <= 280),
  reported_at timestamptz,
  rejection_reason text check (char_length(rejection_reason) <= 280),
  confirmed_at timestamptz,
  paid_marked_at timestamptz,
  paid_at timestamptz,
  constraint challenges_assignee_not_author check (assignee_id is null or assignee_id <> author_id)
);
create index challenges_created_at_idx on public.challenges (created_at desc);
create index challenges_author_idx on public.challenges (author_id);
create index challenges_assignee_idx on public.challenges (assignee_id);
create index challenges_kiez_status_idx on public.challenges (kiez, status);

-- Kiez der Challenge kommt aus dem Profil der Ersteller:in.
create function public.set_challenge_kiez()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.kiez into new.kiez from public.profiles p where p.id = new.author_id;
  return new;
end;
$$;

create trigger challenges_set_kiez
  before insert on public.challenges
  for each row execute function public.set_challenge_kiez();

-- Darf die angemeldete Person mitmachen? Kiez festgelegt, nicht gesperrt, nicht pausiert.
create function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.profile_settings s on s.user_id = p.id
    where p.id = (select auth.uid())
      and p.kiez is not null
      and p.handle is not null
      and p.banned_at is null
      and (s.paused_until is null or s.paused_until < now())
  );
$$;

-- Privater Operationsname: nur für die annehmende Person.
create table public.operation_names (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Leer = bewusst ohne Taufe
  name text not null default '' check (char_length(name) <= 40),
  created_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index operation_names_user_idx on public.operation_names (user_id);

-- Öffentliche Kommentare unter einer Challenge (kein privater Chat im MVP).
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index comments_challenge_idx on public.comments (challenge_id, created_at);
create index comments_author_idx on public.comments (author_id);

create table public.likes (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index likes_user_idx on public.likes (user_id);

-- Freigabe der Zahlungsdaten für genau eine Challenge (Figma `payout_share`).
-- Kopie der Daten, damit die Freigabe auch ohne gespeicherte Daten im Konto funktioniert.
create table public.payout_shares (
  challenge_id uuid primary key references public.challenges (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  method text not null check (method in ('iban', 'paypal')),
  account_holder text,
  iban text,
  paypal text,
  created_at timestamptz not null default now(),
  constraint payout_shares_method_data check (
    (method = 'iban' and nullif(btrim(iban), '') is not null)
    or (method = 'paypal' and nullif(btrim(paypal), '') is not null)
  )
);
create index payout_shares_user_idx on public.payout_shares (user_id);

-- Meldungen an die Moderation.
create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id uuid references public.challenges (id) on delete set null,
  reason text not null check (reason in ('not_paid', 'abusive', 'spam', 'other')),
  description text check (char_length(description) <= 500),
  status text not null default 'new' check (status in ('new', 'confirmed', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint user_reports_not_self check (reporter_id <> reported_id)
);
create index user_reports_reporter_idx on public.user_reports (reporter_id);
create index user_reports_reported_idx on public.user_reports (reported_id);
create index user_reports_challenge_idx on public.user_reports (challenge_id);

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index support_requests_user_idx on public.support_requests (user_id);
