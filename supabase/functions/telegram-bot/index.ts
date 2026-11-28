// Webhook des KiezCoins-Bots in Telegram (Daria, 2026-11-28). Telegram schickt jedes Update hierher (POST, JSON).
//
// 1. „/start <code>“ im privaten Chat: verbindet den Chat mit dem KiezCoins-Konto. Den Code legt die Edge Function
//    `weiterposten` (action 'telegram_start') in telegram_link_codes ab (Migration 20261128000200); er gilt 10 Minuten
//    und nur einmal. Gespeichert wird über crosspost_save: instance und secret = Chat-ID (gleich der Telegram-Kennung).
// 2. Der Bot kommt in einen Kanal oder eine Gruppe (Update `my_chat_member`): Die Person, die ihn aufgenommen hat,
//    steht in telegram_chats.added_by. Weiterposts dieser Person gehen dann auch dorthin. In Gruppen zählt das nur,
//    wenn sie dort Admin ist, damit niemand eine fremde Gruppe mit Posts füllt.
// 3. Der Bot fliegt raus oder darf nicht mehr posten: Zeile weg. Blockiert die Person den Bot: Verbindung weg.
//
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_NAME und TELEGRAM_WEBHOOK_SECRET (beliebiger Zufallswert, Telegram schickt
// ihn im Kopf X-Telegram-Bot-Api-Secret-Token mit). Deploy ohne Anmeldung, denn Telegram ruft ohne Supabase-Token auf:
//   npx supabase functions deploy telegram-bot --no-verify-jwt --project-ref aqxzxpxrshizlaqyjplw
// Einmalig den Webhook setzen (setWebhook mit url …/functions/v1/telegram-bot, secret_token, allowed_updates
// ["message","my_chat_member"]).
import { createClient } from 'npm:@supabase/supabase-js@2';

import { chatMemberChange, startCode } from '../weiterposten/telegram.ts';

/** Ein Code gilt 10 Minuten */
const CODE_MAX_AGE_MS = 10 * 60 * 1000;
const APP = 'https://app.kiezcoins.de/account/features?abschnitt=weiterposten';

type User = { id: number; first_name?: string; last_name?: string; username?: string };
type Chat = { id: number; type: string; title?: string; username?: string };
type Update = {
  message?: { chat: Chat; from?: User; text?: string };
  my_chat_member?: { chat: Chat; from: User; new_chat_member: { status: string; can_post_messages?: boolean } };
};

async function telegram(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: unknown; description?: string };
  if (!data.ok) throw new Error(`telegram ${res.status} ${data.description ?? ''}`.trim());
  return data.result;
}

const say = (chat: number, text: string) => telegram('sendMessage', { chat_id: chat, text }).catch(() => undefined);

const nameOf = (u: User | undefined) =>
  u?.username ? `@${u.username}` : [u?.first_name, u?.last_name].filter(Boolean).join(' ') || 'Telegram';

const CONNECTED =
  'Verbunden mit KiezCoins. Ab jetzt schicke ich Dir hier jeden öffentlichen Post, den Du weiterpostest.\n\n' +
  'In Gruppen weiterleiten: Nachricht lange drücken › Weiterleiten › Gruppen wählen. Mit „Absender ausblenden“ ' +
  'erscheint der Post als Deiner.\n\n' +
  'Direkt in Deinen Kanal: Nimm mich dort als Admin auf. In Gruppen, die Bots erlauben, genügt Mitglied, wenn Du ' +
  `dort Admin bist.\n\nZurück zu KiezCoins: ${APP}`;

const HELLO = `Hallo! Ich bin der Bot von KiezCoins. Verbinden kannst Du mich in KiezCoins unter Dein Konto › Funktionen › Weiterposten › Telegram.\n\n${APP}`;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const secret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
  if (!secret || req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== secret) return new Response('forbidden', { status: 403 });

  let update: Update;
  try {
    update = await req.json();
  } catch {
    return new Response('ok');
  }
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  try {
    const message = update.message;
    if (message?.chat.type === 'private' && message.text?.startsWith('/start')) {
      const code = startCode(message.text);
      if (!code) {
        await say(message.chat.id, HELLO);
        return new Response('ok');
      }
      // Code holen und gleich löschen: Jeder Code gilt nur einmal
      const { data: row } = await admin
        .from('telegram_link_codes')
        .delete()
        .eq('code', code)
        .select('user_id, created_at')
        .maybeSingle();
      if (!row || Date.now() - new Date(row.created_at).getTime() > CODE_MAX_AGE_MS) {
        await say(message.chat.id, `Dieser Link ist abgelaufen. Starte das Verbinden bitte in KiezCoins neu.\n\n${APP}`);
        return new Response('ok');
      }
      const chat = String(message.chat.id);
      const { error } = await admin.rpc('crosspost_save', {
        p_user: row.user_id,
        p_platform: 'telegram',
        p_handle: nameOf(message.from),
        p_instance: chat,
        p_secret: chat,
      });
      await say(message.chat.id, error ? 'Da ist etwas schiefgegangen. Versuche es bitte noch mal.' : CONNECTED);
      return new Response('ok');
    }

    const change = update.my_chat_member;
    if (change) {
      const { chat, from, new_chat_member: member } = change;
      if (chat.type === 'private') {
        // Bot blockiert: Verbindung trennen. Wieder „Starten“ verbindet nur mit neuem Code aus der App.
        if (member.status === 'kicked') {
          await admin.from('crosspost_accounts').delete().eq('platform', 'telegram').eq('instance', String(chat.id));
        }
        return new Response('ok');
      }
      const action = chatMemberChange(chat.type, member);
      if (action === 'remove') {
        await admin.from('telegram_chats').delete().eq('chat_id', chat.id);
      } else if (action === 'add') {
        if (chat.type !== 'channel') {
          // In Gruppen nur, wer dort Admin ist
          const role = (await telegram('getChatMember', { chat_id: chat.id, user_id: from.id }).catch(() => null)) as
            | { status: string }
            | null;
          if (role?.status !== 'creator' && role?.status !== 'administrator') return new Response('ok');
        }
        await admin.from('telegram_chats').upsert({
          chat_id: chat.id,
          added_by: from.id,
          title: chat.title ?? '',
          kind: chat.type,
          username: chat.username ?? null,
        });
        // Bescheid im privaten Chat; ohne Verbindung zu KiezCoins bleibt die Zeile liegen, bis die Person verbindet
        await say(from.id, `KiezCoins postet ab jetzt auch in „${chat.title ?? 'Deinen Chat'}“.`);
      }
    }
  } catch (e) {
    console.error('telegram-bot', (e as Error).message);
  }
  // Immer 200: Sonst schickt Telegram dasselbe Update immer wieder
  return new Response('ok');
});
