import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/T';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Avatar, hiddenText, useHideName } from '../../../components/AuthorRow';
import { Button } from '../../../components/Button';
import { Notice } from '../../../components/Content';
import { Icon } from '../../../components/icons/Icon';
import { NavRow } from '../../../components/Rows';
import { SubScreen } from '../../../components/Screen';
import { nameInText } from '../../../data/format';
import {
  acceptFriend,
  errorText,
  loadFriendState,
  loadPraise,
  loadProfileExtras,
  removeFriend,
  requestFriend,
  setPraise,
  type FriendState,
  type ProfileExtras,
} from '../../../data/remote';
import { useStore } from '../../../data/store';
import { color, radius, space, text } from '../../../theme/tokens';
import { t } from '../../../data/texts';
import { useGoBack } from '../../../lib/goBack';

/**
 * Route `user/[id]` (Push). Einfache Ansicht einer anderen Person: Foto, Name, Kiez, Lob.
 * Von hier aus: Lob zollen, melden, blockieren. Erreichbar über AuthorRow und Kommentare.
 * `challengeId` gibt die Challenge an die Meldung weiter.
 */
export default function UserProfile() {
  const params = useLocalSearchParams<{ id: string; challengeId?: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { users, currentUserId, mode, dispatch } = useStore();
  const user = users.find((u) => u.id === params.id);
  const hidden = useHideName(user ?? { id: params.id });
  const isMe = params.id === currentUserId;
  // null: Lob gibt es noch nicht (Migration fehlt) oder lädt noch
  const [praise, setPraiseState] = useState<{ count: number; mine: boolean } | null>(
    mode === 'demo' ? { count: 3, mine: false } : null,
  );
  const [busy, setBusy] = useState(false);
  // Bio und Webseite; Freundschaft (null: Migration fehlt oder lädt)
  const [extras, setExtras] = useState<ProfileExtras | null>(
    mode === 'demo' ? { bio: 'Kompost, Kaffee und kaputte Fahrräder. Frag mich, wenn was klemmt.', website: 'https://kiezcoins.de' } : null,
  );
  const [friend, setFriend] = useState<FriendState | null>(mode === 'demo' ? 'none' : null);
  const [friendBusy, setFriendBusy] = useState(false);

  useEffect(() => {
    if (mode !== 'live' || !params.id || !currentUserId) return;
    loadPraise(params.id, currentUserId).then(setPraiseState, () => setPraiseState(null));
    loadProfileExtras(params.id).then(setExtras);
    if (params.id !== currentUserId) loadFriendState(currentUserId, params.id).then(setFriend);
  }, [mode, params.id, currentUserId]);

  if (!user) {
    return (
      <SubScreen title="Profil" navigation="back" onLeadingPress={goBack}>
        <Text style={styles.secondary}>Dieses Profil gibt es nicht mehr.</Text>
      </SubScreen>
    );
  }

  const name = nameInText(user);
  const Name = name.charAt(0).toUpperCase() + name.slice(1);
  const plural = !!user.group;

  const togglePraise = async () => {
    if (!praise) return;
    const next = { count: praise.count + (praise.mine ? -1 : 1), mine: !praise.mine };
    setPraiseState(next);
    if (mode !== 'live') return;
    setBusy(true);
    try {
      await setPraise(user.id, next.mine, currentUserId);
    } catch (error) {
      setPraiseState(praise);
      Alert.alert('Lob nicht gespeichert', errorText(error));
    } finally {
      setBusy(false);
    }
  };

  // Freundschaft: anfragen, zurückziehen, annehmen, ablehnen, beenden
  const changeFriend = async (next: FriendState, run: () => Promise<void>) => {
    const before = friend;
    setFriend(next);
    if (mode !== 'live') return;
    setFriendBusy(true);
    try {
      await run();
    } catch (error) {
      setFriend(before);
      Alert.alert('Nicht geklappt', errorText(error));
    } finally {
      setFriendBusy(false);
    }
  };
  const confirmEnd = () =>
    Alert.alert(t('Freundschaft mit {Name} beenden?', { Name }), t('{Name} erfährt nichts davon. Ihr könnt Euch jederzeit wieder anfragen.', { Name }), [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Beenden', style: 'destructive', onPress: () => changeFriend('none', () => removeFriend(currentUserId, user.id)) },
    ]);
  const website = extras?.website ?? '';

  const block = () =>
    Alert.alert(
      t('{Name} blockieren?', { Name }),
      plural
        ? t('Du siehst ihre Challenges und Kommentare nicht mehr. {Name} können Deine Challenges weder annehmen noch kommentieren und erfahren nichts davon. Aufheben kannst Du das unter „Dein Konto“.', { Name })
        : t('Du siehst die Challenges und Kommentare nicht mehr. {Name} kann Deine Challenges weder annehmen noch kommentieren und erfährt nichts davon. Aufheben kannst Du das unter „Dein Konto“.', { Name }),
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Blockieren',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'block', userId: user.id });
            router.dismissTo('/feed');
          },
        },
      ],
    );

  return (
    <SubScreen title="Profil" navigation="back" onLeadingPress={goBack}>
      <View style={styles.head}>
        <Avatar user={user} diameter={120} />
        <Text noTranslate
          style={[styles.name, hidden && hiddenText]}
          accessibilityRole="header"
          accessibilityLabel={hidden ? t('Name verdeckt, solange Dein Kiez fehlt') : undefined}
        >
          {user.name}
        </Text>
        {user.location ? (
          <View style={styles.row}>
            <Icon name="map-pin" size={14} color={color.text.secondary} />
            <Text style={styles.secondary}>{user.location}</Text>
          </View>
        ) : null}
        {extras?.bio ? <Text style={styles.bio}>{extras.bio}</Text> : null}
        {website ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t('Webseite öffnen: {website}', { website })}
            onPress={() => Linking.openURL(website).catch(() => {})}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <Icon name="send" size={13} color={color.accent.primary} />
            <Text style={styles.link} numberOfLines={1}>
              {website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
            </Text>
          </Pressable>
        ) : null}
        {praise ? (
          <View style={styles.praise} accessibilityLabel={t('{count} Mal gelobt', { count: praise.count })}>
            <Icon name="thumbs-up" size={18} color={color.accent.confirmation} />
            <Text style={styles.praiseText}>{praise.count === 1 ? '1 Lob' : `${praise.count} Lob`}</Text>
          </View>
        ) : null}
      </View>

      {isMe ? (
        <Notice message="So sehen Dich die anderen. Foto, Deckname und Kiez änderst Du unter „Dein Konto“." />
      ) : (
        <>
          {friend === 'none' ? (
            <Button label="Als Freund:in anfragen" disabled={friendBusy} onPress={() => changeFriend('sent', () => requestFriend(user.id))} />
          ) : friend === 'sent' ? (
            <Button
              label="Anfrage gesendet"
              variant="secondary"
              disabled={friendBusy}
              onPress={() => changeFriend('none', () => removeFriend(currentUserId, user.id))}
            />
          ) : friend === 'received' ? (
            <View style={styles.buttons}>
              <Button
                label="Anfrage annehmen"
                disabled={friendBusy}
                onPress={() => changeFriend('friends', () => acceptFriend(currentUserId, user.id))}
                style={styles.flex}
              />
              <Button
                label="Ablehnen"
                variant="secondary"
                disabled={friendBusy}
                onPress={() => changeFriend('none', () => removeFriend(currentUserId, user.id))}
              />
            </View>
          ) : friend === 'friends' ? (
            <>
              <Button
                label="Nachricht schreiben"
                icon="message"
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: user.id, name: user.name } })}
              />
              <Button label="Befreundet" variant="secondary" disabled={friendBusy} onPress={confirmEnd} />
            </>
          ) : null}
          {praise ? (
            <Button
              label={praise.mine ? 'Lob gezollt' : 'Lob zollen'}
              variant={praise.mine ? 'secondary' : 'primary'}
              disabled={busy}
              onPress={togglePraise}
            />
          ) : null}
          <View style={styles.list}>
            <NavRow
              label={plural ? 'Gruppe melden' : 'Person melden'}
              onPress={() =>
                router.push({
                  pathname: '/user/[id]/report',
                  params: params.challengeId ? { id: user.id, challengeId: params.challengeId } : { id: user.id },
                })
              }
            />
            <NavRow label={plural ? 'Gruppe blockieren' : 'Person blockieren'} tone="danger" onPress={block} />
            <NavRow label="Community-Regeln" onPress={() => router.push('/rechtliches/regeln')} />
          </View>
        </>
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: space[8], paddingVertical: space[16] },
  name: { ...text.headline, color: color.text.primary, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  secondary: { ...text.body, color: color.text.secondary },
  bio: { ...text.body, color: color.text.primary, textAlign: 'center', maxWidth: 320 },
  link: { ...text.body, color: color.accent.primary },
  buttons: { flexDirection: 'row', gap: space[8] },
  flex: { flex: 1 },
  praise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    marginTop: space[8],
    paddingHorizontal: space[12],
    paddingVertical: space[6],
    borderRadius: radius.full,
    backgroundColor: color.bg.surface,
  },
  praiseText: { ...text.body, color: color.text.primary },
  // Deutlich abgesetzt von den Knöpfen darüber (Daria, 22.10.2026)
  list: { gap: space[8], marginTop: space[32] },
});
