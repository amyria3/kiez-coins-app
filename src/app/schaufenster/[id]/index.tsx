import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { CollapsibleSection, InfoRow, Notice, SectionBlock } from '../../../components/Content';
import { NavigationBar } from '../../../components/NavigationBar';
import { RichText } from '../../../components/RichText';
import { SubScreen } from '../../../components/Screen';
import { ManageButton, type ManageItem } from '../../../components/ShowcaseManage';
import { ShowcaseEventCard } from '../../../components/ShowcaseEventCard';
import { PlaceholderPost, PlaceholderText, ShowcaseCover, ShowcaseLogo } from '../../../components/ShowcasePlaceholder';
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
import { openLink, placeActions } from '../../../lib/places';
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
  const { currentUserId, groups } = useStore();
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
        <Notice message="Dieses Schaufenster gibt es nicht mehr, oder es ist gerade offline." />
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

  // Verwalten (Daria, 2026-11-11): Menü rechts in der Kopfzeile und ganz unten, „Post erstellen“ direkt vor dem Feed
  const manage: ManageItem[] = access.team
    ? [
        ...(s.switches.posten
          ? [
              { label: 'Post erstellen', onPress: post },
              { label: 'Termin erstellen', onPress: () => router.push({ pathname: '/schaufenster/[id]/termin', params: { id: s.id } }) },
            ]
          : []),
        ...(access.founder
          ? [{ label: 'Schaufenster bearbeiten', onPress: () => router.push({ pathname: '/schaufenster/[id]/bearbeiten', params: { id: s.id } }) }]
          : []),
        // Visitenkarte zum Teilen und Drucken (Daria, 2026-11-12)
        { label: 'Visitenkarte exportieren', onPress: () => router.push({ pathname: '/schaufenster/[id]/visitenkarte', params: { id: s.id } }) },
      ]
    : [];
  // Fürs Team „<Gruppenname> Schaufenster“ statt „Dein Schaufenster“: Es gehört zur Gruppe, nicht zur Person (Daria, 2026-11-12)
  const groupName = groups.find((g) => g.id === s.groupId)?.name;
  const title = access.team && groupName ? t('{group} Schaufenster', { group: groupName }) : 'Schaufenster';

  return (
    // Kopfzeile wie in „Dein Konto › Schaufenster“: der Titel neben dem Pfeil, der Name groß darunter. Vorher
    // stand der Name doppelt, oben in Inter und unter dem Titelbild (Daria, 2026-11-11). Der Kiez steht unter dem Namen.
    <SubScreen
      title={title}
      navigation="back"
      onLeadingPress={goBack}
      header={
        <NavigationBar title={title} variant="back" onLeadingPress={goBack} trailing={manage.length ? <ManageButton items={manage} /> : undefined} />
      }
    >
      <View style={styles.page}>
      {/* Leere Angaben zeigen Platzhalter: Verlauf, Kater-Logo, graue Zeilen (Daria, 2026-11-11) */}
      <View style={styles.head}>
        <ShowcaseCover image={s.cover} style={styles.cover} />
        <View style={[styles.identity, styles.identityOnCover]}>
          <ShowcaseLogo image={s.logo} size={64} style={styles.logo} />
          <View style={styles.nameBlock}>
            <Text noTranslate style={styles.name}>
              {s.name}
            </Text>
            {s.kiez ? (
              <Text noTranslate style={styles.meta}>
                {s.kiez}
              </Text>
            ) : null}
          </View>
        </View>
        {s.about ? (
          <Text noTranslate style={styles.about}>
            {s.about}
          </Text>
        ) : (
          <PlaceholderText>Noch keine Beschreibung</PlaceholderText>
        )}
        <View style={styles.info}>
          {/* Die Adresse steht nur bei Menschen mit Zugang (showcase_private); ohne Zugang kein Platzhalter */}
          {s.address ? (
            // Antippen: in der Karten-App öffnen oder den Ort teilen (Daria, 2026-11-13)
            <Pressable onPress={() => placeActions(s.address!, s.name)} accessibilityRole="button" accessibilityHint={t('In Karten öffnen oder teilen')}>
              <InfoRow icon="map-pin" value={s.address} />
            </Pressable>
          ) : access.canSee ? (
            <InfoRow icon="map-pin" value="Noch keine Adresse" placeholder />
          ) : null}
          {s.openingHours ? (
            <InfoRow icon="clock-filled" value={s.openingHours} />
          ) : (
            <InfoRow icon="clock-filled" value="Noch keine Öffnungszeiten" placeholder />
          )}
          {/* Mehrere Links (Daria, 2026-11-10) */}
          {s.links.length ? (
            s.links.map((l) => (
              <Pressable key={l} onPress={() => openLink(l)} accessibilityRole="link">
                <InfoRow icon="link" value={shortLink(l)} />
              </Pressable>
            ))
          ) : (
            <InfoRow icon="link" value="Noch keine Links" placeholder />
          )}
        </View>
      </View>

      {/* Schaufenster abgeschaltet (Feature `schaufenster`): Nur die Gruppe sieht es noch (Daria, 2026-11-10) */}
      {!s.switches.online ? (
        <Notice variant="warning" message="Dieses Schaufenster ist offline. Nur Eure Gruppe sieht es, im Feed und unter dem Link erscheint es nicht." />
      ) : null}

      {access.team ? null : access.canSee ? (
        // „{name} folgen“ statt „Folgen“ (Daria, 2026-11-13). Kein Kalender-Button: Das Schaufenster ist kein Termin,
        // „In meine anderen Kalender“ steht an jedem einzelnen Termin.
        <Button
          label={access.following ? t('Du folgst {name}', { name: s.name }) : t('{name} folgen', { name: s.name })}
          variant={access.following ? 'ghost' : 'secondary'}
          busy={busy}
          onPress={toggleFollow}
        />
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
      ) : (
        <SectionBlock label="Services">
          <PlaceholderText>Noch keine Services</PlaceholderText>
        </SectionBlock>
      )}

      {/* Nur fürs Team: direkt vor dem Feed (Daria, 2026-11-11) */}
      {access.team && s.switches.posten ? <Button label="Post erstellen" icon="plus" onPress={post} /> : null}

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
          <>
            <SectionBlock label="Termine">
              <PlaceholderText>Noch keine Termine</PlaceholderText>
            </SectionBlock>
            <SectionBlock label="Posts">
              <PlaceholderPost />
            </SectionBlock>
          </>
        )
      ) : null}

      {/* AGB eingeklappt, sie sind meist lang (Daria, 2026-11-11) */}
      {s.terms ? (
        <CollapsibleSection label="AGB" collapsible>
          <RichText value={s.terms} />
        </CollapsibleSection>
      ) : (
        <SectionBlock label="AGB">
          <PlaceholderText>AGB noch nicht hinterlegt</PlaceholderText>
        </SectionBlock>
      )}

      <SectionBlock label="Impressum">
        {s.imprint ? (
          <Text noTranslate style={styles.meta}>
            {s.imprint}
          </Text>
        ) : (
          <PlaceholderText>Impressum noch nicht hinterlegt</PlaceholderText>
        )}
      </SectionBlock>

      {manage.length ? <ManageButton items={manage} style={styles.manageBottom} /> : null}
      </View>
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

/** So weit ragt das Logo ins Titelbild */
const COVER_OVERLAP = space[32] + space[8];

const styles = StyleSheet.create({
  // Mehr Luft zwischen den Abschnitten (Daria, 2026-11-11)
  page: { gap: space[32] },
  head: { gap: space[20] },
  manageBottom: { alignSelf: 'center' },
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.xl },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  // Nur das Logo ragt ins Titelbild, der Name steht darunter und läuft nie übers Foto (Daria, 2026-11-13)
  identityOnCover: { marginTop: -COVER_OVERLAP, paddingHorizontal: space[12], alignItems: 'flex-start' },
  logo: { borderWidth: 3, borderColor: color.bg.screen, backgroundColor: color.bg.surface },
  // Name in der App-Schrift für große Überschriften (Kiez: Unbounded), nicht in Inter (Daria, 2026-11-10)
  nameBlock: { flex: 1, paddingTop: COVER_OVERLAP + space[8] },
  name: { ...text.display, color: color.text.primary },
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
