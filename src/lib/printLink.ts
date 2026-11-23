/**
 * Link für Papier (Daria, 2026-11-23: „Eine druckbare Visitenkarte kann keine URL hinter dem Text verbergen“): nur, was
 * man abtippen muss. Ohne https://, www., Anhängsel nach „?“ oder „#“ und Schrägstrich am Ende.
 */
export function printLink(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
}
