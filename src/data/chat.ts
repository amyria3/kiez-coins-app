// Direktnachrichten unter Freund:innen (Migration 20261022000500_messages.sql).
// Nur bestätigte Freund:innen schreiben sich. Inhalte verschwinden nach einem Monat.
// Neue Nachrichten kommen über Supabase Realtime; die Zahl ungelesener Nachrichten teilen sich Tab-Leiste und Liste.
import { useSyncExternalStore } from 'react';

import { supabase } from '../lib/supabase';
import { loadFriends, type FriendLists } from './remote';
import type { User } from './types';

export type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt?: string;
};

export type Conversation = {
  friend: User;
  last?: ChatMessage;
  unread: number;
};

type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

const toMessage = (r: MessageRow): ChatMessage => ({
  id: r.id,
  senderId: r.sender_id,
  recipientId: r.recipient_id,
  body: r.body,
  createdAt: r.created_at,
  readAt: r.read_at ?? undefined,
});

// ---------------------------------------------------------------------------
// Ungelesen: eine Zahl für die ganze App (Punkt an der Sprechblase in der Tab-Leiste)
// ---------------------------------------------------------------------------

let unread = 0;
const listeners = new Set<() => void>();
function setUnread(n: number) {
  if (n === unread) return;
  unread = n;
  listeners.forEach((l) => l());
}
export function useUnreadMessages(): number {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => unread,
  );
}

// ---------------------------------------------------------------------------
// Beispieldaten für den Demo-Modus: Nachrichten nur im Speicher
// ---------------------------------------------------------------------------

const demo: ChatMessage[] = [];
let demoSeeded = false;
function seedDemo(me: string, friends: User[]) {
  if (demoSeeded || !friends.length) return;
  demoSeeded = true;
  const now = Date.now();
  const at = (min: number) => new Date(now - min * 60_000).toISOString();
  const [a, b] = friends;
  demo.push(
    { id: 'd1', senderId: a.id, recipientId: me, body: 'Hast Du morgen kurz Zeit für das Igelhaus?', createdAt: at(180), readAt: at(170) },
    { id: 'd2', senderId: me, recipientId: a.id, body: 'Klar, ab 10 Uhr. Ich bring Handschuhe mit.', createdAt: at(165), readAt: at(160) },
    { id: 'd3', senderId: a.id, recipientId: me, body: 'Super, bis dann!', createdAt: at(12) },
  );
  if (b) demo.push({ id: 'd4', senderId: b.id, recipientId: me, body: 'Danke fürs Gießen 🌱', createdAt: at(60 * 26), readAt: at(60 * 25) });
}

// ---------------------------------------------------------------------------
// Laden und Schreiben
// ---------------------------------------------------------------------------

/**
 * Freund:innen mit letzter Nachricht, neueste Unterhaltung zuerst. Dazu die offenen Anfragen.
 * null, solange die Migrationen fehlen.
 */
export async function loadConversations(
  meId: string,
  live: boolean,
  demoFriends: User[] = [],
): Promise<{ conversations: Conversation[]; lists: FriendLists } | null> {
  let lists: FriendLists | null;
  let messages: ChatMessage[];
  if (live) {
    lists = await loadFriends(meId);
    if (!lists) return null;
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, body, created_at, read_at')
      .order('created_at', { ascending: false })
      .limit(500);
    messages = error ? [] : ((data ?? []) as MessageRow[]).map(toMessage);
  } else {
    seedDemo(meId, demoFriends);
    lists = { friends: demoFriends, incoming: [], outgoing: [] };
    messages = [...demo].sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  }
  const other = (m: ChatMessage) => (m.senderId === meId ? m.recipientId : m.senderId);
  const conversations = lists.friends.map((friend) => {
    const mine = messages.filter((m) => other(m) === friend.id);
    return {
      friend,
      last: mine[0],
      unread: mine.filter((m) => m.recipientId === meId && !m.readAt).length,
    };
  });
  conversations.sort((x, y) => (y.last?.createdAt ?? '').localeCompare(x.last?.createdAt ?? ''));
  setUnread(conversations.reduce((n, c) => n + c.unread, 0));
  return { conversations, lists };
}

/** Verlauf mit einer Person, älteste zuerst */
export async function loadThread(meId: string, otherId: string, live: boolean): Promise<ChatMessage[]> {
  if (!live) {
    return demo
      .filter((m) => (m.senderId === meId && m.recipientId === otherId) || (m.senderId === otherId && m.recipientId === meId))
      .sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  }
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, recipient_id, body, created_at, read_at')
    .or(`and(sender_id.eq.${meId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${meId})`)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) throw error;
  return ((data ?? []) as MessageRow[]).map(toMessage);
}

export async function sendMessage(meId: string, otherId: string, body: string, live: boolean): Promise<ChatMessage> {
  const text = body.trim();
  if (!live) {
    const m = { id: `d${Date.now()}`, senderId: meId, recipientId: otherId, body: text, createdAt: new Date().toISOString() };
    demo.push(m);
    return m;
  }
  const { data, error } = await supabase
    .from('messages')
    .insert({ recipient_id: otherId, body: text })
    .select('id, sender_id, recipient_id, body, created_at, read_at')
    .single();
  if (error) throw error;
  return toMessage(data as MessageRow);
}

/** Alles von dieser Person als gelesen markieren */
export async function markRead(meId: string, otherId: string, live: boolean) {
  const now = new Date().toISOString();
  if (!live) {
    demo.forEach((m) => {
      if (m.senderId === otherId && m.recipientId === meId && !m.readAt) m.readAt = now;
    });
  } else {
    await supabase.from('messages').update({ read_at: now }).eq('sender_id', otherId).eq('recipient_id', meId).is('read_at', null);
  }
}

/** Ungelesene neu zählen (Tab-Leiste) */
export async function refreshUnread(meId: string, live: boolean) {
  if (!live) {
    setUnread(demo.filter((m) => m.recipientId === meId && !m.readAt).length);
    return;
  }
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', meId)
    .is('read_at', null);
  if (!error) setUnread(count ?? 0);
}

/** Neue Nachrichten an mich oder von mir in Echtzeit. Gibt die Abmeldung zurück. */
export function subscribeMessages(meId: string, onMessage: (m: ChatMessage) => void, name = 'liste'): () => void {
  const channel = supabase
    .channel(`messages-${meId}-${name}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      const m = toMessage(payload.new as MessageRow);
      if (m.recipientId !== meId && m.senderId !== meId) return;
      if (m.recipientId === meId) setUnread(unread + 1);
      onMessage(m);
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
