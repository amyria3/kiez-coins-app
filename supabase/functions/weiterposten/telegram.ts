// Telegram beim Weiterposten (Daria, 2026-11-28): reine Logik ohne Abhängigkeiten, getestet in tests/telegram.test.ts.
// Die Edge Functions `weiterposten` (posten, löschen) und `telegram-bot` (Webhook) nutzen sie beide.

/** Telegram: Bildunterschrift bis 1024 Zeichen, Nachricht ohne Foto bis 4096 */
export const TELEGRAM_CAPTION_MAX = 1024;
export const TELEGRAM_TEXT_MAX = 4096;

/** Eine gesendete Nachricht: Chat und Kennung, zum Löschen */
export type TelegramRef = { chat: number; message: number };

/** Ein Kanal oder eine Gruppe, in der der KiezCoins-Bot posten darf */
export type TelegramChat = { chat_id: number; title: string; kind: 'channel' | 'group' | 'supergroup'; username: string | null };

/**
 * Text des Posts: Titel, Text und Link, gekürzt auf die Grenze. Der Link steht immer vollständig am Ende, denn er
 * führt zurück zu KiezCoins.
 */
export function telegramText(title: string, body: string, link: string, max: number): string {
  const room = max - link.length - 2;
  const text = [title.trim(), body.trim()].filter(Boolean).join('\n\n');
  const clipped = text.length > room ? `${text.slice(0, Math.max(0, room - 1)).trimEnd()}…` : text;
  return clipped ? `${clipped}\n\n${link}` : link;
}

/**
 * Link für „Meine Posts“: der erste öffentliche Kanal oder die erste öffentliche Gruppe mit Benutzernamen, sonst der
 * Chat mit dem Bot, in dem der fertige Post zum Weiterleiten liegt.
 */
export function telegramLink(sent: { ref: TelegramRef; username: string | null }[], bot: string): string {
  const visible = sent.find((s) => s.username);
  return visible ? `https://t.me/${visible.username}/${visible.ref.message}` : `https://t.me/${bot}`;
}

/** Code aus „/start <code>“; Telegram erlaubt dort nur A–Z, a–z, 0–9, _ und - bis 64 Zeichen */
export function startCode(text: string | undefined): string | null {
  const match = /^\/start(?:@\w+)?\s+([A-Za-z0-9_-]{1,64})\s*$/.exec(text ?? '');
  return match ? match[1] : null;
}

/**
 * Was eine Änderung der Rolle des Bots in einem Chat bedeutet (Update `my_chat_member`):
 * - 'add': Der Bot darf dort posten. Kanal: Admin mit Recht zu posten. Gruppe: Mitglied oder Admin.
 * - 'remove': Der Bot ist raus oder darf nicht mehr posten.
 * - 'ignore': privater Chat oder unbekannte Art.
 */
export function chatMemberChange(
  chatType: string,
  member: { status: string; can_post_messages?: boolean },
): 'add' | 'remove' | 'ignore' {
  if (chatType !== 'channel' && chatType !== 'group' && chatType !== 'supergroup') return 'ignore';
  if (chatType === 'channel') {
    return member.status === 'administrator' && member.can_post_messages !== false ? 'add' : 'remove';
  }
  return member.status === 'administrator' || member.status === 'member' ? 'add' : 'remove';
}

/**
 * Geheimer Wert für den Webhook, abgeleitet aus dem Bot-Token (SHA-256, hex, 48 Zeichen). Telegram schickt ihn im Kopf
 * X-Telegram-Bot-Api-Secret-Token mit. So braucht es nur ein Secret: TELEGRAM_BOT_TOKEN (Daria, 2026-11-28).
 */
export async function webhookSecret(token: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`kiezcoins-webhook:${token}`));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 48);
}

/** Löschen gescheitert, weil die Nachricht schon weg ist oder zu alt: zählt als gelöscht */
export const alreadyGone = (description: string) =>
  /message to delete not found|message can't be deleted|chat not found|bot was kicked/i.test(description);
