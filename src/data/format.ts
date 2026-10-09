// Anzeigeformate aus Figma: „15,-“ (BountyBadge), „15 €“ (Fließtext), „15,00 €“ (Betrag).

export function formatBountyShort(amount: number): string {
  return `${amount},-`;
}

export function formatEuro(amount: number): string {
  return `${amount.toLocaleString('de-DE')} €`;
}

export function formatEuroCents(amount: number): string {
  return `${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

/** „12.10.“ */
export function formatDayMonth(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
}

/** „Noch 5 Tage und 12 Stunden“ */
export function formatRemaining(deadlineIso: string, now = Date.now()): string {
  const ms = new Date(deadlineIso).getTime() - now;
  if (ms <= 0) return 'Abgelaufen';
  const totalHours = Math.floor(ms / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const dayText = days === 1 ? '1 Tag' : `${days} Tage`;
  const hourText = hours === 1 ? '1 Stunde' : `${hours} Stunden`;
  if (days === 0) return `Noch ${hourText}`;
  if (hours === 0) return `Noch ${dayText}`;
  return `Noch ${dayText} und ${hourText}`;
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
  return user.group ? `die ${user.name}` : user.firstName;
}
