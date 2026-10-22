import { useMemo, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Text } from '../components/T';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionBar } from '../components/ActionBar';
import { BountyBadge, StatusBadge } from '../components/Badges';
import { Button } from '../components/Button';
import { KaterCard } from '../components/Content';
import { Segments } from '../components/FeedHeader';
import { Icon } from '../components/icons/Icon';
import { NavigationBar } from '../components/NavigationBar';
import { formatDayMonthShort, formatDurationSince, formatRemainingShort, nameInText } from '../data/format';
import { useRequireKiez } from '../data/kiez';
import { useStore } from '../data/store';
import type { Challenge, User } from '../data/types';
import { useAppDimensions } from '../theme/layout';
import { color, radius, size, space, stroke, text } from '../theme/tokens';
import { t } from '../data/texts';

/** Reihenfolge: zuerst, was noch änderbar ist, dann was läuft, dann Entwürfe, dann Erledigtes */
const ORDER: Record<string, number> = {
  open: 0,
  accepted: 1,
  reported: 1,
  payment_open: 1,
  paid_marked: 1,
  rejected: 1,
  draft: 2,
  confirmed: 3,
  paid: 3,
  closed: 3,
};

/** Eine Seite pro Challenge, gelöschte zusammen auf der letzten Seite. */
type Page = { kind: 'challenge'; challenge: Challenge } | { kind: 'deleted'; challenges: Challenge[] };

// Löschen bis jemand annimmt: Entwürfe, offene und geschlossene (Migration 20261021000300)
const deletable = (c: Challenge) =>
  c.status === 'draft' || ((c.status === 'open' || c.status === 'closed') && !c.assigneeId);

/**
 * Route `manage` („Deine Challenges“). Erreichbar über „Verwalten“ an eigenen Posts im Feed und im Detail.
 * Jede eigene Challenge ist eine Karte fast in Bildschirmhöhe. Mehrere Karten wechselt man durch Wischen nach oben oder unten.
 * Der Switch oben zeigt statt der laufenden die geschlossenen und gelöschten Challenges, dort ohne „Neue Challenge“.
 */
export default function ManageChallenges() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const requireKiez = useRequireKiez();
  const { challenges, users, currentUserId, dispatch } = useStore();
  const [pageHeight, setPageHeight] = useState(0);
  // Aktuelle Seite je Reiter, für „2 von 5“
  const [index, setIndex] = useState({ active: 0, archive: 0 });
  // Archiv: geschlossene und gelöschte Challenges. Wischen nach links oder Tippen auf den Reiter wechselt.
  const [archive, setArchive] = useState(false);
  const archiveRef = useRef(false);
  const { width } = useAppDimensions();
  const pager = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const progress = useMemo(
    () => scrollX.interpolate({ inputRange: [0, Math.max(width, 1)], outputRange: [0, 1], extrapolate: 'clamp' }),
    [scrollX, width],
  );
  const onPagerScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: false,
        listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
          // Ab der Hälfte gilt der andere Reiter: Pille, Seitenzahl und Button wechseln mit
          const next = e.nativeEvent.contentOffset.x > width / 2;
          if (next !== archiveRef.current) {
            archiveRef.current = next;
            setArchive(next);
          }
        },
      }),
    [scrollX, width],
  );
  const showTab = (key: 'active' | 'archive') =>
    pager.current?.scrollTo({ x: key === 'archive' ? width : 0, animated: true });

  const { activePages, archivePages } = useMemo(() => {
    const own = challenges.filter((c) => c.authorId === currentUserId);
    const inArchive = (c: Challenge) => c.status === 'closed' || c.status === 'deleted';
    const active = own
      .filter((c) => !inArchive(c))
      .sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || b.createdAt.localeCompare(a.createdAt));
    const activePages: Page[] = active.map((challenge) => ({ kind: 'challenge', challenge }));
    const closed = own
      .filter((c) => c.status === 'closed')
      .sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''));
    const deleted = own
      .filter((c) => c.status === 'deleted')
      .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));
    const list: Page[] = closed.map((challenge) => ({ kind: 'challenge', challenge }));
    if (deleted.length) list.push({ kind: 'deleted', challenges: deleted });
    return { activePages, archivePages: list };
  }, [challenges, currentUserId]);

  const create = () => requireKiez() && router.push('/challenge/create/step-1');
  const openDraft = (c: Challenge) =>
    requireKiez() && router.push({ pathname: '/challenge/create/step-1', params: { draftId: c.id } });
  // Kopie: neue Challenge mit Foto, Titel, Text, Ort und Bounty der alten. Gruppenaufgaben bleiben in ihrer Gruppe.
  const copy = (c: Challenge) =>
    c.groupId
      ? router.push({ pathname: '/gruppen/[id]/aufgabe', params: { id: c.groupId, copyOf: c.id } })
      : requireKiez() && router.push({ pathname: '/challenge/create/step-1', params: { copyOf: c.id } });

  const close = (c: Challenge) =>
    Alert.alert(
      'Challenge schließen?',
      'Die Challenge bleibt im Feed sichtbar, lässt sich aber nicht mehr annehmen oder kommentieren. Das lässt sich nicht rückgängig machen.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Schließen', style: 'destructive', onPress: () => dispatch({ type: 'close', id: c.id }) },
      ],
    );

  const remove = (c: Challenge) => {
    if (!deletable(c)) {
      const running = !!c.assigneeId;
      Alert.alert(
        'Löschen geht nicht mehr',
        running
          ? 'Jemand hat die Challenge schon angenommen. Damit niemand umsonst loszieht, lässt sie sich nicht mehr löschen. Der Kundenservice hilft Dir weiter.'
          : 'Erledigte Challenges bleiben in der Timeline sichtbar. Der Kundenservice hilft Dir weiter.',
        [
          { text: 'OK', style: 'cancel' },
          {
            text: 'Kundenservice',
            onPress: () =>
              router.push({
                pathname: '/account/support',
                params: { text: `Ich möchte meine Challenge „${c.title || 'Ohne Titel'}“ löschen. Grund: ` },
              }),
          },
        ],
      );
      return;
    }
    const isDraft = c.status === 'draft';
    Alert.alert(
      isDraft ? 'Entwurf löschen?' : 'Challenge löschen?',
      isDraft
        ? 'Das lässt sich nicht rückgängig machen.'
        : 'Die Challenge verschwindet aus dem Feed. Unter „Geschlossen und gelöscht“ kannst Du sie bearbeiten und wieder veröffentlichen.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => dispatch({ type: isDraft ? 'deleteDraft' : 'delete', id: c.id }),
        },
      ],
    );
  };

  const purge = (c: Challenge) =>
    Alert.alert(
      'Endgültig löschen?',
      'Die Challenge verschwindet samt Kommentaren für immer. Das lässt sich nicht rückgängig machen.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Endgültig löschen', style: 'destructive', onPress: () => dispatch({ type: 'purge', id: c.id }) },
      ],
    );

  const renderList = (pages: Page[], tab: 'active' | 'archive') => {
    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!pageHeight) return;
      const next = Math.round(e.nativeEvent.contentOffset.y / pageHeight);
      if (next !== index[tab]) setIndex((all) => ({ ...all, [tab]: next }));
    };
    return (
      <View style={{ width, height: pageHeight }}>
        {pages.length === 0 ? (
          <View style={styles.empty}>
            <KaterCard>
              {tab === 'archive'
                ? 'Hier liegen später Deine geschlossenen und gelöschten Challenges.'
                : 'Du hast noch keine laufende Challenge. Fang mit einem Foto an.'}
            </KaterCard>
          </View>
        ) : (
          <FlatList
            data={pages}
            keyExtractor={(p) => (p.kind === 'deleted' ? 'deleted' : p.challenge.id)}
            pagingEnabled
            snapToInterval={pageHeight}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={32}
            getItemLayout={(_, i) => ({ length: pageHeight, offset: pageHeight * i, index: i })}
            renderItem={({ item: page, index: i }) => {
              const hasNext = i < pages.length - 1;
              if (page.kind === 'deleted') {
                return (
                  <View style={[styles.page, { height: pageHeight }]}>
                    <DeletedCard
                      challenges={page.challenges}
                      onOpen={(c) => router.push(`/challenge/${c.id}`)}
                      onEdit={(c) => requireKiez() && router.push(`/challenge/${c.id}/edit`)}
                      onPurge={purge}
                    />
                  </View>
                );
              }
              const item = page.challenge;
              return (
                <View style={[styles.page, { height: pageHeight }]}>
                  <ChallengeCard
                    challenge={item}
                    assignee={users.find((u) => u.id === item.assigneeId)}
                    onOpen={() => (item.status === 'draft' ? openDraft(item) : router.push(`/challenge/${item.id}`))}
                    onEdit={() => (item.status === 'draft' ? openDraft(item) : router.push(`/challenge/${item.id}/edit`))}
                    onClose={() => close(item)}
                    onCopy={() => copy(item)}
                    onDelete={() => remove(item)}
                    onComments={() => router.push({ pathname: '/challenge/[id]', params: { id: item.id, kommentare: '1' } })}
                    hasNext={hasNext}
                  />
                </View>
              );
            }}
          />
        )}
      </View>
    );
  };

  const pages = archive ? archivePages : activePages;
  const current = Math.min(index[archive ? 'archive' : 'active'], Math.max(pages.length - 1, 0));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <NavigationBar
        title="Deine Challenges"
        subtitle={pages.length > 1 ? t('{current} von {pages}', { current: current + 1, pages: pages.length }) : undefined}
        variant="back"
        onLeadingPress={() => (router.canGoBack() ? router.back() : router.replace('/feed'))}
      />
      <View style={styles.switch}>
        <Segments
          tabs={[
            { key: 'active', label: 'Aktuell' },
            { key: 'archive', label: 'Geschlossen und gelöscht' },
          ]}
          selectedKey={archive ? 'archive' : 'active'}
          onChange={showTab}
          progress={progress}
        />
      </View>
      <View style={styles.flex} onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}>
        {pageHeight > 0 ? (
          <Animated.ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onScroll={onPagerScroll}
            scrollEventThrottle={16}
          >
            {renderList(activePages, 'active')}
            {renderList(archivePages, 'archive')}
          </Animated.ScrollView>
        ) : null}
      </View>
      {archive ? (
        <View style={{ height: insets.bottom }} />
      ) : (
        <ActionBar>
          <Button label="Neue Challenge" onPress={create} />
        </ActionBar>
      )}
    </View>
  );
}

type CardProps = {
  challenge: Challenge;
  assignee?: User;
  onOpen: () => void;
  onEdit: () => void;
  onClose: () => void;
  /** Bei geschlossenen Challenges */
  onCopy: () => void;
  onDelete: () => void;
  /** Kachel „Kommentare“: Challenge mit den Kommentaren öffnen */
  onComments: () => void;
  hasNext: boolean;
};

function ChallengeCard({ challenge: c, assignee, onOpen, onEdit, onClose, onCopy, onDelete, onComments, hasNext }: CardProps) {
  const isDraft = c.status === 'draft';
  const isOpen = c.status === 'open' && !c.assigneeId;
  const canDelete = deletable(c);

  const state = isDraft
    ? { value: 'Entwurf', hint: 'Nur für Dich sichtbar' }
    : isOpen
      ? { value: 'Offen', hint: formatRemainingShort(c.deadline) }
      : c.assigneeId
        ? {
            value: 'Angenommen',
            hint: [assignee ? `von ${nameInText(assignee)}` : null, c.acceptedAt ? `am ${formatDayMonthShort(c.acceptedAt)}` : null]
              .filter(Boolean)
              .join(' '),
          }
        : c.status === 'closed'
          ? { value: 'Geschlossen', hint: c.closedAt ? `am ${formatDayMonthShort(c.closedAt)}` : '' }
          : { value: 'Erledigt', hint: c.confirmedAt ? `am ${formatDayMonthShort(c.confirmedAt)}` : '' };
  const photo = c.image ?? c.imageAfter ?? c.imageBefore;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('{title} öffnen', { title: c.title || t('Ohne Titel') })}
        onPress={onOpen}
        style={({ pressed }) => [styles.head, pressed && styles.pressed]}
      >
        {photo ? (
          <Image source={photo} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Icon name="camera" size={size.icon} color={color.text.secondary} />
          </View>
        )}
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={2}>
            {c.title || 'Ohne Titel'}
          </Text>
          <View style={styles.badges}>
            <StatusBadge status={c.status} />
            {c.bountyAmount ? <BountyBadge amount={c.bountyAmount} /> : null}
          </View>
        </View>
        <Icon name="chevron-right" size={size.icon} color={color.text.secondary} />
      </Pressable>

      {c.text ? (
        <Text style={styles.body} numberOfLines={3}>
          {c.text}
        </Text>
      ) : null}

      <View style={styles.grid}>
        <Metric
          value={c.views === undefined ? '–' : String(c.views)}
          hint={c.views === 1 ? 'Ansicht' : 'Ansichten'}
        />
        <Metric
          value={String(c.comments.length)}
          hint={c.comments.length === 1 ? 'Kommentar' : 'Kommentare'}
          onPress={isDraft ? undefined : onComments}
        />
        <Metric
          value={isDraft ? '–' : formatDurationSince(c.createdAt)}
          hint={isDraft ? 'Noch nicht veröffentlicht' : 'online seit Veröffentlichung'}
        />
        <Metric value={state.value} hint={state.hint} />
      </View>

      <View style={styles.flex} />

      <View style={styles.actions}>
        {isDraft ? (
          <Button label="Weiter bearbeiten" onPress={onEdit} />
        ) : isOpen ? (
          <>
            <Button label="Bearbeiten" variant="secondary" onPress={onEdit} />
            <Button label="Schließen" variant="secondary" onPress={onClose} />
          </>
        ) : c.status === 'closed' ? (
          <>
            <Button label="Kopie erstellen" onPress={onCopy} />
            <Button label="Ansehen" variant="secondary" onPress={onOpen} />
          </>
        ) : (
          <Button label="Ansehen" variant="secondary" onPress={onOpen} />
        )}
        {/* Ausgegraut, bleibt aber tippbar: Die Meldung erklärt, warum Löschen nicht geht. */}
        <Button
          label="Löschen"
          variant="danger"
          onPress={onDelete}
          style={canDelete ? undefined : styles.muted}
        />
      </View>
      {hasNext ? <Text style={styles.next}>Nach oben wischen für die nächste</Text> : null}
    </View>
  );
}

/**
 * Letzte Seite im Archiv: gelöschte Challenges, zugeklappt. Aufgeklappt mit „Bearbeiten“.
 * Erst im Bearbeiten-Screen entscheidet die Person: veröffentlichen oder weiter nicht veröffentlichen.
 */
function DeletedCard({
  challenges,
  onOpen,
  onEdit,
  onPurge,
}: {
  challenges: Challenge[];
  onOpen: (c: Challenge) => void;
  onEdit: (c: Challenge) => void;
  onPurge: (c: Challenge) => void;
}) {
  const [expanded, setExpanded] = useState<string>();

  return (
    <View style={styles.card}>
      <View style={styles.badges}>
        <StatusBadge status="deleted" />
        <Text style={styles.caption}>{t('{challenges}, nur für Dich sichtbar', { challenges: challenges.length === 1 ? t('1 Challenge') : t('{challenges} Challenges', { challenges: challenges.length }) })}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.deletedList} showsVerticalScrollIndicator={false}>
        {challenges.map((c) => {
          const open = expanded === c.id;
          const photo = c.image ?? c.imageAfter ?? c.imageBefore;
          return (
            <View key={c.id} style={styles.deletedItem}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                accessibilityLabel={t('{title}, gelöscht. {open}', { title: c.title || t('Ohne Titel'), open: open ? t('Zuklappen') : t('Aufklappen') })}
                onPress={() => setExpanded(open ? undefined : c.id)}
                style={({ pressed }) => [styles.head, pressed && styles.pressed]}
              >
                {photo ? (
                  <Image source={photo} style={[styles.thumbSmall, styles.dimmed]} contentFit="cover" />
                ) : (
                  <View style={[styles.thumbSmall, styles.thumbEmpty]}>
                    <Icon name="camera" size={size.icon} color={color.text.secondary} />
                  </View>
                )}
                <View style={styles.flex}>
                  <Text style={styles.deletedTitle} numberOfLines={1}>
                    {c.title || 'Ohne Titel'}
                  </Text>
                  <Text style={styles.caption}>{c.deletedAt ? t('Gelöscht am {date}', { date: formatDayMonthShort(c.deletedAt) }) : t('Gelöscht')}</Text>
                </View>
                <View style={open ? styles.chevronUp : styles.chevronDown}>
                  <Icon name="chevron-right" size={size.icon} color={color.text.secondary} />
                </View>
              </Pressable>
              {open ? (
                <View style={styles.deletedBody}>
                  {c.text ? (
                    <Text style={styles.body} numberOfLines={3}>
                      {c.text}
                    </Text>
                  ) : null}
                  <Text style={styles.caption}>
                    {[
                      c.views === undefined ? null : `${c.views} ${c.views === 1 ? 'Ansicht' : 'Ansichten'}`,
                      `${c.comments.length} Kommentare`,
                      c.bountyAmount ? 'mit Coins' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  <Button label="Bearbeiten" onPress={() => onEdit(c)} />
                  <Button label="Ansehen" variant="secondary" onPress={() => onOpen(c)} />
                  <Button label="Endgültig löschen" variant="danger" onPress={() => onPurge(c)} />
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Kachel ohne Icon: Wert groß, darunter in Worten, was er zählt („1“ / „Kommentar“) */
function Metric({ value, hint, onPress }: { value: string; hint?: string; onPress?: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.metric, pressed && onPress ? styles.pressed : null]}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${value}${hint ? ` ${hint}` : ''}`}
      onPress={onPress}
    >
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text style={styles.caption} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  flex: { flex: 1 },
  empty: { padding: space[16] },
  switch: { paddingHorizontal: space[16], paddingBottom: space[8] },
  page: { paddingHorizontal: space[16], paddingTop: space[8], paddingBottom: space[12] },
  card: {
    flex: 1,
    gap: space[16],
    padding: space[16],
    borderRadius: radius.card,
    backgroundColor: color.bg.surface,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  pressed: { opacity: 0.7 },
  thumb: { width: 72, height: 72, borderRadius: radius.xl },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: stroke.thin,
    borderColor: color.line.hairline,
  },
  title: { ...text.cardTitle, color: color.text.primary },
  badges: { flexDirection: 'row', alignItems: 'center', gap: space[8], marginTop: space[8] },
  body: { ...text.body, color: color.text.secondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  metric: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: space[4],
    padding: space[12],
    borderRadius: radius.xl,
    backgroundColor: color.bg.screen,
  },
  metricValue: { ...text.metric, color: color.text.primary },
  caption: { ...text.caption, color: color.text.secondary },
  actions: { gap: space[8] },
  row: { flexDirection: 'row', gap: space[8] },
  muted: { opacity: 0.35 },
  next: { ...text.caption, color: color.text.secondary, textAlign: 'center' },
  deletedList: { gap: space[8] },
  deletedItem: {
    gap: space[12],
    padding: space[12],
    borderRadius: radius.xl,
    backgroundColor: color.bg.screen,
  },
  deletedTitle: { ...text.body, color: color.text.primary },
  deletedBody: { gap: space[12] },
  thumbSmall: { width: 48, height: 48, borderRadius: radius.xl },
  dimmed: { opacity: 0.5 },
  chevronDown: { transform: [{ rotate: '90deg' }] },
  chevronUp: { transform: [{ rotate: '-90deg' }] },
});
