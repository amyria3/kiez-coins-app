import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Text } from '../components/T';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionBar } from '../components/ActionBar';
import { BountyBadge, StatusBadge } from '../components/Badges';
import { Button } from '../components/Button';
import { KaterCard } from '../components/Content';
import { Segments } from '../components/FeedHeader';
import { Icon } from '../components/icons/Icon';
import { NavigationBar } from '../components/NavigationBar';
import { formatDayMonthShort, formatDurationSince, formatRelative, formatRemainingShort, nameInText } from '../data/format';
import { useRequireKiez } from '../data/kiez';
import { isGroupDone } from '../data/reise';
import { useStore } from '../data/store';
import type { Challenge, User } from '../data/types';
import { useAppDimensions } from '../theme/layout';
import { color, font, isFashionable, radius, size, space, stroke, text } from '../theme/tokens';
import { t } from '../data/texts';
import { useGoBack } from '../lib/goBack';
import { isParticipant } from '../data/weChallenge';

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

/** Eine Seite pro Challenge, erledigte Gruppenaufgaben und gelöschte jeweils zusammen auf einer Seite. */
type Page =
  | { kind: 'challenge'; challenge: Challenge }
  | { kind: 'groupDone'; challenges: Challenge[] }
  | { kind: 'deleted'; challenges: Challenge[] };

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
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  const requireKiez = useRequireKiez();
  const { challenges, users, groups, currentUserId, dispatch } = useStore();
  // `archiv=1`: gleich im Reiter „Archiv“ öffnen (von „Was Du so machst“, In Gruppen)
  const { archiv } = useLocalSearchParams<{ archiv?: string }>();
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
  const openedArchive = useRef(false);
  useEffect(() => {
    if (archiv !== '1' || openedArchive.current || !pageHeight || !width) return;
    openedArchive.current = true;
    pager.current?.scrollTo({ x: width, animated: false });
    archiveRef.current = true;
    setArchive(true);
  }, [archiv, pageHeight, width]);

  const { activePages, archivePages } = useMemo(() => {
    const own = challenges.filter((c) => c.authorId === currentUserId);
    const inArchive = (c: Challenge) => c.status === 'closed' || c.status === 'deleted' || isGroupDone(c);
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
    // Erledigte Gruppenaufgaben: selbst erstellt oder angenommen
    const groupDone = challenges
      .filter((c) => isGroupDone(c) && (c.authorId === currentUserId || isParticipant(c, currentUserId)))
      .sort((a, b) => (b.confirmedAt ?? '').localeCompare(a.confirmedAt ?? ''));
    const list: Page[] = [];
    if (groupDone.length) list.push({ kind: 'groupDone', challenges: groupDone });
    list.push(...closed.map((challenge): Page => ({ kind: 'challenge', challenge })));
    if (deleted.length) list.push({ kind: 'deleted', challenges: deleted });
    return { activePages, archivePages: list };
  }, [challenges, currentUserId]);

  const create = () => requireKiez() && router.push('/challenge/create/step-1');
  // Vorher-Nachher: zurück zum Timer bzw. Nachher (Route vorher-nachher/[id])
  const openDraft = (c: Challenge) =>
    c.type === 'before_after'
      ? router.push({ pathname: '/before-after/[id]', params: { id: c.id } })
      : requireKiez() && router.push({ pathname: '/challenge/create/step-1', params: { draftId: c.id } });
  // Kopie: neue Challenge mit Foto, Titel, Text, Ort und Bounty der alten. Gruppenaufgaben bleiben in ihrer Gruppe.
  const copy = (c: Challenge) =>
    c.groupId
      ? router.push({ pathname: '/groups/[id]/task', params: { id: c.groupId, copyOf: c.id } })
      : requireKiez() && router.push({ pathname: '/challenge/create/step-1', params: { copyOf: c.id } });

  const close = (c: Challenge) =>
    Alert.alert(
      'Challenge schließen?',
      c.groupId
        ? 'Bestätigen? Deine Gruppenmitglieder können diese Challenge nicht mehr annehmen. (Sie bleibt aber im Feed sichtbar.)'
        : 'Bestätigen? Deine Nachbar:innen können diese Challenge nicht mehr annehmen. (Sie bleibt aber im Feed sichtbar.)',
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
        : 'Die Challenge verschwindet aus dem Feed.',
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
      'Die Challenge verschwindet samt Kommentaren. Das ist irreparabel, lässt sich nicht rückgängig machen.',
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
                ? 'Hier liegen später Deine geschlossenen und gelöschten Challenges und erledigte We-Challenges aus Deinen Gruppen.'
                : 'Du hast noch keine laufende Challenge. Fange mit einem Foto an.'}
            </KaterCard>
          </View>
        ) : (
          <FlatList
            data={pages}
            keyExtractor={(p) => (p.kind === 'challenge' ? p.challenge.id : p.kind)}
            pagingEnabled
            snapToInterval={pageHeight}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={32}
            getItemLayout={(_, i) => ({ length: pageHeight, offset: pageHeight * i, index: i })}
            renderItem={({ item: page, index: i }) => {
              const hasNext = i < pages.length - 1;
              if (page.kind === 'groupDone') {
                return (
                  <View style={[styles.page, { height: pageHeight }]}>
                    <GroupDoneCard
                      challenges={page.challenges}
                      userId={currentUserId}
                      groupName={(id) => groups.find((g) => g.id === id)?.name}
                      onOpen={(c) => router.push(`/challenge/${c.id}`)}
                    />
                  </View>
                );
              }
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
        onLeadingPress={() => (goBack())}
      />
      <View style={styles.switch}>
        <Segments
          tabs={[
            { key: 'active', label: 'Aktuell' },
            { key: 'archive', label: 'Archiv' },
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
  // Vorher-Nachher hat nach dem Posten nichts zu bearbeiten oder zu schließen
  const isBeforeAfter = c.type === 'before_after';
  const isOpen = c.status === 'open' && !c.assigneeId && !isBeforeAfter;
  const canDelete = deletable(c);

  const state = isDraft
    ? {
        value: 'Entwurf',
        hint: isBeforeAfter ? (c.timerStartedAt ? 'Me-Challenge, Timer läuft' : 'Me-Challenge, Timer noch nicht gestartet') : 'Nur für Dich sichtbar',
      }
    : isBeforeAfter && c.status === 'open'
      ? { value: 'Gepostet', hint: formatRelative(c.createdAt) }
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

  if (isFashionable) {
    return (
      <FashionCard
        challenge={c}
        hint={state.hint}
        photo={photo}
        isDraft={isDraft}
        isOpen={isOpen}
        canDelete={canDelete}
        onOpen={onOpen}
        onEdit={onEdit}
        onClose={onClose}
        onCopy={onCopy}
        onDelete={onDelete}
        onComments={onComments}
        hasNext={hasNext}
      />
    );
  }

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
            <StatusBadge status={c.status} challenge={c} />
            {c.bountyAmount ? <BountyBadge amount={c.bountyAmount} /> : null}
          </View>
          {state.hint ? (
            <Text style={styles.caption} numberOfLines={1}>
              {state.hint}
            </Text>
          ) : null}
        </View>
        <Icon name="chevron-right" size={size.icon} color={color.text.secondary} />
      </Pressable>

      {c.text ? (
        <Text style={styles.body} numberOfLines={3}>
          {c.text}
        </Text>
      ) : null}

      {/* Zahlen als offene Leiste ohne Flächen, damit sie nicht wie Knöpfe aussehen (Daria, 22.10.2026).
          Nur „Kommentare“ ist tippbar und trägt dafür einen Pfeil. */}
      <View style={styles.stats}>
        <Metric value={c.views === undefined ? '–' : String(c.views)} hint={c.views === 1 ? 'Ansicht' : 'Ansichten'} />
        <View style={styles.statLine} />
        <Metric
          value={String(c.comments.length)}
          hint={c.comments.length === 1 ? 'Kommentar' : 'Kommentare'}
          onPress={isDraft ? undefined : onComments}
        />
        <View style={styles.statLine} />
        <Metric value={isDraft ? '–' : formatDurationSince(c.createdAt)} hint={isDraft ? 'Entwurf' : 'online'} />
      </View>

      <View style={styles.flex} />

      <View style={styles.actions}>
        {isDraft ? (
          <Button label="Weiter bearbeiten" onPress={onEdit} />
        ) : c.status === 'closed' ? (
          <Button label="Kopie erstellen" onPress={onCopy} />
        ) : null}
        {/* Leise Aktionen als Leiste wie auf der Gruppenkarte, damit sie die Karte nicht beherrschen (Daria, 24.10.2026).
            Löschen bleibt ausgegraut tippbar: Die Meldung erklärt, warum es nicht geht. */}
        <View style={styles.quietBar}>
          {isOpen ? (
            <>
              <QuietAction label="Bearbeiten" onPress={onEdit} />
              <View style={styles.quietDivider} />
              <QuietAction label="Schließen" onPress={onClose} />
            </>
          ) : isDraft ? null : (
            <QuietAction label="Ansehen" onPress={onOpen} />
          )}
          {isDraft ? null : <View style={styles.quietDivider} />}
          <QuietAction label="Löschen" danger muted={!canDelete} onPress={onDelete} />
        </View>
      </View>
      {hasNext ? <Text style={styles.next}>Nach oben wischen für die nächste</Text> : null}
    </View>
  );
}

/** Leise Aktion: nur Text, gleich breit neben ihren Nachbarn */
function QuietAction({ label, onPress, danger, muted }: { label: string; onPress: () => void; danger?: boolean; muted?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(label)}
      onPress={onPress}
      style={({ pressed }) => [styles.quietAction, muted && styles.muted, pressed && styles.pressed]}
    >
      <Text style={[styles.quietLabel, danger && styles.quietDanger]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Letzte Seite im Archiv: gelöschte Challenges, zugeklappt. Aufgeklappt mit „Bearbeiten“.
 * Erst im Bearbeiten-Screen entscheidet die Person: veröffentlichen oder weiter nicht veröffentlichen.
 */
/** Erledigte Gruppenaufgaben als Liste: Gruppe, ob erstellt oder angenommen, wann erledigt. Tipp öffnet das Detail. */
function GroupDoneCard({
  challenges,
  userId,
  groupName,
  onOpen,
}: {
  challenges: Challenge[];
  userId: string;
  groupName: (id: string) => string | undefined;
  onOpen: (c: Challenge) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.badges}>
        <StatusBadge status="confirmed" />
        <Text style={styles.caption}>
          {challenges.length === 1 ? t('1 We-Challenge in der Gruppe') : t('{count} We-Challenges in der Gruppe', { count: challenges.length })}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.deletedList} showsVerticalScrollIndicator={false}>
        {challenges.map((c) => {
          const photo = c.image ?? c.imageAfter ?? c.report?.photo ?? c.imageBefore;
          const mine = c.authorId === userId;
          const title = !mine && c.operationName ? c.operationName : c.title || t('Ohne Titel');
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityLabel={title}
              onPress={() => onOpen(c)}
              style={({ pressed }) => [styles.deletedItem, styles.head, pressed && styles.pressed]}
            >
              {photo ? (
                <Image source={photo} style={styles.thumbSmall} contentFit="cover" />
              ) : (
                <View style={[styles.thumbSmall, styles.thumbEmpty]}>
                  <Icon name="camera" size={size.icon} color={color.text.secondary} />
                </View>
              )}
              <View style={styles.flex}>
                <Text style={styles.deletedTitle} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.caption} numberOfLines={1}>
                  {[
                    c.groupId ? groupName(c.groupId) : null,
                    mine ? t('Erstellt') : t('Angenommen'),
                    c.confirmedAt ? formatDayMonthShort(c.confirmedAt) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Icon name="chevron-right" size={size.icon} color={color.text.secondary} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

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
                      c.edensteine ? 'mit Edensteinen' : null,
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

/** Zahl ohne Fläche: Wert groß, darunter in Worten, was er zählt („1“ / „Kommentar“). Tippbar mit Pfeil. */
/**
 * Verwaltungskarte im Look „Fashionable“ nach Darias Mockup (24.10.2026): keine Fläche, alles direkt auf dem Grund.
 * Maße in pt, seitlich 24 (unter 360 Breite 16): Bild 56 mit Radius 8, 21 unter den Reitern, 12 bis zum Titel
 * (halbfett 16/20), Hinweis 13/18 grau. Zahlen 24 unter dem Bild, halbfett 16/20 über 13/18, ohne Trennstriche,
 * 16 bis zu den Knöpfen. Knöpfe nebeneinander, 34 hoch, 8 Abstand, Radius 8, halbfett 14, grau gefüllt
 * (Hauptaktion blau). „Challenge löschen“ als roter Text, 44 hoch, darunter nach 15 eine Haarlinie.
 */
function FashionCard({
  challenge: c,
  hint,
  photo,
  isDraft,
  isOpen,
  canDelete,
  onOpen,
  onEdit,
  onClose,
  onCopy,
  onDelete,
  onComments,
  hasNext,
}: Omit<CardProps, 'assignee'> & {
  hint: string;
  photo?: Challenge['image'];
  isDraft: boolean;
  isOpen: boolean;
  canDelete: boolean;
}) {
  const { width } = useAppDimensions();
  const side = { paddingHorizontal: width < 360 ? space[16] : space[24] };
  const buttons: { label: string; onPress: () => void; primary?: boolean }[] = isDraft
    ? [{ label: 'Weiter bearbeiten', onPress: onEdit, primary: true }]
    : isOpen
      ? [
          { label: 'Bearbeiten', onPress: onEdit },
          { label: 'Schließen', onPress: onClose },
        ]
      : c.status === 'closed'
        ? [
            { label: 'Kopie erstellen', onPress: onCopy, primary: true },
            { label: 'Ansehen', onPress: onOpen },
          ]
        : [{ label: 'Ansehen', onPress: onOpen }];
  return (
    <View style={fashion.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('{title} öffnen', { title: c.title || t('Ohne Titel') })}
        onPress={onOpen}
        style={({ pressed }) => [fashion.head, side, pressed && styles.pressed]}
      >
        {photo ? (
          <Image source={photo} style={fashion.thumb} contentFit="cover" />
        ) : (
          <View style={[fashion.thumb, fashion.thumbEmpty]}>
            <Icon name="camera" size={14} color={color.text.secondary} />
          </View>
        )}
        <View style={fashion.headText}>
          <Text style={fashion.title} numberOfLines={2}>
            {c.title || 'Ohne Titel'}
          </Text>
          {hint ? (
            <Text style={fashion.hint} numberOfLines={1}>
              {hint}
            </Text>
          ) : null}
        </View>
        <Icon name="chevron-right" size={16} color={color.text.secondary} />
      </Pressable>

      <View style={[fashion.stats, side]}>
        <FashionMetric value={c.views === undefined ? '–' : String(c.views)} label={c.views === 1 ? 'Ansicht' : 'Ansichten'} />
        <FashionMetric
          value={String(c.comments.length)}
          label={c.comments.length === 1 ? 'Kommentar' : 'Kommentare'}
          onPress={isDraft ? undefined : onComments}
        />
        <FashionMetric value={isDraft ? '–' : formatDurationSince(c.createdAt)} label={isDraft ? 'Entwurf' : 'online'} />
      </View>

      <View style={[fashion.buttons, side]}>
        {buttons.map((b) => (
          <Pressable
            key={b.label}
            accessibilityRole="button"
            onPress={b.onPress}
            style={({ pressed }) => [fashion.button, b.primary && fashion.buttonPrimary, pressed && styles.pressed]}
          >
            <Text style={[fashion.buttonText, b.primary && fashion.buttonTextPrimary]}>{b.label}</Text>
          </Pressable>
        ))}
      </View>
      {/* Ausgegraut, bleibt aber tippbar: Die Meldung erklärt, warum Löschen nicht geht. */}
      <Pressable
        accessibilityRole="button"
        onPress={onDelete}
        style={({ pressed }) => [fashion.delete, !canDelete && styles.muted, pressed && styles.pressed]}
      >
        <Text style={fashion.deleteText}>Challenge löschen</Text>
      </Pressable>
      <View style={fashion.line} />

      <View style={styles.flex} />
      {hasNext ? <Text style={[styles.next, fashion.next]}>Nach oben wischen für die nächste</Text> : null}
    </View>
  );
}

function FashionMetric({ value, label, onPress }: { value: string; label: string; onPress?: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [fashion.metric, pressed && onPress ? styles.pressed : null]}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${value} ${label}`}
      onPress={onPress}
    >
      <Text style={fashion.metricValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={fashion.metricLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const fashion = StyleSheet.create({
  card: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingTop: 21, paddingBottom: 14 },
  thumb: { width: 56, height: 56, borderRadius: radius.md },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg.surface },
  headText: { flex: 1, gap: space[2] },
  title: { fontFamily: font.semiBold, fontSize: 16, lineHeight: 20, color: color.text.primary },
  hint: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.text.secondary },
  stats: { flexDirection: 'row', paddingTop: 10, paddingBottom: space[16] },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { fontFamily: font.semiBold, fontSize: 16, lineHeight: 20, color: color.text.primary, fontVariant: ['tabular-nums'] },
  metricLabel: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.text.primary },
  buttons: { flexDirection: 'row', gap: space[8] },
  button: { flex: 1, height: 34, borderRadius: radius.md, backgroundColor: color.bg.surface, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: color.accent.primary },
  buttonText: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 18, color: color.text.primary },
  buttonTextPrimary: { color: color.text.onAccent },
  delete: { alignSelf: 'center', height: 44, marginTop: space[8], paddingHorizontal: space[16], justifyContent: 'center' },
  deleteText: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 18, color: color.accent.error },
  line: { height: stroke.ultraThin, backgroundColor: color.line.hairline, marginTop: 15 },
  next: { fontSize: 12, lineHeight: 16 },
});

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
        <View style={styles.metricHint}>
          <Text style={[styles.caption, onPress ? styles.link : null]} numberOfLines={1}>
            {hint}
          </Text>
          {onPress ? <Icon name="chevron-right" size={10} color={color.text.primary} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  flex: { flex: 1 },
  empty: { padding: space[16] },
  // Fashionable Look: Unterstrich-Reiter über die ganze Breite
  switch: isFashionable ? {} : { paddingHorizontal: space[16], paddingBottom: space[8] },
  page: isFashionable
    ? { paddingBottom: space[12] }
    : { paddingHorizontal: space[16], paddingTop: space[8], paddingBottom: space[12] },
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
  stats: { flexDirection: 'row', alignItems: 'stretch', paddingVertical: space[4] },
  statLine: { width: stroke.thin, backgroundColor: color.line.hairline, marginVertical: space[4] },
  metric: { flex: 1, alignItems: 'center', gap: space[2], paddingVertical: space[4] },
  metricHint: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  link: { color: color.text.primary },
  metricValue: { ...text.metric, color: color.text.primary },
  caption: { ...text.caption, color: color.text.secondary },
  actions: { gap: space[8] },
  quietBar: { flexDirection: 'row', borderTopWidth: stroke.ultraThin, borderTopColor: color.line.hairline },
  quietAction: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  quietDivider: { width: stroke.ultraThin, backgroundColor: color.line.hairline, marginVertical: space[12] },
  quietLabel: { ...text.body, color: color.text.primary },
  quietDanger: { color: color.accent.error },
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
