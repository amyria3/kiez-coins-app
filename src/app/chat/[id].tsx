import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../../components/T';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../../components/AuthorRow';
import { IconButton } from '../../components/IconButton';
import { Icon } from '../../components/icons/Icon';
import { loadThread, markRead, refreshUnread, sendMessage, subscribeMessages, type ChatMessage } from '../../data/chat';
import { errorText } from '../../data/remote';
import { useStore } from '../../data/store';
import type { User } from '../../data/types';
import { color, font, radius, size, space, text } from '../../theme/tokens';
import { localeTag, t } from '../../data/texts';

/**
 * Route `chat/[id]`: Unterhaltung mit einer Freund:in. Eigene Nachrichten rechts in Lila, die der anderen links.
 * Neue Nachrichten kommen in Echtzeit. Beim Öffnen und bei jeder neuen Nachricht gilt alles als gelesen.
 */
export default function ChatThread() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode, users, currentUserId: storedId } = useStore();
  const live = mode === 'live';
  // Demo ohne Anmeldung: feste eigene ID, passend zur Chat-Liste
  const currentUserId = storedId || (live ? '' : 'ich');
  const friend: User = users.find((u) => u.id === params.id) ?? {
    id: params.id,
    name: params.name ?? '',
    firstName: params.name ?? '',
  };
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    loadThread(currentUserId, params.id, live)
      .then((list) => active && setMessages(list))
      .catch((error) => {
        if (!active) return;
        setMessages([]);
        Alert.alert('Chat nicht geladen', errorText(error));
      });
    markRead(currentUserId, params.id, live).then(() => refreshUnread(currentUserId, live));
    if (!live) return () => void (active = false);
    const stop = subscribeMessages(
      currentUserId,
      (m) => {
        const mine = m.senderId === currentUserId && m.recipientId === params.id;
        const theirs = m.senderId === params.id && m.recipientId === currentUserId;
        if (!mine && !theirs) return;
        setMessages((list) => (list && !list.some((x) => x.id === m.id) ? [...list, m] : list));
        if (theirs) markRead(currentUserId, params.id, live).then(() => refreshUnread(currentUserId, live));
      },
      `chat-${params.id}`,
    );
    return () => {
      active = false;
      stop();
    };
  }, [currentUserId, params.id, live]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft('');
    try {
      const m = await sendMessage(currentUserId, params.id, body, live);
      setMessages((list) => (list && !list.some((x) => x.id === m.id) ? [...list, m] : list));
    } catch (error) {
      setDraft(body);
      Alert.alert('Nicht gesendet', errorText(error));
    } finally {
      setSending(false);
    }
  };

  // Neueste unten: die Liste steht auf dem Kopf, daher umgekehrte Reihenfolge
  const items = messages ? [...messages].reverse() : [];
  const time = (iso: string) => new Date(iso).toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel={t('Zurück')} onPress={() => router.back()} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Profil von {name}', { name: friend.name })}
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: friend.id } })}
          style={({ pressed }) => [styles.who, pressed && styles.pressed]}
        >
          <Avatar user={friend} diameter={36} />
          <Text noTranslate style={styles.name} numberOfLines={1}>
            {friend.name}
          </Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          inverted
          data={items}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          keyboardDismissMode="interactive"
          ListFooterComponent={
            messages && messages.length === 0 ? (
              <Text style={styles.empty}>{t('Schreib {name} die erste Nachricht. Nachrichten verschwinden nach einem Monat.', { name: friend.name })}</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const mine = item.senderId === currentUserId;
            return (
              <View style={[styles.bubbleRow, mine ? styles.right : styles.left]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.body, mine ? styles.bodyMine : null]}>{item.body}</Text>
                  <Text style={[styles.time, mine ? styles.timeMine : null]}>{time(item.createdAt)}</Text>
                </View>
              </View>
            );
          }}
        />
        <View style={[styles.composer, { marginBottom: Math.max(insets.bottom, space[12]) }]}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={t('Nachricht an {name}', { name: friend.name })}
            placeholderTextColor={color.text.secondary}
            selectionColor={color.accent.primary}
            multiline
            maxLength={1000}
            accessibilityLabel={t('Nachricht schreiben')}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Senden')}
            onPress={send}
            disabled={!draft.trim() || sending}
            style={({ pressed }) => [styles.send, (!draft.trim() || sending) && styles.sendOff, pressed && styles.pressed]}
          >
            <Icon name="send" size={size.icon * 0.8} color={color.bg.screen} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: space[8], paddingVertical: space[8] },
  who: { flexDirection: 'row', alignItems: 'center', gap: space[8], flexShrink: 1 },
  pressed: { opacity: 0.7 },
  name: { ...text.cardTitle, fontSize: 17, lineHeight: 22, color: color.text.primary, flexShrink: 1 },
  list: { paddingHorizontal: space[16], paddingVertical: space[12], gap: space[6] },
  empty: { ...text.body, color: color.text.secondary, textAlign: 'center', paddingVertical: space[32], paddingHorizontal: space[16] },
  bubbleRow: { flexDirection: 'row' },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', paddingVertical: space[8], paddingHorizontal: space[12], borderRadius: radius.xl, gap: space[2] },
  bubbleMine: { backgroundColor: color.accent.primary, borderBottomRightRadius: space[4] },
  bubbleTheirs: { backgroundColor: color.bg.surface, borderBottomLeftRadius: space[4] },
  body: { ...text.body, color: color.text.primary },
  bodyMine: { color: color.bg.screen },
  time: { fontFamily: font.regular, fontSize: 11, lineHeight: 14, color: color.text.secondary, alignSelf: 'flex-end' },
  timeMine: { color: 'rgba(31, 33, 35, 0.6)' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[8],
    marginHorizontal: space[16],
    marginTop: space[4],
    paddingVertical: space[4],
    paddingLeft: space[16],
    paddingRight: space[4],
    borderRadius: radius.xl,
    backgroundColor: color.bg.surface,
  },
  input: { ...text.body, flex: 1, color: color.text.primary, maxHeight: 120, paddingVertical: space[8] },
  send: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: color.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { opacity: 0.35 },
});
