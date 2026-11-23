// Eine Regel für alle Eingabefelder (Daria, 2026-11-23: „Feld lag knapp über der Tastatur am Rand“): Das aktive Feld
// mit seiner Beschriftung und das nächste Feld darunter stehen im sichtbaren Bereich, mit 24 Luft oben und unten.
// Gescrollt wird nur so weit wie nötig. Passt beides nicht hinein, reicht das aktive Feld; ist es höher als der Platz
// (lange Beschreibung), steht sein Anfang oben.
//
// Ein Code für iPhone, Android und Web (Daria, 2026-11-23: Wiederverwendbarkeit): genutzt über components/Nudge.tsx
// (`revealFocused`). Die öffentliche Visitenkarte ist seit #459 dieselbe Komponente in der Web-App und folgt damit
// derselben Regel. Reines JavaScript ohne Abhängigkeiten, getestet in tests/reveal.test.ts.

/** @typedef {{ top: number, bottom: number }} Span Senkrechte Lage auf dem Bildschirm, in Punkten von oben */

/**
 * Wie weit die Scrollfläche scrollen muss: positiv heißt Inhalt nach oben, negativ nach unten, 0 heißt stehen lassen.
 * `visible` ist der Teil der Scrollfläche, den weder Tastatur noch Statusleiste verdecken.
 * @param {Span} field @param {Span} visible @param {Span | null} [next] @param {number} [gap]
 */
export function revealDelta(field, visible, next, gap = 24) {
  const room = visible.bottom - visible.top;
  const top = field.top - gap;
  let bottom = (next && next.top >= field.bottom ? next.bottom : field.bottom) + gap;
  if (bottom - top > room) bottom = field.bottom + gap;
  if (bottom - top > room) bottom = top + room;
  if (top < visible.top) return top - visible.top;
  if (bottom > visible.bottom) return bottom - visible.bottom;
  return 0;
}

/**
 * Sichtbarer Teil einer Scrollfläche: geschnitten mit dem Bereich über der Tastatur und unter der Statusleiste
 * @param {Span} scroll @param {Span} screen @returns {Span}
 */
export function visibleSpan(scroll, screen) {
  return { top: Math.max(scroll.top, screen.top), bottom: Math.min(scroll.bottom, screen.bottom) };
}

/**
 * Browser: Feld und nächstes Feld nach der Regel oben ins Bild holen. Gerechnet wird mit dem sichtbaren Ausschnitt
 * (`visualViewport`), nicht mit der Seite: Safari verschiebt die Seite beim Antippen selbst und legt die Tastatur nur
 * über den Ausschnitt. Gescrollt wird die nächste Scrollfläche um das Feld, sonst die Seite. In der Web-App ist das nie
 * das Fenster: Dessen Scrollen schloss auf dem Home-Bildschirm die Tastatur (2026-11-15, 2026-11-18).
 * @param {HTMLElement} field @param {HTMLElement | null} next @param {number} [safeTop] Höhe der Statusleiste
 */
export function revealInBrowser(field, next, safeTop = 0) {
  let scroller = field.parentElement;
  while (scroller && !(/(auto|scroll)/.test(getComputedStyle(scroller).overflowY) && scroller.scrollHeight > scroller.clientHeight + 1)) {
    scroller = scroller.parentElement;
  }
  const page = !scroller;
  const target = scroller || document.scrollingElement || document.documentElement;
  /** @param {Element} el */
  const span = (el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom };
  };
  const vv = window.visualViewport;
  const screen = vv ? { top: vv.offsetTop + safeTop, bottom: vv.offsetTop + vv.height } : { top: safeTop, bottom: window.innerHeight };
  const area = page ? { top: 0, bottom: window.innerHeight } : span(target);
  const delta = revealDelta(span(field), visibleSpan(area, screen), next ? span(next) : null);
  if (Math.abs(delta) < 1) return;
  const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Die ScrollView von React Native legt ihr eigenes scrollTo({ x, y }) aufs Element; hier das des Browsers
  Element.prototype.scrollTo.call(target, { top: target.scrollTop + delta, behavior: calm ? 'auto' : 'smooth' });
}
