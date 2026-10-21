-- Adresse der Download-Seite für den Rückweg bei falschem Passwort, solange kiezcoins.de noch nicht auf Vercel zeigt.
alter table public.download_settings add column download_page text;
