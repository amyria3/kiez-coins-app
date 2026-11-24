import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Schon verschickt? (Daria, 2026-11-23: „klicke ich auf senden nochmal sollte ne Info vom System kommen und wenn ich
 * trotzdem noch ne zweite versenden will ok, aber ich sollte wissen dass die erste schon verschickt wurde“)
 *
 * Das Gerät merkt sich 24 Stunden lang, wann es die Digitale Visitenkarte eines Schaufensters an eine Adresse geschickt
 * hat. Die Adresse selbst steht nicht darin, nur eine Prüfsumme aus Kurzname und Adresse. So stimmt der Satz „KiezCoins
 * nutzt die Adresse nur für diese eine Mail und speichert sie nicht“ weiterhin.
 *
 * Die Grenze entspricht der Edge Function `visitenkarte-mail`: höchstens zwei Mails je Empfängeradresse in 24 Stunden.
 */
const KEY = 'card_mail_log_v1';
const DAY = 86400e3;
export const CARD_MAILS_PER_ADDRESS = 2;

type Entry = { k: string; at: number };

/** FNV-1a (32 Bit) reicht, um Wiederholungen auf diesem Gerät zu erkennen */
function checksum(slug: string, to: string): string {
  const input = `${slug}\n${to.trim().toLowerCase()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

async function load(): Promise<Entry[]> {
  try {
    const all = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]') as Entry[];
    const since = Date.now() - DAY;
    return Array.isArray(all) ? all.filter((e) => e && typeof e.k === 'string' && e.at > since) : [];
  } catch {
    return [];
  }
}

/** Zeitpunkte der Mails an diese Adresse in den letzten 24 Stunden, älteste zuerst */
export async function cardMailsSent(slug: string, to: string): Promise<number[]> {
  const k = checksum(slug, to);
  return (await load()).filter((e) => e.k === k).map((e) => e.at).sort((a, b) => a - b);
}

export async function noteCardMail(slug: string, to: string): Promise<void> {
  const all = await load();
  all.push({ k: checksum(slug, to), at: Date.now() });
  await AsyncStorage.setItem(KEY, JSON.stringify(all.slice(-50))).catch(() => undefined);
}
