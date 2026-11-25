/**
 * Lage eines aufklappenden Menüs (Zahnrad, drei Punkte) neben seinem Knopf (Daria, 2026-11-25).
 * Das Menü soll immer ganz sichtbar sein: unten, wenn es dort passt, sonst oben, sonst auf der Seite mit mehr
 * Platz und dann im Menü scrollbar. Sichere Bereiche (Statusleiste, Home-Balken) zählen nicht als Platz.
 * Alle Angaben in Fensterkoordinaten. Reine Logik, getestet in tests/menuPlacement.test.ts.
 */
export type Rect = { x: number; y: number; w: number; h: number };
export type Insets = { top: number; bottom: number; left: number; right: number };

export type MenuPlacement = {
  /** Oberkante des Menüs, relativ zu `bounds` */
  top: number;
  /** Abstand der rechten Kante zum rechten Rand von `bounds` */
  right: number;
  /** Höchstens so hoch, sonst scrollt das Menü */
  maxHeight: number;
  maxWidth: number;
  above: boolean;
  scroll: boolean;
};

export function placeMenu({
  anchor,
  bounds,
  insets,
  windowHeight,
  windowWidth,
  menuHeight,
  gap = 6,
  margin = 8,
}: {
  anchor: Rect;
  /** Fläche, in der das Menü liegt (z. B. der ganze Bildschirm oder die Ansicht) */
  bounds: Rect;
  insets: Insets;
  windowHeight: number;
  windowWidth: number;
  /** Natürliche Höhe aller Einträge */
  menuHeight: number;
  gap?: number;
  margin?: number;
}): MenuPlacement {
  const minY = Math.max(bounds.y, insets.top) + margin;
  const maxY = Math.min(bounds.y + bounds.h, windowHeight - insets.bottom) - margin;
  const minX = Math.max(bounds.x, insets.left) + margin;
  const maxX = Math.min(bounds.x + bounds.w, windowWidth - insets.right) - margin;

  const spaceBelow = Math.max(0, maxY - (anchor.y + anchor.h + gap));
  const spaceAbove = Math.max(0, anchor.y - gap - minY);
  let above: boolean;
  if (menuHeight <= spaceBelow) above = false;
  else if (menuHeight <= spaceAbove) above = true;
  else above = spaceAbove > spaceBelow;
  // Fast kein Platz an beiden Seiten (z. B. Knopf halb aus dem Bild): dann über die ganze Höhe
  const room = above ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(room, Math.min(menuHeight, maxY - minY));
  const height = Math.min(menuHeight, maxHeight);
  let top = above ? anchor.y - gap - height : anchor.y + anchor.h + gap;
  top = Math.min(Math.max(top, minY), maxY - height);

  // Rechtsbündig mit dem Knopf, aber nie über den Rand
  const maxWidth = Math.max(0, maxX - minX);
  const rightEdge = Math.min(Math.max(anchor.x + anchor.w, minX), maxX);
  return {
    top: top - bounds.y,
    right: bounds.x + bounds.w - rightEdge,
    maxHeight,
    maxWidth,
    above,
    scroll: menuHeight > maxHeight + 0.5,
  };
}
