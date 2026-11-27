import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/T';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Avatar, hiddenText, useHideName } from '../../../components/AuthorRow';
import { BadgeStrip } from '../../../components/BadgeStrip';
import { Button } from '../../../components/Button';
import { QuestionHint } from '../../../components/Content';
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
import { color, space, text } from '../../../theme/tokens';
import { t, tAbout } from '../../../data/texts';
import { useGoBack } from '../../../lib/goBack';
import { openLink } from '../../../lib/places';

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
  // null: Lob lädt noch oder nicht verfügbar
  const [praise, setPraiseState] = useState<{ count: number; mine: boolean } | null>(
    mode === 'demo' ? { count: 3, mine: false } : null,
  );
  const [busy, setBusy] = useState(false);
  // Bio und Webseite; Freundschaft (null: lädt oder Fehler)
  const [extras, setExtras] = useState<ProfileExtras | null>(
    mode === 'demo' ? { bio: 'Kompost, Kaffee und kaputte Fahrräder. Frage mich, wenn was klemmt.', website: 'https://kiezcoins.de' } : null,
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
    Alert.alert(t('Freundschaft mit {name} beenden?', { name: Name }), tAbout(user, '{name} erfährt nichts davon. Ihr könnt Euch jederzeit wieder anfragen.', { name: Name }), [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Beenden', style: 'destructive', onPress: () => changeFriend('none', () => removeFriend(currentUserId, user.id)) },
    ]);
  const website = extras?.website ?? '';

  const block = () =>
    Alert.alert(
      t('{name} blockieren?', { name: Name }),
      plural
        ? t('Du siehst ihre Challenges und Kommentare nicht mehr. {name} können Deine Challenges weder annehmen noch kommentieren und erfahren nichts davon. Du kannst die Blockierung unter „Dein Konto“ aufheben.', { name: Name })
        : tAbout(user, 'Du siehst die Challenges und Kommentare nicht mehr. {name} kann Deine Challenges weder annehmen noch kommentieren und erfährt nichts davon. Du kannst die Blockierung unter „Dein Konto“ aufheben.', { name: Name }),
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
      {/* Kopf in drei ruhigen Gruppen (Daria, 2026-11-17): wer (Foto, Name, Kiez und Lob in einer Zeile),
          was die Person sagt (Bio, Webseite), Abzeichen. Das Abzeichen am Foto entfällt hier,
          weil der Streifen darunter es schon groß mit Namen zeigt. */}
      <View style={styles.head}>
        <View style={styles.identity}>
          <Avatar user={user} diameter={120} badge={false} />
          <Text noTranslate
            style={[styles.name, hidden && hiddenText]}
            accessibilityRole="header"
            accessibilityElementsHidden={hidden}
            importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
          >
            {user.name}
          </Text>
          {user.location || praise ? (
            <View style={styles.meta}>
              {user.location ? (
                <View style={styles.row}>
                  <Icon name="map-pin" size={14} color={color.text.secondary} />
                  <Text style={styles.secondary}>{user.location}</Text>
                </View>
              ) : null}
              {praise ? (
                <View style={styles.row} accessibilityLabel={t('{count} Mal gelobt', { count: praise.count })}>
                  <Icon name="thumbs-up" size={16} color={color.accent.confirmation} />
                  <Text style={styles.secondary}>{praise.count === 1 ? '1 Lob' : `${praise.count} Lob`}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
        {extras?.bio || website ? (
          <View style={styles.about}>
            {extras?.bio ? <Text style={styles.bio} selectable>{extras.bio}</Text> : null}
            {website ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={t('Webseite öffnen: {website}', { website })}
                onPress={() => openLink(website)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              >
                <Icon name="link" size={13} color={color.accent.primary} />
                <Text style={styles.link} numberOfLines={1}>
                  {website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {hidden ? null : <BadgeStrip userId={user.id} />}
      </View>

      {isMe ? (
        <QuestionHint question="Wie ändere ich mein Profil?" answer="Foto, Deckname und Kiez änderst Du unter „Dein Konto“. Hier siehst Du Dein Profil so, wie die anderen es sehen." />
      ) : (
        <>
          {/* Knöpfe mit mehr Luft untereinander (Daria, 2026-11-17) */}
          <View style={styles.actions}>
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
          </View>
          <View style={styles.list}>
            <NavRow label="Community-Regeln" onPress={() => router.push('/legal/regeln')} />
            {/* Leiser zweiter Weg neben dem Knopf „Befreundet“, bei den übrigen Aktionen (Daria, 2026-11-27) */}
            {friend === 'friends' ? <NavRow label="Freundschaft beenden" onPress={confirmEnd} /> : null}
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
          </View>
        </>
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: space[20], paddingTop: space[8], paddingBottom: space[16] },
  identity: { alignItems: 'center', gap: space[8] },
  name: { ...text.headline, color: color.text.primary, textAlign: 'center', marginTop: space[4] },
  meta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: space[16], rowGap: space[4] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  secondary: { ...text.body, color: color.text.secondary },
  about: { alignItems: 'center', gap: space[8] },
  bio: { ...text.body, color: color.text.primary, textAlign: 'center', maxWidth: 320 },
  link: { ...text.body, color: color.accent.primary },
  actions: { gap: space[20] },
  buttons: { flexDirection: 'row', gap: space[8] },
  flex: { flex: 1 },
  // Deutlich abgesetzt von den Knöpfen darüber (Daria, 22.10.2026)
  list: { gap: space[8], marginTop: space[32] },
});
