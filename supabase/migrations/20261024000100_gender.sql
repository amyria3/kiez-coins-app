-- Grammatisches Geschlecht (Daria, 24.10.2026): „er“, „sie“ oder „unbestimmt (Person)“.
-- Die App wählt damit Texte an die Person und Texte über die Person (Pronomen, „Initiator“/„Initiatorin“/„Initiator:in“).
-- Öffentlich lesbar wie Deckname und Kiez, da Texte über eine Person ihr Pronomen brauchen.

alter table public.profiles
  add column if not exists gender text not null default 'person'
  constraint profiles_gender_check check (gender in ('er', 'sie', 'person'));

grant update (gender) on public.profiles to authenticated;
