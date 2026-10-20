-- Grober Punkt einer Challenge für „In der Nähe“ und Entfernungen („300 m“).
-- Die App rundet auf 3 Nachkommastellen (rund 100 m), eine genaue Adresse lässt sich daraus nicht ablesen.

alter table public.challenges
  add column lat double precision check (lat between -90 and 90),
  add column lng double precision check (lng between -180 and 180);

-- Entwürfe dürfen den Punkt mit ändern (wie Titel, Text und Ort)
grant update (lat, lng) on public.challenges to authenticated;
