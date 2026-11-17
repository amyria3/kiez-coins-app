import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../../components/Button';
import { Notice } from '../../../components/Content';
import { NavigationBar } from '../../../components/NavigationBar';
import { RichText } from '../../../components/RichText';
import { SubScreen } from '../../../components/Screen';
import { ManageButton, type ManageItem } from '../../../components/ShowcaseManage';
import { ShowcaseEventCard } from '../../../components/ShowcaseEventCard';
import { PlaceholderPost, PlaceholderText, ShowcaseCover, ShowcaseLogo } from '../../../components/ShowcasePlaceholder';
import { Text } from '../../../components/T';
import { Icon } from '../../../components/icons/Icon';
import { HandButton } from '../../../components/routine/cards';
import { styles as routine } from '../../../components/routine/styles';
import {
  follow,
  loadEntries,
  loadShowcase,
  requestAccess,
  setShowcasePost,
  shortLink,
  showcasePublicLink,
  VISIBLE_ENTRIES,
  type Showcase,
  type ShowcaseAccess,
  type ShowcaseEntry,
  type ShowcasePost,
} from '../../../data/showcase';
import { useAuth } from '../../../data/auth';
import { rememberInvite } from '../../../data/pendingInvite';
import { useStore } from '../../../data/store';
import { t } from '../../../data/texts';
import { useGoBack } from '../../../lib/goBack';
import { openInMaps, openLink, sharePlace } from '../../../lib/places';
import { shareText } from '../../../lib/share';
import { color, radius, space, text, withAlpha } from '../../../theme/tokens';

/**
 * Route `schaufenster/[id]` (Daria, 2026-11-10): Kopf mit Titelbild, Logo und Angaben, darunter die 10 neuesten Posts
 * und Termine. Das Team postet und legt Termine an, die Gründer:in bearbeitet. Bei „nur für Eingeladene“ sehen
 * andere nur den Kopf und können anfragen oder einen Code eingeben.
 */
export default function ShowcaseScreen() {
  const { id, folgen } = useLocalSearchParams<{ id: string; folgen?: string }>();
  const router = useRouter();
  const { session } = useAuth();
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

  // Von der Webseite „<Name> in KiezCoins folgen“ (Daria, 2026-11-17): Ohne Anmeldung merkt sich die App das
  // Schaufenster fürs Onboarding und kommt danach hierher zurück. Angemeldet folgt sie einmal, ohne weiteren Tipp.
  const followed = useRef(false);
  const [justFollowed, setJustFollowed] = useState(false);
  useEffect(() => {
    if (!session && folgen === '1' && id) rememberInvite(id, 'showcase');
  }, [session, folgen, id]);
  useEffect(() => {
    if (folgen !== '1' || followed.current || !data) return;
    followed.current = true;
    router.setParams({ folgen: undefined });
    const { access } = data;
    if (access.team || !access.canSee || access.following) return;
    follow(data.showcase.id, true).then((ok) => {
      setJustFollowed(ok);
      reload();
    });
  }, [folgen, data, router, reload]);

  // Nur der Weg von der Webseite braucht die Anmeldung; die Beispieldaten (/demo) laufen ohne Sitzung
  if (!session && folgen === '1') return <Redirect href="/onboarding/welcome" />;

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

  // Termine als eigene Reihe, Posts unten im grauen Feed (Daria, 2026-11-17)
  const events = entries.flatMap((e) => (e.kind === 'event' ? [e.event] : []));
  const posts = entries.flatMap((e) => (e.kind === 'post' ? [e.post] : []));
  const link = s.visibility === 'public' && s.switches.online ? showcasePublicLink(s.slug) : undefined;
  const cards = infoCards(s, access.team);

  return (
    <SubScreen
      title={title}
      navigation="back"
      onLeadingPress={goBack}
      header={
        <NavigationBar title={title} variant="back" onLeadingPress={goBack} trailing={manage.length ? <ManageButton items={manage} /> : undefined} />
      }
    >
      <View style={styles.page}>
        {/* Kopf wie auf der Webseite (Daria, 2026-11-17): Logo rechts im Ausschnitt des Titelbilds, Name in Unbounded,
            ohne eigenen Kasten. Die Farbe kommt aus den Karten darunter. */}
        <View style={styles.head}>
          <View>
            <ShowcaseCover image={s.cover} style={styles.cover} />
            <ShowcaseLogo image={s.logo} size={LOGO} style={styles.logo} tone={{ circle: color.showcaseHead.logo, mask: color.showcaseHead.ink }} />
          </View>
          <View style={styles.nameBlock}>
            <Text noTranslate style={styles.name}>
              {s.name}
            </Text>
            {s.kiez ? (
              <Text noTranslate style={styles.kiez}>
                {s.kiez}
              </Text>
            ) : null}
          </View>
          {s.about ? (
            // Markieren und kopieren (Daria, 2026-11-17)
            <Text noTranslate selectable style={styles.about}>
              {s.about}
            </Text>
          ) : access.team ? (
            <Text style={styles.aboutEmpty}>Noch keine Beschreibung</Text>
          ) : null}
          <View style={styles.pills}>
            {/* Wechsel zur Gruppe, nur fürs Team (Daria, 2026-11-17: „von Schaufenster zur Gruppe wechseln“) */}
            {access.team ? (
              <Pill
                filled
                label={groupName ? t('Zur Gruppe {group}', { group: groupName }) : t('Zur Gruppe')}
                onPress={() => router.dismissTo({ pathname: '/feed', params: { gruppe: s.groupId } })}
              />
            ) : access.canSee ? (
              // „<Name> folgen“, ein langer Name wird gekürzt (Daria, 2026-11-17)
              <Pill
                filled
                check={access.following}
                disabled={busy}
                label={access.following ? t('Du folgst') : t('{name} folgen')}
                name={access.following ? undefined : s.name}
                onPress={toggleFollow}
              />
            ) : null}
            {link ? <Pill label="Teilen" onPress={() => shareText(`${s.name}\n${link}`)} /> : null}
          </View>
        </View>

        {justFollowed ? <Notice message={t('Du folgst jetzt {name}.', { name: s.name })} /> : null}

        {/* Schaufenster abgeschaltet (Feature `schaufenster`): Nur die Gruppe sieht es noch (Daria, 2026-11-10) */}
        {!s.switches.online ? (
          <Notice variant="warning" message="Dieses Schaufenster ist offline. Nur Eure Gruppe sieht es, im Feed und unter dem Link erscheint es nicht." />
        ) : null}

        {access.team || access.canSee ? null : (
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

        {/* Angaben als Kartenreihe wie im Kalender (Daria, 2026-11-17): Ort mit „In Karten öffnen“ und „Ort teilen“ */}
        {cards.length ? (
          <CardRow title="Gut zu wissen" count={cards.length}>
            {cards.map((c) => (
              <InfoCard key={c.id} {...c} name={s.name} />
            ))}
          </CardRow>
        ) : null}

        {access.canSee && events.length ? (
          <CardRow title="Termine" count={events.length}>
            {events.map((e) => (
              <ShowcaseEventCard key={e.id} event={e} team={access.team} onChanged={reload} compact />
            ))}
          </CardRow>
        ) : access.canSee && access.team ? (
          <View style={routine.group}>
            <SectionHead title="Termine" />
            <PlaceholderText>Noch keine Termine</PlaceholderText>
          </View>
        ) : null}

        {s.services || access.team ? (
          <View style={routine.group}>
            <SectionHead title="Services" />
            <ServicesCard services={s.services} collapsed={s.servicesCollapsed} />
          </View>
        ) : null}

        {/* Feed auf Grau wie die anderen Feeds (Daria, 2026-11-17), darunter Rechtliches und der Link */}
        <View style={styles.band}>
          {access.team && s.switches.posten ? <Button label="Post erstellen" icon="plus" onPress={post} /> : null}
          {access.canSee && posts.length ? (
            <View style={routine.group}>
              <SectionHead title="Neu im Schaufenster" />
              <View style={styles.list}>
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: p.id } })} />
                ))}
              </View>
              {s.switches.mehr || entries.length < VISIBLE_ENTRIES ? null : (
                <Text style={styles.meta}>{t('Hier stehen die {n} neuesten Posts und Termine.', { n: VISIBLE_ENTRIES })}</Text>
              )}
            </View>
          ) : access.canSee && access.team ? (
            <View style={routine.group}>
              <SectionHead title="Posts" />
              <PlaceholderPost />
            </View>
          ) : null}

          <View>
            {/* AGB eingeklappt, sie sind meist lang (Daria, 2026-11-11). Leer nur fürs Team (Daria, 2026-11-17) */}
            {s.terms ? (
              <FootRow label="AGB">
                <RichText value={s.terms} />
              </FootRow>
            ) : s.visibility === 'public' && access.team ? (
              <FootRow label="AGB">
                <PlaceholderText>AGB noch nicht hinterlegt</PlaceholderText>
              </FootRow>
            ) : null}
            {s.imprint || (s.visibility === 'public' && access.team) ? (
              <FootRow label="Impressum">
                {s.imprint ? (
                  <Text noTranslate selectable style={styles.meta}>
                    {s.imprint}
                  </Text>
                ) : (
                  <PlaceholderText>Impressum noch nicht hinterlegt</PlaceholderText>
                )}
              </FootRow>
            ) : null}
            {/* Kein Link-Feld mehr unten, „Teilen“ im Kopf gibt den Link weiter (Daria, 2026-11-17: „Raus“) */}
          </View>
          {manage.length ? <ManageButton items={manage} style={styles.manageBottom} /> : null}
        </View>
      </View>
    </SubScreen>
  );
}

const LOGO = 80;

type InfoCardData = {
  id: string;
  bg: string;
  kicker: string;
  title: string;
  body?: string;
  icon: 'map-pin' | 'clock-filled' | 'link';
  placeholder?: boolean;
  address?: string;
  links?: string[];
};

/** Karten für „Gut zu wissen“: Ort, Öffnungszeiten, Links. Leere sieht nur das Team als Platzhalter. */
function infoCards(s: Showcase, team: boolean): InfoCardData[] {
  const cards: InfoCardData[] = [];
  const pc = color.showcaseCards;
  if (s.address) {
    const [first, ...rest] = s.address.split(',');
    cards.push({ id: 'ort', bg: pc.place, kicker: 'Ort', title: first.trim(), body: rest.join(',').trim() || undefined, icon: 'map-pin', address: s.address });
  } else if (team) cards.push({ id: 'ort', bg: pc.place, kicker: 'Ort', title: 'Noch keine Adresse', icon: 'map-pin', placeholder: true });
  if (s.openingHours) cards.push({ id: 'zeit', bg: pc.hours, kicker: 'Öffnungszeiten', title: s.openingHours, icon: 'clock-filled' });
  else if (team) cards.push({ id: 'zeit', bg: pc.hours, kicker: 'Öffnungszeiten', title: 'Noch keine Öffnungszeiten', icon: 'clock-filled', placeholder: true });
  if (s.links.length) cards.push({ id: 'links', bg: pc.links, kicker: s.links.length === 1 ? 'Link' : 'Links', title: '', icon: 'link', links: s.links });
  else if (team) cards.push({ id: 'links', bg: pc.links, kicker: 'Links', title: 'Noch keine Links', icon: 'link', placeholder: true });
  return cards;
}

/** Überschrift wie die Gruppen im Kalender, optional mit Anzahl */
function SectionHead({ title, count }: { title: string; count?: number }) {
  return (
    <View style={routine.groupHead}>
      <Text style={routine.groupTitle} accessibilityRole="header">
        {title}
      </Text>
      {count === undefined ? null : (
        <Text noTranslate style={routine.groupCount}>
          {count}
        </Text>
      )}
    </View>
  );
}

/** Reihe mit Überschrift und Anzahl, seitlich wischbar, wie die Gruppen im Kalender (routine/cards) */
function CardRow({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(320, Math.max(240, Math.min(width, 480) - 96));
  const items = Children.toArray(children);
  return (
    <View style={routine.group}>
      <SectionHead title={title} count={count} />
      {items.length === 1 ? (
        <View style={[styles.rowScroll, styles.row]}>
          <View style={[styles.slot, { width: cardWidth }]}>{items[0]}</View>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + space[12]}
          decelerationRate="fast"
          style={styles.rowScroll}
          contentContainerStyle={styles.row}
        >
          {items.map((c, i) => (
            // Leicht schräg wie die Karten in Routine, abwechselnd
            <View key={i} style={[styles.slot, { width: cardWidth, transform: [{ rotate: i % 2 ? '0.7deg' : '-0.7deg' }] }]}>
              {c}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function InfoCard({ bg, kicker, title, body, icon, placeholder, address, links, name }: InfoCardData & { name: string }) {
  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <View style={styles.cardHead}>
        <View style={styles.flex}>
          <Text style={styles.cardKicker}>{kicker}</Text>
          {title ? (
            <Text noTranslate={!placeholder} selectable={!placeholder} style={[styles.cardTitle, placeholder && styles.cardSoft]}>
              {title}
            </Text>
          ) : null}
        </View>
        <View style={styles.cardIcon}>
          <Icon name={icon} size={20} color={ink} />
        </View>
      </View>
      {body ? (
        <Text noTranslate selectable style={styles.cardInk}>
          {body}
        </Text>
      ) : null}
      {/* Je Link eine Zeile mit Namen des Dienstes und der Adresse darunter (Daria, 2026-11-17: „Layout nicht gut“) */}
      {links?.length ? (
        <View style={styles.linkList}>
          {links.map((l, i) => {
            const { label, sub } = linkParts(l);
            return (
              <Pressable
                key={l}
                onPress={() => openLink(l)}
                accessibilityRole="link"
                accessibilityLabel={`${label}, ${sub}`}
                style={({ pressed }) => [styles.linkRow, i > 0 ? styles.linkRowLine : styles.linkRowFirst, pressed && styles.pressed]}
              >
                <View style={styles.flex}>
                  <Text style={styles.linkLabel}>{label}</Text>
                  <Text noTranslate style={styles.linkSub} numberOfLines={1}>
                    {sub}
                  </Text>
                </View>
                <Icon name="chevron-right" size={18} color={ink} />
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {/* Adresse direkt an die Karten-App oder ans Teilen-Menü (Daria, 2026-11-17: „in jedem Fall offen teilbar“) */}
      {address ? (
        <View style={styles.cardActions}>
          <HandButton label="In Karten öffnen" filled bg={bg} onPress={() => openInMaps(address)} />
          <HandButton label="Ort teilen" onPress={() => sharePlace(address, name)} />
        </View>
      ) : null}
    </View>
  );
}

/** Bekannte Dienste mit Namen und @Name, sonst „Webseite“ und die kurze Adresse */
const SERVICES: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)facebook\.com$/, 'Facebook'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
  [/(^|\.)linkedin\.com$/, 'LinkedIn'],
  [/(^|\.)(x\.com|twitter\.com)$/, 'X'],
  [/(^|\.)bsky\.app$/, 'Bluesky'],
  [/(^|\.)threads\.net$/, 'Threads'],
];

function linkParts(link: string): { label: string; sub: string } {
  const short = shortLink(link);
  const [host, ...path] = short.split('/');
  const service = SERVICES.find(([re]) => re.test(host.toLowerCase()))?.[1];
  if (!service) return { label: t('Webseite'), sub: short };
  const handle = path.filter(Boolean)[0];
  return { label: service, sub: handle && service !== 'YouTube' ? `@${handle.replace(/^@/, '')}` : short };
}

/**
 * Runde Knöpfe im Kopf: gefüllt in Türkis oder mit hellem Rand. Mit `name` steht im Text `{name}`; nur der Name wird
 * gekürzt, der Rest des Satzes bleibt in jeder Sprache stehen.
 */
function Pill({
  label,
  name,
  onPress,
  filled,
  check,
  disabled,
}: {
  label: string;
  name?: string;
  onPress: () => void;
  filled?: boolean;
  check?: boolean;
  disabled?: boolean;
}) {
  // Abstand kommt aus `gap`, daher ohne Leerzeichen an den Rändern
  const [before, after = ''] = (name ? label.split('{name}') : [label]).map((p) => p.trim());
  const textStyle = [styles.pillText, filled && styles.pillTextFilled];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: check }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, filled ? styles.pillFilled : styles.pillOutline, pressed && styles.pressed]}
    >
      {check ? <Icon name="check" size={16} color={color.showcaseCards.ink} /> : null}
      {before ? <Text style={textStyle}>{before}</Text> : null}
      {name ? (
        <Text noTranslate numberOfLines={1} style={[textStyle, styles.pillName]}>
          {name}
        </Text>
      ) : null}
      {after ? <Text style={textStyle}>{after}</Text> : null}
    </Pressable>
  );
}

/** AGB und Impressum als schlichte Zeilen, ein Tipp klappt sie auf */
function FootRow({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.footRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [styles.footHead, pressed && styles.pressed]}
      >
        <Text style={styles.footLabel}>{label}</Text>
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <Icon name="chevron-right" size={18} color={color.text.primary} />
        </View>
      </Pressable>
      {open ? <View style={styles.footBody}>{children}</View> : null}
    </View>
  );
}

/** Services auf einer eigenen Karte; eingeklappt, wenn die Gründer:in das so eingestellt hat */
function ServicesCard({ services, collapsed }: { services?: string; collapsed: boolean }) {
  const [open, setOpen] = useState(!collapsed);
  const bg = color.showcaseCards.services;
  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      {!services ? (
        <Text style={[styles.cardInk, styles.cardSoft]}>Noch keine Services</Text>
      ) : open ? (
        <RichText value={services} style={styles.cardInk} />
      ) : null}
      {services && collapsed ? (
        <View style={styles.cardActions}>
          <HandButton label={open ? 'Weniger anzeigen' : 'Services anzeigen'} onPress={() => setOpen((o) => !o)} />
        </View>
      ) : null}
    </View>
  );
}

function PostCard({ post: p, onPress }: { post: ShowcasePost; onPress: () => void }) {
  const kind = p.type === 'before_after' ? t('Us-Challenge') : p.type === 'individual' ? t('We-Challenge') : t('Post');
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.post, pressed && styles.pressed]}>
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


const ink = color.showcaseCards.ink;

const styles = StyleSheet.create({
  // Mehr Luft zwischen den Abschnitten (Daria, 2026-11-11)
  page: { gap: space[32] },
  // Kopf ohne Kasten wie auf der Webseite (Daria, 2026-11-17)
  head: { gap: space[16] },
  manageBottom: { alignSelf: 'center' },
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md },
  // Logo rechtsbündig im Ausschnitt des Titelbilds wie im Web (Daria, 2026-11-17)
  logo: {
    position: 'absolute',
    right: space[12],
    bottom: -LOGO / 2,
    borderWidth: 6,
    borderColor: color.bg.screen,
  },
  // Rechts Platz fürs Logo, der Name läuft nie darunter
  nameBlock: { gap: space[2], paddingRight: LOGO + space[12] },
  name: { ...text.display, color: color.text.primary },
  kiez: { ...text.bodySm, color: color.text.secondary },
  // Etwas größere Schrift und mehr Luft (Daria, 2026-11-17)
  about: { ...text.bodyLarge, color: color.text.primary },
  aboutEmpty: { ...text.bodyLarge, color: color.text.secondary, fontStyle: 'italic' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8], marginTop: space[4] },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    minHeight: 40,
    paddingHorizontal: space[16],
    borderRadius: radius.full,
  },
  pillFilled: { backgroundColor: color.showcaseCards.event, maxWidth: '100%' },
  pillName: { flexShrink: 1 },
  pillOutline: { borderWidth: 1.5, borderColor: color.text.secondary },
  pillText: { ...text.label, color: color.text.primary },
  pillTextFilled: { color: ink },
  buttons: { gap: space[8] },
  // Kartenreihen wie im Kalender: über die Seitenränder hinaus wischbar
  rowScroll: { marginHorizontal: -space[16] },
  // Höhe nach Inhalt wie die Karten in Routine (Daria, 2026-11-17)
  row: { paddingHorizontal: space[16], paddingVertical: space[6], gap: space[12], alignItems: 'flex-start' },
  slot: { flexDirection: 'column' },
  card: { gap: space[12], padding: space[20], borderRadius: radius.md },
  cardHead: { flexDirection: 'row', gap: space[12], alignItems: 'flex-start' },
  flex: { flex: 1, gap: space[4] },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  cardKicker: { ...text.labelSm, color: color.showcaseCards.inkSoft },
  cardTitle: { ...text.cardTitle, color: ink },
  cardInk: { ...text.bodyLarge, color: ink },
  cardSoft: { color: color.showcaseCards.inkSoft, fontStyle: 'italic' },
  linkList: { marginTop: space[4] },
  linkRowFirst: { paddingTop: 0 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[12] },
  linkRowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(color.showcaseCards.ink, 0.25) },
  linkLabel: { ...text.label, color: ink },
  linkSub: { ...text.body, color: color.showcaseCards.inkSoft },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8], paddingTop: space[8] },
  // Feed auf Grau bis an den Rand, wie die anderen Feeds (Daria, 2026-11-17)
  band: {
    gap: space[24],
    marginHorizontal: -space[16],
    marginBottom: -space[24],
    paddingHorizontal: space[16],
    paddingTop: space[24],
    paddingBottom: space[48],
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: color.showcaseCards.band,
  },
  // Deutlich Abstand zwischen den Karten (Daria, 2026-11-10)
  list: { gap: space[32] },
  meta: { ...text.caption, color: color.text.secondary },
  footRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.text.secondary },
  footHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56 },
  footLabel: { ...text.bodyLarge, color: color.text.primary },
  footBody: { paddingBottom: space[16] },
  // Wenig Rundung wie die Posts im Feed (Daria, 2026-11-10)
  post: { borderRadius: radius.post, backgroundColor: color.showcaseCards.post, overflow: 'hidden' },
  pressed: { opacity: 0.7 },
  image: { width: '100%', aspectRatio: 4 / 3 },
  cardBody: { gap: space[4], padding: space[16] },
  kicker: { ...text.captionStrong, color: color.accent.signal },
  title: { ...text.cardTitle, color: color.text.primary },
  sub: { ...text.caption, color: color.text.secondary },
});
