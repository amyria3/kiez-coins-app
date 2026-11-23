-- Schalter „Freundschaftsanfragen über das Schaufenster“ lesen dürfen (2026-11-23).
-- 20261117000500 hat für showcases.friend_requests nur update erlaubt, aber kein select. Seit 20261110000600 sind
-- die Leserechte auf showcases spaltenweise vergeben, deshalb lief loadFriendRequestsSwitch() in „Bearbeiten“
-- in „permission denied for table showcases“ und der Schalter wurde nie angezeigt.
-- Der Wert ist nicht vertraulich: showcase_accepts_friends() verrät ihn ohnehin jeder Besucher:in.
--
-- Das Skript läuft auch ein zweites Mal ohne Fehler.

grant select (friend_requests) on public.showcases to authenticated;
