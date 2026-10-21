// Anzeigeformate aus Figma: „15,-“ (BountyBadge), „15 €“ (Fließtext), „15,00 €“ (Betrag).
// Texte laufen durch t() (data/texts.ts), Datum und Zahlen folgen der gewählten Sprache.
import { getLanguage, localeTag, t } from './texts';

export function formatBountyShort(amount: number): string {
  return `${amount},-`;
}

export function formatEuro(amount: number): string {
  return `${amount.toLocaleString(localeTag())} €`;
}

export function formatEuroCents(amount: number): string {
  return `${amount.toLocaleString(localeTag(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

/** „12.10.“ */
export function formatDayMonth(iso: string): string {
  const d = new Date(iso);
  if (getLanguage() !== 'de') return d.toLocaleDateString(localeTag(), { day: '2-digit', month: '2-digit' });
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
}

/** „Noch 5 Tage und 12 Stunden“ */
export function formatRemaining(deadlineIso: string, now = Date.now()): string {
  const ms = new Date(deadlineIso).getTime() - now;
  if (ms <= 0) return t('Abgelaufen');
  const totalHours = Math.floor(ms / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const dayText = days === 1 ? t('1 Tag') : t('{n} Tage', { n: days });
  const hourText = hours === 1 ? t('1 Stunde') : t('{n} Stunden', { n: hours });
  if (days === 0) return t('Noch {dauer}', { dauer: hourText });
  if (hours === 0) return t('Noch {dauer}', { dauer: dayText });
  return t('Noch {tage} und {stunden}', { tage: dayText, stunden: hourText });
}

/** Prüft eine IBAN mit der Prüfziffer (Modulo 97). */
export function isValidIban(input: string): boolean {
  const iban = input.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const value = ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const digit of value) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

/** „DE12 •••• •••• •••• 4821“ */
export function maskIban(input: string): string {
  const iban = input.replace(/\s+/g, '');
  return `${iban.slice(0, 4)} •••• •••• •••• ${iban.slice(-4)}`;
}

/** Name im Satz: „die Nachbarschaftsgärtner*innen“ bzw. „Peter“. */
export function nameInText(user: { firstName: string; name: string; group?: boolean }): string {
  return user.group ? t('die {name}', { name: user.name }) : user.firstName;
}

/** „Noch 5 Tage 12 Std.“ (kurze Form unter dem Kater nach dem Annehmen) */
export function formatRemainingShort(deadlineIso: string, now = Date.now()): string {
  const ms = Math.max(0, new Date(deadlineIso).getTime() - now);
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const dayText = days === 1 ? t('1 Tag') : t('{n} Tage', { n: days });
  const hourText = t('{n} Std.', { n: hours });
  if (days === 0) return t('Noch {dauer}', { dauer: hourText });
  if (hours === 0) return t('Noch {dauer}', { dauer: dayText });
  return t('Noch {tage} {stunden}', { tage: dayText, stunden: hourText });
}

const MONTHS_SHORT = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

/** „9. Okt.“ */
export function formatDayMonthShort(iso: string): string {
  const d = new Date(iso);
  if (getLanguage() !== 'de') return d.toLocaleDateString(localeTag(), { day: 'numeric', month: 'short' });
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

/** „10. Januar 2027“ */
export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  if (getLanguage() !== 'de') return d.toLocaleDateString(localeTag(), { day: 'numeric', month: 'long', year: 'numeric' });
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** „vor 2 Std.“, „gerade eben“ */
export function formatRelative(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return t('gerade eben');
  if (minutes < 60) return t('vor {n} Min.', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('vor {n} Std.', { n: hours });
  const days = Math.floor(hours / 24);
  return days === 1 ? t('vor 1 Tag') : t('vor {n} Tagen', { n: days });
}

/** Dauer seit einem Zeitpunkt: „5 Min.“, „3 Std.“, „1 Tag“, „4 Tage“ */
export function formatDurationSince(iso: string, now = Date.now()): string {
  const minutes = Math.max(1, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return t('{n} Min.', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('{n} Std.', { n: hours });
  const days = Math.floor(hours / 24);
  return days === 1 ? t('1 Tag') : t('{n} Tage', { n: days });
}

/** „DE12 •••• 4821“ (kurze Form in Auswahllisten) */
export function maskIbanShort(input: string): string {
  const iban = input.replace(/\s+/g, '');
  return `${iban.slice(0, 4)} •••• ${iban.slice(-4)}`;
}

/** PayPal: E-Mail-Adresse oder paypal.me-Link */
export function isValidPaypal(input: string): boolean {
  const value = input.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || /^(https?:\/\/)?(www\.)?paypal\.me\/[\w.-]+\/?$/i.test(value);
}

/** Auswahl in „Ansprache“, Standard ist Pirat:in. Ältere Profile mit `pirat_star` bekommen ebenfalls Pirat:in. */
export const addressForms = [
  { key: 'pirat_colon', label: 'Pirat:in' },
  { key: 'pirat', label: 'Pirat' },
  { key: 'piratin', label: 'Piratin' },
  { key: 'the_pirat', label: 'The Pirat' },
] as const;

/** Platzhalter `{anrede}` in Kater-Texten. Ohne Auswahl („Ist mir egal“) gilt „Pirat:in“. */
export function anrede(profile: { addressForm?: string; addressCustom?: string }): string {
  if (profile.addressForm === 'custom' && profile.addressCustom?.trim()) return profile.addressCustom.trim();
  return t(addressForms.find((f) => f.key === profile.addressForm)?.label ?? 'Pirat:in');
}
