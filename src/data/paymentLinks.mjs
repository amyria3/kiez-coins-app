// Zahlungslinks im Schaufenster (Daria, 2026-11-23): Der Betrieb legt bei Stripe, SumUp oder PayPal selbst einen
// Zahlungslink an und trägt ihn mit Titel und Betrag ein. KiezCoins speichert nur den Link; das Geld geht direkt an den
// Betrieb, die Gebühr je Zahlung trägt er beim Anbieter. Reine Logik für App und öffentliche Seite (api/s.mjs), geprüft
// in tests/paymentLinks.test.ts. Bezeichner englisch, wie AGENTS.md es verlangt.

/** Höchstens so viele Zahlungslinks je Schaufenster (wie die Datenbank, Migration 20261123000300) */
export const PAYMENT_LINKS_MAX = 10;
export const PAYMENT_TITLE_MAX = 80;
export const PAYMENT_AMOUNT_MAX = 30;

/**
 * Gültiger Zahlungslink: nur https://, höchstens 300 Zeichen.
 * @param {unknown} url
 * @returns {boolean}
 */
export function isPaymentUrl(url) {
  return typeof url === 'string' && /^https:\/\/\S+\.\S+$/i.test(url.trim()) && url.trim().length <= 300;
}

/**
 * Zahlungslinks zum Speichern und Anzeigen: nur Einträge mit Titel und gültigem Link, gekürzt, höchstens zehn.
 * Leere Zeilen aus dem Formular fallen still weg.
 * @param {unknown} list
 * @returns {{ title: string; amount?: string; url: string }[]}
 */
export function cleanPaymentLinks(list) {
  if (!Array.isArray(list)) return [];
  /** @type {{ title: string; amount?: string; url: string }[]} */
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const title = typeof item.title === 'string' ? item.title.trim().slice(0, PAYMENT_TITLE_MAX) : '';
    const amount = typeof item.amount === 'string' ? item.amount.trim().slice(0, PAYMENT_AMOUNT_MAX) : '';
    const url = typeof item.url === 'string' ? item.url.trim() : '';
    if (!title || !isPaymentUrl(url)) continue;
    out.push(amount ? { title, amount, url } : { title, url });
    if (out.length === PAYMENT_LINKS_MAX) break;
  }
  return out;
}

/**
 * Fehler eines Eintrags im Formular, sonst null. Ganz leere Zeilen sind kein Fehler.
 * @param {{ title?: string; amount?: string; url?: string }} item
 * @returns {'title' | 'url' | null}
 */
export function paymentLinkProblem(item) {
  const title = (item.title ?? '').trim();
  const url = (item.url ?? '').trim();
  const amount = (item.amount ?? '').trim();
  if (!title && !url && !amount) return null;
  if (!isPaymentUrl(url)) return 'url';
  if (!title) return 'title';
  return null;
}
