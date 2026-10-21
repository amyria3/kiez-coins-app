import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Avatar, hiddenText, useHideName } from '../../../components/AuthorRow';
import { Button } from '../../../components/Button';
import { Notice } from '../../../components/Content';
import { Icon } from '../../../components/icons/Icon';
import { NavRow } from '../../../components/Rows';
import { SubScreen } from '../../../components/Screen';
import { nameInText } from '../../../data/format';
import { errorText, loadPraise, setPraise } from '../../../data/remote';
import { useStore } from '../../../data/store';
import { color, radius, space, text } from '../../../theme/tokens';

/**
 * Route `user/[id]` (Push). Einfache Ansicht einer anderen Person: Foto, Name, Kiez, Lob.
 * Von hier aus: Lob zollen, melden, blockieren. Erreichbar über AuthorRow und Kommentare.
 * `challengeId` gibt die Challenge an die Meldung weiter.
 */
export default function UserProfile() {
  const params = useLocalSearchParams<{ id: string; challengeId?: string }>();
  const router = useRouter();
  const { users, currentUserId, mode, dispatch } = useStore();
  const user = users.find((u) => u.id === params.id);
  const hidden = useHideName(user ?? { id: params.id });
  const isMe = params.id === currentUserId;
  // null: Lob gibt es noch nicht (Migration fehlt) oder lädt noch
  const [praise, setPraiseState] = useState<{ count: number; mine: boolean } | null>(
    mode === 'demo' ? { count: 3, mine: false } : null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== 'live' || !params.id || !currentUserId) return;
    loadPraise(params.id, currentUserId).then(setPraiseState, () => setPraiseState(null));
  }, [mode, params.id, currentUserId]);

  if (!user) {
    return (
      <SubScreen title="Profil" navigation="back" onLeadingPress={() => router.back()}>
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

  const block = () =>
    Alert.alert(
      `${Name} blockieren?`,
      `Du siehst ${plural ? 'ihre' : 'die'} Challenges und Kommentare nicht mehr. ${Name} ${plural ? 'können' : 'kann'} Deine Challenges weder annehmen noch kommentieren und ${plural ? 'erfahren' : 'erfährt'} nichts davon. Aufheben kannst Du das unter „Dein Konto“.`,
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
    <SubScreen title="Profil" navigation="back" onLeadingPress={() => router.back()}>
      <View style={styles.head}>
        <Avatar user={user} diameter={120} />
        <Text
          style={[styles.name, hidden && hiddenText]}
          accessibilityRole="header"
          accessibilityLabel={hidden ? 'Name verdeckt, solange Dein Kiez fehlt' : undefined}
        >
          {user.name}
        </Text>
        {user.location ? (
          <View style={styles.row}>
            <Icon name="map-pin" size={14} color={color.text.secondary} />
            <Text style={styles.secondary}>{user.location}</Text>
          </View>
        ) : null}
        {praise ? (
          <View style={styles.praise} accessibilityLabel={`${praise.count} Mal gelobt`}>
            <Icon name="thumbs-up" size={18} color={color.accent.confirmation} />
            <Text style={styles.praiseText}>{praise.count === 1 ? '1 Lob' : `${praise.count} Lob`}</Text>
          </View>
        ) : null}
      </View>

      {isMe ? (
        <Notice message="So sehen Dich die anderen. Foto, Deckname und Kiez änderst Du unter „Dein Konto“." />
      ) : (
        <>
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
              value="Verstoß gegen die Community-Regeln"
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
  list: { gap: space[8] },
});
