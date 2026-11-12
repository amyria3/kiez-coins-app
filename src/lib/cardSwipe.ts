/**
 * Berührung liegt auf Karten, die man seitlich wischt (z. B. Routine-Karten). Dann wechselt das Wischen im Feed
 * nicht den Reiter, nur die Karten gleiten (Daria, 2026-11-12). Der Feed setzt den Wert bei jeder neuen Berührung
 * zurück, die Karten setzen ihn danach über `onStartShouldSetResponderCapture`.
 */
export const cardSwipe = { active: false };

/** Für die Hülle um wischbare Karten: meldet die Berührung, ohne sie zu übernehmen */
export const markCardSwipe = () => {
  cardSwipe.active = true;
  return false;
};

/** Für den Feed: neue Berührung, noch nicht auf Karten */
export const resetCardSwipe = () => {
  cardSwipe.active = false;
  return false;
};
