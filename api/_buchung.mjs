// Termin buchen über Cal.com für die öffentliche Schaufenster-Seite (Daria, 2026-11-18: kostenlose Integrationen
// für kleine Betriebe). Der Betrieb legt sein Konto bei Cal.com selbst an und trägt in der App den Link zu seiner
// Buchungsseite ein (Migration 20261118000600). Andere Buchungsdienste gehen auch. Reine Logik, geprüft in
// tests/schaufensterBuchung.test.ts. Der Unterstrich im Dateinamen sorgt dafür, dass Vercel daraus keine eigene Funktion macht.

/** Gültiger Buchungslink (nur https://, wie die Datenbank showcases_booking_url_check) oder null */
export const buchungsLink = (s) => {
  const url = typeof s?.booking_url === 'string' ? s.booking_url.trim() : '';
  return /^https:\/\/\S+\.\S+$/i.test(url) && url.length <= 300 ? url : null;
};
