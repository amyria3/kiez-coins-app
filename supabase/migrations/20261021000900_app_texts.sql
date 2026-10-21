-- Einfaches CMS für Button-Beschriftungen und Kater-Texte.
--
-- Jede Zeile ist ein Text aus dem Code. Spalte `original` ist der Text im Code (Schlüssel, nicht ändern),
-- Spalte `text` die Fassung, die die App zeigt. Daria ändert `text` im Table Editor. Platzhalter wie
-- {anrede} oder {name} setzt die App ein, sie müssen in `text` erhalten bleiben.
-- Spalte `ort` sagt, wo der Text vorkommt. Leerer `text` oder gleich `original`: Die App zeigt das Original.
--
-- Lesen dürfen alle (auch vor der Anmeldung, für Start und Onboarding). Schreiben nur im Dashboard.
-- Neue Texte aus dem Code: `node scripts/app-texts.mjs` erzeugt das passende SQL.

create table public.app_texts (
  original text primary key,
  text text not null default '',
  ort text,
  updated_at timestamptz not null default now()
);

alter table public.app_texts enable row level security;
revoke insert, update, delete on public.app_texts from anon, authenticated;
grant select on public.app_texts to anon, authenticated;
create policy "Texte lesen" on public.app_texts for select to anon, authenticated using (true);

-- Zeitpunkt der letzten Änderung, damit im Table Editor sichtbar ist, was zuletzt angepasst wurde
create function public.touch_app_texts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger app_texts_touch
  before update of text on public.app_texts
  for each row execute function public.touch_app_texts();

-- 138 Texte aus dem Code (scripts/app-texts.mjs)
insert into public.app_texts (original, text, ort) values
  ('1 offene Aufgabe ansehen', '1 offene Aufgabe ansehen', 'src/app/gruppen/[id]/index.tsx (Button)'),
  ('3 Monate pausieren', '3 Monate pausieren', 'src/app/account/pause/index.tsx (Button)'),
  ('Abbrechen', 'Abbrechen', 'src/app/account/delete/index.tsx (Button), src/app/account/pause/index.tsx (Button)'),
  ('Ablehnen', 'Ablehnen', 'src/app/challenge/[id]/review/index.tsx (Button)'),
  ('Ahoi, {anrede}! Hier trimmst Du Dein Schiff. Tipp einfach auf das, was Du ändern willst.', 'Ahoi, {anrede}! Hier trimmst Du Dein Schiff. Tipp einfach auf das, was Du ändern willst.', 'src/app/account/index.tsx (Text)'),
  ('Ahoi, {anrede}! Ist das Dein Heimathafen?', 'Ahoi, {anrede}! Ist das Dein Heimathafen?', 'src/app/onboarding/kiez.tsx (Text)'),
  ('Ahoi, {anrede}! Wo liegt Dein Heimathafen? Am besten fragst Du, wenn Du zu Hause bist.', 'Ahoi, {anrede}! Wo liegt Dein Heimathafen? Am besten fragst Du, wenn Du zu Hause bist.', 'src/app/onboarding/kiez.tsx (Text)'),
  ('Aktuellen Standort verwenden', 'Aktuellen Standort verwenden', 'src/app/challenge/create/step-2.tsx (Button)'),
  ('Als bezahlt markieren', 'Als bezahlt markieren', 'src/app/challenge/[id]/pay/index.tsx (Button), src/app/challenge/[id]/review/success.tsx (Button)'),
  ('Als Entwurf speichern', 'Als Entwurf speichern', 'src/app/challenge/create/step-1.tsx (Button), src/app/challenge/create/step-2.tsx (Button)'),
  ('Als unbezahlt markieren', 'Als unbezahlt markieren', 'src/app/challenge/[id]/pay/success.tsx (Button)'),
  ('Anfrage senden', 'Anfrage senden', 'src/app/account/support/index.tsx (Button)'),
  ('Anheuern', 'Anheuern', 'src/app/onboarding/welcome.tsx (Button)'),
  ('Anmelden', 'Anmelden', 'src/app/onboarding/email.tsx (Button)'),
  ('Ansehen', 'Ansehen', 'src/app/manage.tsx (Button)'),
  ('Aufgabe annehmen', 'Aufgabe annehmen', 'src/app/challenge/[id]/index.tsx (Button)'),
  ('Aufgabe erstellen', 'Aufgabe erstellen', 'src/app/gruppen/[id]/index.tsx (Button)'),
  ('Aufgabe veröffentlichen', 'Aufgabe veröffentlichen', 'src/app/gruppen/[id]/aufgabe.tsx (Button)'),
  ('Aufgabe zurück schicken', 'Aufgabe zurück schicken', 'src/app/challenge/[id]/review/reject.tsx (Button)'),
  ('Aufgaben ansehen', 'Aufgaben ansehen', 'src/app/gruppen/[id]/index.tsx (Button)'),
  ('Bearbeiten', 'Bearbeiten', 'src/app/challenge/create/preview.tsx (Button), src/app/manage.tsx (Button)'),
  ('Beitreten', 'Beitreten', 'src/app/gruppen/beitreten.tsx (Button)'),
  ('Bestätigen', 'Bestätigen', 'src/app/account/email.tsx (Button), src/app/challenge/[id]/review/index.tsx (Button), src/app/moderation.tsx (Button), src/app/onboarding/code.tsx (Button), src/app/onboarding/email.tsx (Button)'),
  ('Blockierung aufheben', 'Blockierung aufheben', 'src/app/account/blocked.tsx (Button)'),
  ('Bounty bestätigen', 'Bounty bestätigen', 'src/app/challenge/[id]/index.tsx (Button)'),
  ('Bounty bezahlen', 'Bounty bezahlen', 'src/app/challenge/[id]/index.tsx (Button)'),
  ('Challenge abgeben', 'Challenge abgeben', 'src/app/challenge/[id]/index.tsx (Button)'),
  ('Challenge annehmen', 'Challenge annehmen', 'src/app/challenge/[id]/index.tsx (Button)'),
  ('Challenge ansehen', 'Challenge ansehen', 'src/app/challenge/create/success.tsx (Button)'),
  ('Challenge öffnen', 'Challenge öffnen', 'src/app/moderation.tsx (Button)'),
  ('Code neu senden', 'Code neu senden', 'src/app/onboarding/code.tsx (Button), src/app/onboarding/email.tsx (Button)'),
  ('Code senden', 'Code senden', 'src/app/account/email.tsx (Button)'),
  ('Code teilen', 'Code teilen', 'src/app/gruppen/[id]/index.tsx (Button)'),
  ('Danke, dass Du anpackst! Mach am Ende ein Foto vom Ergebnis, dann kann {name} bestätigen.', 'Danke, dass Du anpackst! Mach am Ende ein Foto vom Ergebnis, dann kann {name} bestätigen.', 'src/app/challenge/[id]/index.tsx (Text)'),
  ('Dein Rufname', 'Dein Rufname', 'src/app/onboarding/deckname.tsx (Kater)'),
  ('Der Code ist unterwegs an {adresse}. Schau auch im Spam-Netz.', 'Der Code ist unterwegs an {adresse}. Schau auch im Spam-Netz.', 'src/app/account/email.tsx (Text)'),
  ('Der Code ist unterwegs! Schau in Dein Postfach, zur Not auch im Spam-Netz.', 'Der Code ist unterwegs! Schau in Dein Postfach, zur Not auch im Spam-Netz.', 'src/app/onboarding/code.tsx (Kater)'),
  ('Diese Gruppe gibt es nicht mehr, oder Du bist nicht mehr dabei.', 'Diese Gruppe gibt es nicht mehr, oder Du bist nicht mehr dabei.', 'src/app/gruppen/[id]/index.tsx (Kater)'),
  ('Diesen Kiez übernehmen', 'Diesen Kiez übernehmen', 'src/app/onboarding/kiez.tsx (Button)'),
  ('Doch mit Passwort', 'Doch mit Passwort', 'src/app/onboarding/email.tsx (Button)'),
  ('Du hast angepackt, {anrede}. Ich schnurre.', 'Du hast angepackt, {anrede}. Ich schnurre.', 'src/data/reise.ts (Text)'),
  ('Du hast noch keine laufende Challenge. Fang mit einem Foto an.', 'Du hast noch keine laufende Challenge. Fang mit einem Foto an.', 'src/app/manage.tsx (Kater)'),
  ('Du meldest Dich per Code an. Leg ein Passwort fest, dann geht es auch ohne Mail.', 'Du meldest Dich per Code an. Leg ein Passwort fest, dann geht es auch ohne Mail.', 'src/app/account/credentials.tsx (Kater)'),
  ('Du willst von Bord? Schade, {anrede}. Bevor Du gehst:', 'Du willst von Bord? Schade, {anrede}. Bevor Du gehst:', 'src/app/account/delete/index.tsx (Text)'),
  ('Eine Deiner Challenges ist geschafft. Ich bin stolz auf diesen Kiez!', 'Eine Deiner Challenges ist geschafft. Ich bin stolz auf diesen Kiez!', 'src/data/reise.ts (Text)'),
  ('Endgültig löschen', 'Endgültig löschen', 'src/app/manage.tsx (Button)'),
  ('Erlauben', 'Erlauben', 'src/app/onboarding/push.tsx (Button)'),
  ('Erledigt melden', 'Erledigt melden', 'src/app/challenge/[id]/index.tsx (Button)'),
  ('Erledigung prüfen', 'Erledigung prüfen', 'src/app/challenge/[id]/index.tsx (Button)'),
  ('Erledigung senden', 'Erledigung senden', 'src/app/challenge/[id]/report/index.tsx (Button)'),
  ('Erst mal Deine Flaschenpost-Adresse. Dann schick ich Dir einen Code, oder Du legst ein Passwort fest.', 'Erst mal Deine Flaschenpost-Adresse. Dann schick ich Dir einen Code, oder Du legst ein Passwort fest.', 'src/app/onboarding/email.tsx (Kater)'),
  ('Ganz schön ruhig hier. Ich leg mich so lange in die Sonne.', 'Ganz schön ruhig hier. Ich leg mich so lange in die Sonne.', 'src/data/reise.ts (Text)'),
  ('Gemeinsam statt einsam', 'Gemeinsam statt einsam', 'src/app/gruppen/index.tsx (Kater, Überschrift)'),
  ('Gemeldet! Wohin soll {name} Dir die {betrag} schicken?', 'Gemeldet! Wohin soll {name} Dir die {betrag} schicken?', 'src/app/challenge/[id]/report/payout.tsx (Text)'),
  ('Gerade nutzt Du {adresse}. An die neue schick ich Dir einen Code.', 'Gerade nutzt Du {adresse}. An die neue schick ich Dir einen Code.', 'src/app/account/email.tsx (Text)'),
  ('Gib mindestens Deine IBAN oder PayPal an.', 'Gib mindestens Deine IBAN oder PayPal an.', 'src/app/challenge/[id]/report/payout.tsx (Text)'),
  ('Goldalarm, {anrede}! Bei einer Deiner Challenges bist Du dran.', 'Goldalarm, {anrede}! Bei einer Deiner Challenges bist Du dran.', 'src/data/reise.ts (Text)'),
  ('Gruppe auflösen', 'Gruppe auflösen', 'src/app/gruppen/[id]/index.tsx (Button)'),
  ('Gruppe gründen', 'Gruppe gründen', 'src/app/gruppen/index.tsx (Button), src/app/gruppen/neu.tsx (Button), src/components/GroupBar.tsx (Button)'),
  ('Gruppe verlassen', 'Gruppe verlassen', 'src/app/gruppen/[id]/index.tsx (Button)'),
  ('Gruppen und Vereine rufen damit bald den ganzen Kiez zu gemeinsamen Aktionen auf.', 'Gruppen und Vereine rufen damit bald den ganzen Kiez zu gemeinsamen Aktionen auf.', 'src/data/features.ts (Kater)'),
  ('Hier änderst Du Deine Adresse oder Dein Passwort. Den Code per Mail kannst Du immer nutzen.', 'Hier änderst Du Deine Adresse oder Dein Passwort. Den Code per Mail kannst Du immer nutzen.', 'src/app/account/credentials.tsx (Kater)'),
  ('Hier liegen später Deine geschlossenen und gelöschten Challenges.', 'Hier liegen später Deine geschlossenen und gelöschten Challenges.', 'src/app/manage.tsx (Kater)'),
  ('Ich bin gespannt, was als Nächstes kommt.', 'Ich bin gespannt, was als Nächstes kommt.', 'src/data/reise.ts (Text)'),
  ('Ich hab schon ein Konto', 'Ich hab schon ein Konto', 'src/app/onboarding/welcome.tsx (Button)'),
  ('In einer Gruppe verteilt Ihr Aufgaben unter Euch, etwa in der WG, der Familie oder im Verein. Statt Euro gibt es Edensteine.', 'In einer Gruppe verteilt Ihr Aufgaben unter Euch, etwa in der WG, der Familie oder im Verein. Statt Euro gibt es Edensteine.', 'src/app/gruppen/index.tsx (Kater)'),
  ('Ist mir egal', 'Ist mir egal', 'src/app/onboarding/ansprache.tsx (Button)'),
  ('Ja, erhalten', 'Ja, erhalten', 'src/app/challenge/[id]/payment/index.tsx (Button)'),
  ('Kiez übernehmen', 'Kiez übernehmen', 'src/app/onboarding/kiez.tsx (Button)'),
  ('Kommunikation ist alles. Wie spreche ich Dich an, Darling?', 'Kommunikation ist alles. Wie spreche ich Dich an, Darling?', 'src/app/onboarding/ansprache.tsx (Kater)'),
  ('Konto anlegen', 'Konto anlegen', 'src/app/onboarding/email.tsx (Button)'),
  ('Konto endgültig löschen', 'Konto endgültig löschen', 'src/app/account/delete/index.tsx (Button)'),
  ('Kopie erstellen', 'Kopie erstellen', 'src/app/manage.tsx (Button)'),
  ('Leg ein Passwort fest, das nur Du kennst. Den Code per Mail kannst Du weiter nutzen.', 'Leg ein Passwort fest, das nur Du kennst. Den Code per Mail kannst Du weiter nutzen.', 'src/app/account/password.tsx (Kater)'),
  ('Lieber nicht', 'Lieber nicht', 'src/app/onboarding/push.tsx (Button)'),
  ('Lob gezollt', 'Lob gezollt', 'src/app/user/[id]/index.tsx (Button)'),
  ('Lob zollen', 'Lob zollen', 'src/app/user/[id]/index.tsx (Button)'),
  ('Löschen', 'Löschen', 'src/app/manage.tsx (Button)'),
  ('Mal Landurlaub? Verständlich. Ich halt hier so lange die Stellung.', 'Mal Landurlaub? Verständlich. Ich halt hier so lange die Stellung.', 'src/app/account/pause/index.tsx (Kater)'),
  ('Meldung senden', 'Meldung senden', 'src/app/challenge/[id]/flag/index.tsx (Button), src/app/user/[id]/report/index.tsx (Button)'),
  ('Missbrauch melden', 'Missbrauch melden', 'src/app/challenge/[id]/review/reject.tsx (Button)'),
  ('Mit Code anmelden', 'Mit Code anmelden', 'src/app/onboarding/email.tsx (Button)'),
  ('Mit Code beitreten', 'Mit Code beitreten', 'src/app/gruppen/index.tsx (Button), src/components/GroupBar.tsx (Button)'),
  ('Mit Code registrieren', 'Mit Code registrieren', 'src/app/onboarding/email.tsx (Button)'),
  ('Mit Passwort anmelden', 'Mit Passwort anmelden', 'src/app/onboarding/email.tsx (Button)'),
  ('Muss ich noch machen', 'Muss ich noch machen', 'src/app/challenge/[id]/pay/index.tsx (Button)'),
  ('Nach dem Gründen bekommst Du einen Code mit 6 Zeichen. Den teilst Du mit bis zu {anzahl} Leuten. Einen Kiez braucht es dafür nicht.', 'Nach dem Gründen bekommst Du einen Code mit 6 Zeichen. Den teilst Du mit bis zu {anzahl} Leuten. Einen Kiez braucht es dafür nicht.', 'src/app/gruppen/neu.tsx (Text)'),
  ('Nein, nicht erhalten', 'Nein, nicht erhalten', 'src/app/challenge/[id]/payment/index.tsx (Button)'),
  ('Neue Challenge', 'Neue Challenge', 'src/app/manage.tsx (Button)'),
  ('Nicht veröffentlichen, Entwurf', 'Nicht veröffentlichen, Entwurf', 'src/app/challenge/[id]/edit.tsx (Button)'),
  ('Noch das Kleingedruckte. Auch Piraten haben einen Kodex.', 'Noch das Kleingedruckte. Auch Piraten haben einen Kodex.', 'src/app/onboarding/kodex.tsx (Kater)'),
  ('Noch keine Aufgaben', 'Noch keine Aufgaben', 'src/app/feed.tsx (Kater)'),
  ('Oha. Eine Erledigung kam zurück. Schau mal, was noch fehlt.', 'Oha. Eine Erledigung kam zurück. Schau mal, was noch fehlt.', 'src/data/reise.ts (Text)'),
  ('OK', 'OK', 'src/components/WebAlert.tsx (Button)'),
  ('Onboarding ansehen', 'Onboarding ansehen', 'src/app/demo.tsx (Button)'),
  ('Passwort festlegen', 'Passwort festlegen', 'src/app/onboarding/email.tsx (Button)'),
  ('Passwort speichern', 'Passwort speichern', 'src/app/account/password.tsx (Button)'),
  ('Passwort vergessen? Code per Mail', 'Passwort vergessen? Code per Mail', 'src/app/onboarding/email.tsx (Button)'),
  ('Person melden', 'Person melden', 'src/app/demo.tsx (Button)'),
  ('Rückgängig machen', 'Rückgängig machen', 'src/app/challenge/[id]/review/success.tsx (Button)'),
  ('Schließen', 'Schließen', 'src/app/manage.tsx (Button)'),
  ('Sieht gut aus? Wenn Du bestätigst, zahlst Du die {betrag} direkt an {name}. {deren} Zahlungsdaten siehst Du danach.', 'Sieht gut aus? Wenn Du bestätigst, zahlst Du die {betrag} direkt an {name}. {deren} Zahlungsdaten siehst Du danach.', 'src/app/challenge/[id]/review/index.tsx (Text)'),
  ('Später festlegen', 'Später festlegen', 'src/app/onboarding/kiez.tsx (Button)'),
  ('Speichern', 'Speichern', 'src/app/challenge/[id]/edit.tsx (Button), src/app/settings/payout.tsx (Button)'),
  ('Standort noch einmal suchen', 'Standort noch einmal suchen', 'src/app/onboarding/kiez.tsx (Button)'),
  ('Standort verwenden', 'Standort verwenden', 'src/app/onboarding/kiez.tsx (Button)'),
  ('Stattdessen mit Code', 'Stattdessen mit Code', 'src/app/onboarding/email.tsx (Button)'),
  ('Stattdessen Passwort festlegen', 'Stattdessen Passwort festlegen', 'src/app/onboarding/email.tsx (Button)'),
  ('Stay in touch.', 'Stay in touch.', 'src/app/onboarding/push.tsx (Kater)'),
  ('Stimmt nicht, von Hand eingeben', 'Stimmt nicht, von Hand eingeben', 'src/app/onboarding/kiez.tsx (Button)'),
  ('Suche Deinen Kiez …', 'Suche Deinen Kiez …', 'src/app/onboarding/kiez.tsx (Button)'),
  ('Suche Standort …', 'Suche Standort …', 'src/app/challenge/create/step-2.tsx (Button)'),
  ('Taufen', 'Taufen', 'src/app/challenge/[id]/index.tsx (Button)'),
  ('Tipp oben rechts auf die Kamera und stell die erste Aufgabe für Eure Gruppe ein.', 'Tipp oben rechts auf die Kamera und stell die erste Aufgabe für Eure Gruppe ein.', 'src/app/feed.tsx (Kater)'),
  ('Trete bei …', 'Trete bei …', 'src/app/gruppen/beitreten.tsx (Button)'),
  ('Trotzdem bestätigen', 'Trotzdem bestätigen', 'src/app/challenge/[id]/review/reject.tsx (Button)'),
  ('Veröffentlichen', 'Veröffentlichen', 'src/app/challenge/[id]/edit.tsx (Button), src/app/challenge/create/preview.tsx (Button)'),
  ('Verwerfen', 'Verwerfen', 'src/app/moderation.tsx (Button)'),
  ('Vorschau', 'Vorschau', 'src/app/challenge/create/step-2.tsx (Button)'),
  ('Wähl ein neues Passwort. Das alte gilt danach nicht mehr.', 'Wähl ein neues Passwort. Das alte gilt danach nicht mehr.', 'src/app/account/password.tsx (Kater)'),
  ('Wave Challenges kommen später', 'Wave Challenges kommen später', 'src/data/features.ts (Kater)'),
  ('Weiter', 'Weiter', 'src/app/challenge/create/step-1.tsx (Button), src/app/onboarding/ansprache.tsx (Button), src/app/onboarding/deckname.tsx (Button)'),
  ('Weiter bearbeiten', 'Weiter bearbeiten', 'src/app/manage.tsx (Button)'),
  ('Wieder öffnen', 'Wieder öffnen', 'src/app/moderation.tsx (Button)'),
  ('Willkommen bei YourPleasure, {anrede}! Erstell eine Challenge oder nimm eine an.', 'Willkommen bei YourPleasure, {anrede}! Erstell eine Challenge oder nimm eine an.', 'src/data/reise.ts (Text)'),
  ('Willkommen zurück an Bord! Deine Flaschenpost-Adresse, bitte.', 'Willkommen zurück an Bord! Deine Flaschenpost-Adresse, bitte.', 'src/app/onboarding/email.tsx (Kater)'),
  ('Wird angelegt …', 'Wird angelegt …', 'src/app/onboarding/email.tsx (Button)'),
  ('Wird erstellt …', 'Wird erstellt …', 'src/app/gruppen/[id]/aufgabe.tsx (Button)'),
  ('Wird gegründet …', 'Wird gegründet …', 'src/app/gruppen/neu.tsx (Button)'),
  ('Wird geprüft …', 'Wird geprüft …', 'src/app/account/email.tsx (Button), src/app/onboarding/code.tsx (Button), src/app/onboarding/email.tsx (Button)'),
  ('Wird gesendet …', 'Wird gesendet …', 'src/app/account/email.tsx (Button), src/app/account/support/index.tsx (Button), src/app/onboarding/email.tsx (Button)'),
  ('Wird gespeichert …', 'Wird gespeichert …', 'src/app/account/password.tsx (Button), src/app/challenge/create/step-1.tsx (Button), src/app/challenge/create/step-2.tsx (Button)'),
  ('Wird veröffentlicht …', 'Wird veröffentlicht …', 'src/app/challenge/create/preview.tsx (Button)'),
  ('YourPleasure', 'YourPleasure', 'src/app/demo.tsx (Button)'),
  ('Zahlungsdaten', 'Zahlungsdaten', 'src/app/demo.tsx (Button)'),
  ('Zahlungsdaten bearbeiten', 'Zahlungsdaten bearbeiten', 'src/app/challenge/[id]/report/payout.tsx (Button)'),
  ('Zum Start', 'Zum Start', 'src/app/account/delete/success.tsx (Button), src/app/account/pause/success.tsx (Button)'),
  ('Zustimmen und weiter', 'Zustimmen und weiter', 'src/app/onboarding/kodex.tsx (Button)')
on conflict (original) do update set ort = excluded.ort;
