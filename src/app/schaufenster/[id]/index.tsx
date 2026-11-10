import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { CollapsibleSection, InfoRow, KaterCard, Notice, SectionBlock } from '../../../components/Content';
import { RichText } from '../../../components/RichText';
import { SubScreen } from '../../../components/Screen';
import { ShowcaseEventCard } from '../../../components/ShowcaseEventCard';
import { Text } from '../../../components/T';
import {
  follow,
  loadEntries,
  loadShowcase,
  requestAccess,
  setShowcasePost,
  shortLink,
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
      if (d?.access.canSee) loadEntries(id, currentUserId, d.showcase.switches.mehr).then(setEntries, () => setEntries([]));
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
        <KaterCard>Dieses Schaufenster gibt es nicht mehr, oder es ist gerade offline.</KaterCard>
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
          {/* Mehrere Links (Daria, 2026-11-10). Die Adresse steht nur bei Menschen mit Zugang (showcase_private). */}
          {s.links.map((l) => (
            <Pressable key={l} onPress={() => Linking.openURL(l).catch(() => {})} accessibilityRole="link">
              <InfoRow icon="link" value={shortLink(l)} />
            </Pressable>
          ))}
        </View>
      </View>

      {/* Schaufenster abgeschaltet (Feature `schaufenster`): Nur die Gruppe sieht es noch (Daria, 2026-11-10) */}
      {!s.switches.online ? (
        <Notice variant="warning" message="Dieses Schaufenster ist offline. Nur Eure Gruppe sieht es, im Feed und unter dem Link erscheint es nicht." />
      ) : null}

      {access.team ? (
        <View style={styles.buttons}>
          {/* Posten nur mit Feature `schaufenster_posten` (Daria, 2026-11-10) */}
          {s.switches.posten ? (
            <>
              <Button label="Post erstellen" icon="plus" onPress={post} />
              <Button label="Termin erstellen" variant="secondary" onPress={() => router.push({ pathname: '/schaufenster/[id]/termin', params: { id: s.id } })} />
            </>
          ) : null}
          {access.founder ? (
            <Button label="Schaufenster bearbeiten" variant="ghost" onPress={() => router.push({ pathname: '/schaufenster/[id]/bearbeiten', params: { id: s.id } })} />
          ) : null}
        </View>
      ) : access.canSee ? (
        <Button label={access.following ? 'Du folgst' : 'Folgen'} variant={access.following ? 'ghost' : 'secondary'} busy={busy} onPress={toggleFollow} />
      ) : (
        <View style={styles.buttons}>
          <Notice message="Dieses Schaufenster ist nur für eingeladene Personen. Du möchtest up to date bleiben? Frag einen Zugang für Dich an." />
          {access.request === 'requested' ? (
            <Text style={styles.meta}>Deine Anfrage ist unterwegs. Das Team meldet sich.</Text>
          ) : (
            <Button label="Zugang anfragen" variant="secondary" busy={busy} onPress={ask} />
          )}
          <Button label="Ich habe einen Code" variant="ghost" onPress={() => router.push('/schaufenster/beitreten')} />
        </View>
      )}

      {s.services ? (
        <CollapsibleSection label="Services" collapsible={s.servicesCollapsed}>
          <RichText value={s.services} />
        </CollapsibleSection>
      ) : null}

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
            {s.switches.mehr || entries.length < VISIBLE_ENTRIES ? null : (
              <Text style={styles.meta}>{t('Hier stehen die {n} neuesten Posts und Termine.', { n: VISIBLE_ENTRIES })}</Text>
            )}
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
  // Deutlich Abstand zwischen den Karten (Daria, 2026-11-10)
  list: { gap: space[32] },
  meta: { ...text.caption, color: color.text.secondary },
  // Wenig Rundung wie die Posts im Feed (Daria, 2026-11-10)
  card: { borderRadius: radius.post, backgroundColor: color.bg.surface, overflow: 'hidden' },
  pressed: { opacity: 0.7 },
  image: { width: '100%', aspectRatio: 4 / 3 },
  cardBody: { gap: space[4], padding: space[16] },
  kicker: { ...text.caption, fontFamily: font.medium, color: color.accent.signal },
  title: { ...text.cardTitle, color: color.text.primary },
  sub: { ...text.caption, color: color.text.secondary },
});
