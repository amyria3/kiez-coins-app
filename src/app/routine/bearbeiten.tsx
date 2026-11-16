import { useLocalSearchParams } from 'expo-router';

import { NewReminder } from './new';

/**
 * Route `routine/bearbeiten?id=…` (Daria, 2026-11-13): Erinnerung bearbeiten. Öffnet über das Menü der Karte („•••“
 * oder Tippen auf die Karte) › „Bearbeiten“.
 * Seit 2026-11-16 (Daria: „Hier fehlen noch Felder“) dasselbe Formular wie „Neue Erinnerung“ mit allen Feldern:
 * Titel, Beschreibung, Ort, Telefon, Link, wie oft (auch die Art wechseln), Tage und Uhrzeit.
 */
/** Gehört zu „Me & Myself“: gelb wie die Routine (Daria, 2026-11-13). Theme kommt zentral über die Route. */
export default function EditReminderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NewReminder editId={id} />;
}
