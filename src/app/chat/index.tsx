import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/T';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../../components/AuthorRow';
import { Button } from '../../components/Button';
import { KaterCard, Notice } from '../../components/Content';
import { TAB_BAR_SPACE, TabBar } from '../../components/TabBar';
import { loadConversations, subscribeMessages, type Conversation } from '../../data/chat';
import { formatRelative } from '../../data/format';
import { acceptFriend, errorText, removeFriend, type FriendLists } from '../../data/remote';
import { useStore } from '../../data/store';
import type { User } from '../../data/types';
import { color, font, radius, space, text } from '../../theme/tokens';
import { t } from '../../data/texts';

/**
 * Route `chat` (Tab „Chats“, Sprechblase in der Tab-Leiste): Freundschaftsanfragen oben, darunter alle
 * Freund:innen mit der letzten Nachricht, neueste zuerst. Nachrichten verschwinden nach einem Monat.
 */
export default function Chats() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode, users, currentUserId } = useStore();
  const live = mode === 'live';
  // undefined: lädt, null: Datenbank-Update fehlt
  const [data, setData] = useState<{ conversations: Conversation[]; lists: FriendLists } | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (live && !currentUserId) return;
    // Demo ohne Anmeldung: zwei Beispielpersonen als Freund:innen
    const demoFriends = users.filter((u) => u.id !== currentUserId && !u.group).slice(0, 2);
    setData(await loadConversations(currentUserId || 'ich', live, demoFriends).catch(() => null));
  }, [currentUserId, live, users]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  // Zurück aus einer Unterhaltung: gelesen und neueste Nachricht aktualisieren
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  // Neue Nachricht: Liste neu sortieren
  useEffect(() => {
    if (!live || !currentUserId) return;
    return subscribeMessages(currentUserId, () => refresh(), 'liste');
  }, [live, currentUserId, refresh]);

  const answer = async (user: User, accept: boolean) => {
    if (!data) return;
    const before = data;
    setData({
      conversations: accept ? [{ friend: user, unread: 0 }, ...data.conversations] : data.conversations,
      lists: { ...data.lists, incoming: data.lists.incoming.filter((u) => u.id !== user.id) },
    });
    if (!live) return;
    try {
      if (accept) await acceptFriend(currentUserId, user.id);
      else await removeFriend(currentUserId, user.id);
    } catch (error) {
      setData(before);
      Alert.alert('Nicht geklappt', errorText(error));
    }
  };

  const toFeed = () => router.dismissTo('/feed');
  const open = (friend: User) => router.push({ pathname: '/chat/[id]', params: { id: friend.id, name: friend.name } });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}>
        <Text style={styles.title} accessibilityRole="header">
          Chats
        </Text>

        {data === null ? (
          <Notice message="Chats sind noch nicht freigeschaltet. Die Datenbank braucht dafür ein Update." />
        ) : null}

        {data?.lists.incoming.length ? (
          <View style={styles.section}>
            <Text style={styles.label}>Freundschaftsanfragen</Text>
            {data.lists.incoming.map((user) => (
              <View key={user.id} style={styles.request}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('Profil von {name}', { name: user.name })}
                  onPress={() => router.push({ pathname: '/user/[id]', params: { id: user.id } })}
                  style={styles.requestWho}
                >
                  <Avatar user={user} diameter={40} />
                  <Text noTranslate style={styles.name} numberOfLines={1}>
                    {user.name}
                  </Text>
                </Pressable>
                <View style={styles.requestButtons}>
                  <Button label="Annehmen" onPress={() => answer(user, true)} style={styles.flex} />
                  <Button label="Ablehnen" variant="secondary" onPress={() => answer(user, false)} />
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {data && data.conversations.length === 0 ? (
          <KaterCard title="Noch keine Freund:innen">
            Öffne das Profil einer Person aus Deinem Kiez und frage sie als Freund:in an. Dann könnt Ihr Euch hier schreiben.
          </KaterCard>
        ) : null}

        {data?.conversations.map(({ friend, last, unread }) => (
          <Pressable
            key={friend.id}
            accessibilityRole="button"
            accessibilityLabel={
              unread
                ? t('Chat mit {name}, {n} ungelesen', { name: friend.name, n: unread })
                : t('Chat mit {name}', { name: friend.name })
            }
            onPress={() => open(friend)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Avatar user={friend} diameter={52} />
            <View style={styles.flex}>
              <View style={styles.rowTop}>
                <Text noTranslate style={[styles.name, unread ? styles.bold : null]} numberOfLines={1}>
                  {friend.name}
                </Text>
                {last ? <Text style={styles.time}>{formatRelative(last.createdAt)}</Text> : null}
              </View>
              <Text style={[styles.preview, unread ? styles.previewUnread : null]} numberOfLines={1}>
                {last ? (last.senderId === currentUserId ? t('Du: {body}', { body: last.body }) : last.body) : t('Schreibe die erste Nachricht')}
              </Text>
            </View>
            {unread ? <View style={styles.badge}><Text style={styles.badgeText}>{unread}</Text></View> : null}
          </Pressable>
        ))}

        {data && data.conversations.length ? (
          <Text style={styles.hint}>Nachrichten verschwinden nach einem Monat.</Text>
        ) : null}
        <Button label="Freundschaften verwalten" variant="ghost" onPress={() => router.push('/account/freunde')} />
      </ScrollView>
      <TabBar active="chat" onFeedPress={toFeed} onMenuPress={() => router.push('/account')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  content: { paddingTop: space[24], paddingHorizontal: space[20], gap: space[16] },
  title: { ...text.display, color: color.text.primary },
  section: { gap: space[12] },
  label: { ...text.caption, color: color.text.secondary },
  request: { gap: space[12], padding: space[16], borderRadius: radius.xl, backgroundColor: color.bg.surface },
  requestWho: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  requestButtons: { flexDirection: 'row', gap: space[8] },
  flex: { flex: 1, gap: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[4] },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: space[8] },
  pressed: { opacity: 0.7 },
  name: { ...text.cardTitle, fontSize: 17, lineHeight: 22, color: color.text.primary, flexShrink: 1 },
  bold: { fontFamily: font.semiBold },
  time: { ...text.caption, color: color.text.secondary, marginLeft: 'auto' },
  preview: { ...text.body, color: color.text.secondary },
  previewUnread: { color: color.text.primary },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: space[6],
    borderRadius: radius.full,
    backgroundColor: color.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: color.bg.screen },
  hint: { ...text.caption, color: color.text.secondary, textAlign: 'center' },
});
