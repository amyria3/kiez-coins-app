import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { InfoRow, KaterCard, Notice, SectionBlock } from '../../../components/Content';
import { SubScreen } from '../../../components/Screen';
import { ShowcaseEventCard } from '../../../components/ShowcaseEventCard';
import { Text } from '../../../components/T';
import {
  follow,
  loadEntries,
  loadShowcase,
  requestAccess,
  setShowcasePost,
  VISIBLE_ENTRIES,
  type Showcase,
  type ShowcaseAccess,
  type ShowcaseEntry,
  type ShowcasePost,
} from '../../../data/showcase';
import { useStore } from '../../../data/store';
import { t } from '../../../data/texts';
import { useGoBack } from '../../../lib/goBack';
import { color, font, radius, space, text } from '../../../theme/tokens';

/**
 * Route `schaufenster/[id]` (Daria, 2026-11-10): Kopf mit Titelbild, Logo und Angaben, darunter die 10 neuesten Posts
 * und Termine. Das Team postet und legt Termine an, die Gründer:in bearbeitet. Bei „nur für Eingeladene“ sehen
 * andere nur den Kopf und können anfragen oder einen Code eingeben.
 */
export default function ShowcaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { currentUserId } = useStore();
  const [data, setData] = useState<{ showcase: Showcase; access: ShowcaseAccess } | null | undefined>(undefined);
  const [entries, setEntries] = useState<ShowcaseEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    loadShowcase(id, currentUserId).then((d) => {
      setData(d);
      if (d?.access.canSee) loadEntries(id, currentUserId).then(setEntries, () => setEntries([]));
    });
  }, [id, currentUserId]);
  useFocusEffect(reload);

  if (data === undefined) {
    return (
      <SubScreen title="Schaufenster" navigation="back" onLeadingPress={goBack}>
        <ActivityIndicator color={color.text.secondary} />
      </SubScreen>
    );
  }
  if (data === null) {
    return (
      <SubScreen title="Schaufenster" navigation="back" onLeadingPress={goBack}>
        <KaterCard>Dieses Schaufenster gibt es nicht mehr.</KaterCard>
      </SubScreen>
    );
  }

  const { showcase: s, access } = data;

  const toggleFollow = async () => {
    setBusy(true);
    await follow(s.id, !access.following);
    setBusy(false);
    reload();
  };
  const ask = async () => {
    setBusy(true);
    await requestAccess(s.id);
    setBusy(false);
    reload();
  };
  const post = () => {
    setShowcasePost({ id: s.id, name: s.name });
    router.dismissTo({ pathname: '/feed', params: { reiter: 'kiez', erstellen: '1' } });
  };

  return (
    <SubScreen title={s.name} subtitle={s.kiez} navigation="back" onLeadingPress={goBack}>
      <View style={styles.head}>
        {s.cover ? <Image source={s.cover} style={styles.cover} contentFit="cover" accessibilityIgnoresInvertColors /> : null}
        <View style={[styles.identity, s.cover ? styles.identityOnCover : null]}>
          {s.logo ? <Image source={s.logo} style={styles.logo} contentFit="cover" /> : null}
          <Text noTranslate style={styles.name}>
            {s.name}
          </Text>
        </View>
        {s.about ? (
          <Text noTranslate style={styles.about}>
            {s.about}
          </Text>
        ) : null}
        <View style={styles.info}>
          {s.address ? <InfoRow icon="map-pin" value={s.address} /> : null}
          {s.openingHours ? <InfoRow icon="clock-filled" value={s.openingHours} /> : null}
          {s.website ? (
            <Pressable onPress={() => Linking.openURL(s.website!).catch(() => {})} accessibilityRole="link">
              <InfoRow icon="link" value={s.website.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {access.team ? (
        <View style={styles.buttons}>
          <Button label="Post erstellen" icon="plus" onPress={post} />
          <Button label="Termin erstellen" variant="secondary" onPress={() => router.push({ pathname: '/schaufenster/[id]/termin', params: { id: s.id } })} />
          {access.founder ? (
            <Button label="Schaufenster bearbeiten" variant="ghost" onPress={() => router.push({ pathname: '/schaufenster/[id]/bearbeiten', params: { id: s.id } })} />
          ) : null}
        </View>
      ) : access.canSee ? (
        <Button label={access.following ? 'Du folgst' : 'Folgen'} variant={access.following ? 'ghost' : 'secondary'} busy={busy} onPress={toggleFollow} />
      ) : (
        <View style={styles.buttons}>
          <Notice message="Dieses Schaufenster ist nur für Eingeladene. Frag an, oder gib den Code ein, den Du bekommen hast." />
          {access.request === 'requested' ? (
            <Text style={styles.meta}>Deine Anfrage ist unterwegs. Das Team meldet sich.</Text>
          ) : (
            <Button label="Zugang anfragen" variant="secondary" busy={busy} onPress={ask} />
          )}
          <Button label="Ich habe einen Code" variant="ghost" onPress={() => router.push('/schaufenster/beitreten')} />
        </View>
      )}

      {access.canSee ? (
        entries.length ? (
          <SectionBlock label="Neu im Schaufenster">
            <View style={styles.list}>
              {entries.map((e) =>
                e.kind === 'event' ? (
                  <ShowcaseEventCard key={`e${e.event.id}`} event={e.event} team={access.team} onChanged={reload} />
                ) : (
                  <PostCard key={`p${e.post.id}`} post={e.post} onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: e.post.id } })} />
                ),
              )}
            </View>
            <Text style={styles.meta}>{t('Hier stehen die {n} neuesten Posts und Termine.', { n: VISIBLE_ENTRIES })}</Text>
          </SectionBlock>
        ) : (
          <Text style={styles.meta}>{access.team ? 'Noch leer. Erstelle den ersten Post oder Termin.' : 'Hier ist noch nichts los.'}</Text>
        )
      ) : null}

      {s.imprint ? (
        <SectionBlock label="Impressum">
          <Text noTranslate style={styles.meta}>
            {s.imprint}
          </Text>
        </SectionBlock>
      ) : null}
    </SubScreen>
  );
}

function PostCard({ post: p, onPress }: { post: ShowcasePost; onPress: () => void }) {
  const kind = p.type === 'before_after' ? t('Us-Challenge') : p.type === 'individual' ? t('We-Challenge') : t('Post');
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {p.image ? <Image source={p.image} style={styles.image} contentFit="cover" /> : null}
      <View style={styles.cardBody}>
        <Text style={styles.kicker}>{kind}</Text>
        {p.title ? (
          <Text noTranslate style={styles.title}>
            {p.title}
          </Text>
        ) : null}
        {p.body ? (
          <Text noTranslate style={styles.sub} numberOfLines={3}>
            {p.body}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { gap: space[16] },
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.xl },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  identityOnCover: { marginTop: -space[32] - space[8], paddingHorizontal: space[12], alignItems: 'flex-end' },
  logo: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: color.bg.screen, backgroundColor: color.bg.surface },
  // Name in der App-Schrift für große Überschriften (Kiez: Unbounded), nicht in Inter (Daria, 2026-11-10)
  name: { ...text.display, flex: 1, color: color.text.primary, paddingBottom: space[4] },
  about: { ...text.body, color: color.text.primary },
  info: { gap: space[8] },
  buttons: { gap: space[8] },
  list: { gap: space[12] },
  meta: { ...text.caption, color: color.text.secondary },
  card: { borderRadius: radius.xl, backgroundColor: color.bg.surface, overflow: 'hidden' },
  pressed: { opacity: 0.7 },
  image: { width: '100%', aspectRatio: 4 / 3 },
  cardBody: { gap: space[4], padding: space[16] },
  kicker: { ...text.caption, fontFamily: font.medium, color: color.accent.signal },
  title: { ...text.cardTitle, color: color.text.primary },
  sub: { ...text.caption, color: color.text.secondary },
});
