/**
 * Erstellen über dem Feed (Daria, 22.10.2026): Der Feed-Kopf wird schmal, die Pille bleibt, das Blatt kommt von unten.
 * Nach dem Veröffentlichen schließt sich das Blatt, sobald der Feed wieder vorn ist.
 */
let done = false;
export const markComposeDone = () => {
  done = true;
};
/** true genau einmal nach einem Veröffentlichen */
export const takeComposeDone = () => {
  const was = done;
  done = false;
  return was;
};
