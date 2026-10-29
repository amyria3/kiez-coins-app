import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { shareText } from '../../../lib/share';
import { Text } from '../../../components/T';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthorRow } from '../../../components/AuthorRow';
import { DeadlineBadge, StatusBadge } from '../../../components/Badges';
import { CoinsIcon, LivingCrystal } from '../../../components/icons/Brand';
import { Icon } from '../../../components/icons/Icon';
import { GlassIconButton } from '../../../components/Glass';
import { IconButton } from '../../../components/IconButton';
import { Button } from '../../../components/Button';
import { CommentSection } from '../../../components/Comments';
import { InfoRow, KaterBubble, Notice, OperationTag } from '../../../components/Content';
import { TextField } from '../../../components/Form';
import { HeroScreen, SubScreen } from '../../../components/Screen';
import { beforeAfterDuration, formatBountyShort, formatCents, formatDayMonthShort, formatEuro, formatHoursMinutes, formatRelative, formatRemainingShort } from '../../../data/format';
import { WithMentions, postText } from '../../../components/WithMentions';
import { isSharedBounty, payoutOf, shareCentsOf, sharedBountyText } from '../../../data/coins';
import {
  freeSpots,
  isMultiPerson,
  maxParticipants,
  isParticipant,
  joinRequests,
  myParticipation,
  participantsOpen,
  weChallengeAfter,
} from '../../../data/weChallenge';
import { ParticipantsSection } from '../../../components/Participants';
import { useRequireKiez } from '../../../data/kiez';
import { recordView } from '../../../data/remote';
import { coordsIfAllowed, distanceMeters, KIEZ_RADIUS_METERS, type Coords } from '../../../data/location';
import { useChallenge, useStore } from '../../../data/store';
import { isPostOnly, type ChallengeStatus } from '../../../data/types';
import { color, font, radius, size, space, stroke, text } from '../../../theme/tokens';
import { t, tAbout } from '../../../data/texts';
import { useGoBack } from '../../../lib/goBack';

// Vorschläge des Katers für den Operationsnamen (später aus einer Wortliste)
const operationNames = ['Operation Gießkanne', 'Operation Igelglück', 'Operation Besenstiel', 'Operation Sonnenschirm'];
const suggestName = (id: string) => operationNames[[...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % operationNames.length];

/**
 * Route `challenge/[id]` (Push). Figma: `challenge/detail` (Status open),
 * `challenge/detail--accepted` und `--accepted--named` (nur für die Person, die angenommen hat).
 */
/** Status, in denen die Challenge noch läuft */
const RUNNING = new Set<ChallengeStatus>(['open', 'accepted', 'reported', 'rejected']);

export default function ChallengeDetail() {
  // `kommentare`: aus Feed oder „Deine Challenges“ direkt zu den Kommentaren
  const { id, kommentare } = useLocalSearchParams<{ id: string; kommentare?: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { currentUserId, users, dispatch, mode, profile } = useStore();

  const { challenge, author } = useChallenge(id);
  // Schreiben nur mit Kiez (grobe Verortung); Beispieldaten und Gruppenaufgaben immer
  const canWrite = mode === 'demo' || !!profile.kiez || !!challenge?.groupId;
  // Gruppenaufgaben brauchen keinen Kiez
  const needKiez = () => !!challenge?.groupId || requireKiezRaw();
  const requireKiezRaw = useRequireKiez();
  const [menuOpen, setMenuOpen] = useState(false);
  // Eigener Standort für die 5-km-Regel (Daria, 29.10.2026). Ohne Freigabe: null, dann nur Anfrage.
  const [here, setHere] = useState<Coords | null>(null);
  useEffect(() => {
    let active = true;
    coordsIfAllowed().then((c) => active && setHere(c));
    return () => {
      active = false;
    };
  }, []);
  // Tipp irgendwo außerhalb schließt das Zahnrad-Menü (Daria, 22.10.2026). Der Tipp selbst geht normal weiter.
  const menuClosedAt = useRef(0);
  const menuRef = useRef<View>(null);
  const menuRect = useRef<{ x: number; y: number; w: number; h: number } | undefined>(undefined);
  const closeMenuOnTouch = (e: GestureResponderEvent) => {
    const r = menuRect.current;
    const { pageX: px, pageY: py } = e.nativeEvent;
    const inside = r && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
    if (menuOpen && !inside) {
      menuClosedAt.current = Date.now();
      setMenuOpen(false);
    }
    return false;
  };
  const [operationName, setOperationName] = useState(() => (id ? suggestName(id) : ''));
  const authorId = challenge?.authorId;

  // Aufruf zählen: einmal pro Person, nicht bei eigenen Challenges
  useEffect(() => {
    if (mode !== 'live' || !id || !authorId || authorId === currentUserId) return;
    recordView(id).catch(() => undefined);
  }, [mode, id, authorId, currentUserId]);

  if (!challenge || !author) {
    return (
      <SubScreen title="Challenge" navigation="back" onLeadingPress={goBack}>
        <Text style={styles.secondary}>Diese Challenge gibt es nicht mehr.</Text>
      </SubScreen>
    );
  }

  const isAuthor = challenge.authorId === currentUserId;
  const isAssignee = challenge.assigneeId === currentUserId;
  // Mehrere Personen (Daria, 27.10.2026): Alle Teilnehmenden sehen „angenommen“-Inhalte, die erste Person meldet erledigt
  const multi = isMultiPerson(challenge);
  // Weiter als 5 km oder ohne Standort: nur auf Anfrage (wie Migration 20261029000100). Gruppenaufgaben und
  // Challenges ohne Punkt wie bisher.
  const far = !challenge.groupId && !!challenge.coords && (!here || distanceMeters(here, challenge.coords) > KIEZ_RADIUS_METERS);
  const approval = challenge.joinMode === 'approval' || far;
  const mine = myParticipation(challenge, currentUserId);
  const acceptedByMe = challenge.status === 'accepted' && isParticipant(challenge, currentUserId);
  // Erledigt melden: jede teilnehmende Person, für alle (Daria, 28.10.2026)
  const reportsForAll = acceptedByMe;
  const named = challenge.operationName !== undefined;
  const isBeforeAfter = challenge.type === 'before_after';
  // Vorher-Nachher: erst das Vorher-, dann das Nachher-Foto in der Galerie
  const image = isBeforeAfter ? (challenge.imageBefore ?? challenge.image) : (challenge.image ?? challenge.imageAfter);
  // Erledigte We-Challenge: das Erledigungsfoto als Nachher direkt nach dem Aufgabenfoto (Daria, 27.10.2026)
  const weAfter = weChallengeAfter(challenge);
  const extras = challenge.extraImages?.map((e) => e.photo);
  const moreImages = isBeforeAfter
    ? challenge.imageAfter && challenge.imageBefore
      ? [challenge.imageAfter]
      : undefined
    : weAfter
      ? [weAfter, ...(extras ?? [])]
      : extras;
  const baDuration = isBeforeAfter ? beforeAfterDuration(challenge) : undefined;

  const giveBack = () =>
    multi
      ? Alert.alert(t('Aussteigen?'), t('Dein Platz wird frei. Ohne Teilnehmende ist die Challenge wieder für alle offen.'), [
          { text: t('Abbrechen'), style: 'cancel' },
          { text: t('Aussteigen'), style: 'destructive', onPress: () => dispatch({ type: 'leave', id: challenge.id }) },
        ])
      : Alert.alert('Challenge abgeben?', 'Die Challenge wird dann wieder für alle offen sein.', [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Abgeben', style: 'destructive', onPress: () => dispatch({ type: 'giveBack', id: challenge.id }) },
        ]);
  const withdraw = () =>
    Alert.alert(t('Anfrage zurückziehen?'), undefined, [
      { text: t('Abbrechen'), style: 'cancel' },
      { text: t('Zurückziehen'), style: 'destructive', onPress: () => dispatch({ type: 'leave', id: challenge.id }) },
    ]);

  // Coins (Migration 20261028000400): jede Person bestätigt den Empfang ihres Anteils selbst
  const myLine = payoutOf(challenge, currentUserId);
  const canConfirmReceived = myLine
    ? !!myLine.paidMarkedAt && !myLine.paidAt && (challenge.status === 'payment_open' || challenge.status === 'paid_marked')
    : isAssignee && challenge.status === 'paid_marked';
  const sharedBounty = isSharedBounty(challenge);
  const takingPart = isParticipant(challenge, currentUserId) || !!myLine;
  // Weitere Teilnehmende geben ihre Zahlungsdaten hier frei; die erste Person beim Erledigt-Melden
  const needsShare =
    !!challenge.bountyAmount &&
    !isAuthor &&
    takingPart &&
    !challenge.payoutShare &&
    !myLine?.paidMarkedAt &&
    (challenge.status === 'reported' || challenge.status === 'payment_open' || (challenge.status === 'accepted' && !isAssignee));

  let actions: React.ReactNode = null;
  // Nur ein Bild oder Vorher-Nachher: nichts anzunehmen
  const isPhoto = isPostOnly(challenge.type);
  const joinOpen = !isAuthor && !isPhoto && participantsOpen(challenge);
  if (joinOpen && mine?.status === 'requested') {
    actions = <Button label="Anfrage zurückziehen" variant="secondary" onPress={withdraw} />;
  } else if (joinOpen && !mine && freeSpots(challenge) > 0 && (challenge.status === 'open' || multi)) {
    const join = () => needKiez() && dispatch({ type: 'join', id: challenge.id, coords: here ?? undefined, far });
    actions = approval ? (
      <Button icon="wir-schaffen-das" label="Anfrage senden" onPress={join} />
    ) : multi ? (
      <Button icon="wir-schaffen-das" label="Mitmachen" onPress={join} />
    ) : (
      <Button icon="wir-schaffen-das" label={challenge.groupId ? 'Aufgabe annehmen' : 'Challenge annehmen'} onPress={join} />
    );
  } else if (reportsForAll) {
    actions = (
      <>
        <Button label="Erledigt melden" onPress={() => router.push(`/challenge/${challenge.id}/report`)} />
        <Button label={multi ? 'Aussteigen' : 'Challenge abgeben'} variant="secondary" onPress={giveBack} />
      </>
    );
  } else if (acceptedByMe) {
    actions = <Button label="Aussteigen" variant="secondary" onPress={giveBack} />;
  } else if (isAuthor && challenge.status === 'reported') {
    actions = <Button label="Erledigung prüfen" onPress={() => router.push(`/challenge/${challenge.id}/review`)} />;
  } else if (isAuthor && challenge.status === 'payment_open') {
    actions = <Button label="Coins bezahlen" onPress={() => router.push(`/challenge/${challenge.id}/pay`)} />;
  } else if (canConfirmReceived) {
    actions = <Button label="Coins bestätigen" onPress={() => router.push(`/challenge/${challenge.id}/payment`)} />;
  }

  const openProfile = (userId: string) =>
    router.push({ pathname: '/user/[id]', params: { id: userId, challengeId: challenge.id } });

  const amount = challenge.bountyAmount ? formatEuro(challenge.bountyAmount) : '';
  // Eigene Challenge, die noch niemand angenommen hat: bearbeiten oder schließen
  // Vorher-Nachher lässt sich nach dem Posten nur löschen
  const canManage = isAuthor && challenge.status === 'open' && !challenge.assigneeId && !isBeforeAfter;
  // Löschen bis jemand annimmt, auch geschlossene (Migration 20261021000300)
  const canDelete = isAuthor && (challenge.status === 'open' || challenge.status === 'closed') && !challenge.assigneeId;
  const description = challenge.type === 'wave' ? challenge.challengeText?.trim() : postText(challenge);

  const closeChallenge = () =>
    Alert.alert(
      'Challenge schließen?',
      challenge.groupId
        ? 'Bestätigen? Deine Gruppenmitglieder können diese Challenge nicht mehr annehmen. (Sie bleibt aber im Feed sichtbar.)'
        : 'Bestätigen? Deine Nachbar:innen können diese Challenge nicht mehr annehmen. (Sie bleibt aber im Feed sichtbar.)',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Schließen',
          style: 'destructive',
          onPress: () => dispatch({ type: 'close', id: challenge.id }),
        },
      ],
    );

  // Löschen: nur solange niemand angenommen hat. Sonst Hinweis mit Weg zum Kundenservice (wie in „Deine Challenges“).
  const deleteChallenge = () => {
    if (!canDelete) {
      Alert.alert(
        'Löschen geht nicht mehr',
        challenge.assigneeId
          ? 'Jemand hat die Challenge schon angenommen. Damit niemand umsonst loszieht, lässt sie sich nicht mehr löschen. Der Kundenservice hilft Dir weiter.'
          : 'Erledigte Challenges bleiben in der Timeline sichtbar. Der Kundenservice hilft Dir weiter.',
        [
          { text: 'OK', style: 'cancel' },
          {
            text: 'Kundenservice',
            onPress: () =>
              router.push({
                pathname: '/account/support',
                params: { text: `Ich möchte meine Challenge „${challenge.title}“ löschen. Grund: ` },
              }),
          },
        ],
      );
      return;
    }
    Alert.alert('Challenge löschen?', 'Die Challenge verschwindet aus dem Feed.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          goBack();
          dispatch({ type: 'delete', id: challenge.id });
        },
      },
    ]);
  };

  // Zeitangaben nur, solange die Challenge läuft
  const running = RUNNING.has(challenge.status);
  const showDeadline = running && !isPhoto;
  const summary = (
    <>
      <View style={styles.statusWrap}>
        <View style={styles.statusRow}>
          <StatusBadge status={challenge.status} challenge={challenge} photo={isPhoto && !isBeforeAfter} beforeAfter={isBeforeAfter} />
          <Text style={[styles.caption, styles.flex]}>{running ? formatRelative(challenge.createdAt) : ''}</Text>
          {isAuthor ? (
            <GlassIconButton
              icon="settings"
              variant="regular"
              accessibilityLabel={t('Challenge verwalten')}
              // Gerade durch den Tipp geschlossen: nicht gleich wieder öffnen
              onPress={() => Date.now() - menuClosedAt.current > 400 && setMenuOpen((open) => !open)}
              style={[styles.gear, menuOpen && styles.gearOpen]}
            />
          ) : challenge.status !== 'draft' && challenge.status !== 'deleted' ? (
            // Melden versteckt hinter drei Punkten (Daria, 22.10.2026)
            <IconButton
              icon="more"
              iconSize={size.icon}
              iconColor={color.text.secondary}
              accessibilityLabel={t('Weitere Aktionen')}
              onPress={() => Date.now() - menuClosedAt.current > 400 && setMenuOpen((open) => !open)}
            />
          ) : null}
        </View>
        {!isAuthor && menuOpen ? (
          <View
            ref={menuRef}
            style={styles.menu}
            accessibilityRole="menu"
            onLayout={() => menuRef.current?.measureInWindow((x, y, w, h) => (menuRect.current = { x, y, w, h }))}
          >
            <MenuItem
              label="Melden"
              tone="error"
              last
              onPress={() => {
                setMenuOpen(false);
                router.push(`/challenge/${challenge.id}/flag`);
              }}
            />
          </View>
        ) : null}
        {isAuthor && menuOpen ? (
          <View
            ref={menuRef}
            style={styles.menu}
            accessibilityRole="menu"
            onLayout={() => menuRef.current?.measureInWindow((x, y, w, h) => (menuRect.current = { x, y, w, h }))}
          >
            {canManage ? (
              <>
                <MenuItem
                  label="Bearbeiten"
                  onPress={() => {
                    setMenuOpen(false);
                    router.push(`/challenge/${challenge.id}/edit`);
                  }}
                />
                <MenuItem
                  label="Schließen"
                  tone="signal"
                  onPress={() => {
                    setMenuOpen(false);
                    closeChallenge();
                  }}
                />
              </>
            ) : null}
            {/* Umkreis-Begrenzung nachträglich ändern (Daria, 29.10.2026) */}
            {!challenge.groupId && !challenge.private && challenge.status !== 'deleted' ? (
              <MenuItem
                label={challenge.localOnly ? 'Auch in „Überall“ zeigen' : 'Auf 5 km begrenzen'}
                onPress={() => {
                  setMenuOpen(false);
                  dispatch({ type: 'setLocalOnly', id: challenge.id, localOnly: !challenge.localOnly });
                }}
              />
            ) : null}
            <MenuItem
              label="Löschen"
              tone={canDelete ? 'error' : 'muted'}
              onPress={() => {
                setMenuOpen(false);
                deleteChallenge();
              }}
            />
            <MenuItem
              label="Alle verwalten"
              last
              onPress={() => {
                setMenuOpen(false);
                router.push('/manage');
              }}
            />
          </View>
        ) : null}
      </View>
      <Text style={styles.headline} accessibilityRole="header">
        {challenge.title}
      </Text>
      {challenge.edensteine || challenge.bountyAmount || showDeadline ? (
      <View style={styles.metrics}>
        {challenge.edensteine ? (
          <View style={styles.metric}>
            {/* Ein einzelner, großer Kristall (Daria, 22.10.2026) */}
            <LivingCrystal height={52} seed={challenge.id} />
            <Text style={[styles.metricValue, styles.eden]}>{challenge.edensteine}</Text>
          </View>
        ) : null}
        {challenge.bountyAmount ? (
          <View style={styles.metric}>
            <CoinsIcon height={28} />
            <Text style={styles.metricLabel}>Coins</Text>
            <Text style={[styles.metricValue, styles.signal]}>{formatBountyShort(challenge.bountyAmount)}</Text>
          </View>
        ) : null}
        {showDeadline ? (
          <View style={styles.deadline}>
            <DeadlineBadge deadline={challenge.deadline} />
          </View>
        ) : null}
      </View>
      ) : null}
      {sharedBounty ? (
        <Text style={styles.caption}>
          {takingPart
            ? t('Die Coins werden geteilt. Dein Anteil: {share}.', { share: formatCents(shareCentsOf(challenge, currentUserId)) })
            : sharedBountyText(challenge.bountyAmount, maxParticipants(challenge))}
        </Text>
      ) : null}
    </>
  );

  const details = (
    <>
      {acceptedByMe ? (
        <>
          <KaterBubble>
            {!isAssignee && named
              ? t('Danke, dass Du mitmachst! Jede teilnehmende Person kann erledigt melden, für alle. Wenn {author} bestätigt, bekommst Du eine Nachricht.', {
                  author: author.firstName,
                })
              : named
              ? t('Danke, dass Du anpackst! Fotografiere am Ende das Ergebnis, und wir warten. Wenn {name} bestätigt, aktualisiert sich der Status automatisch. Du bekommst eine Nachricht.', {
                  name: author.firstName,
                })
              : 'Danke, dass Du anpackst! Taufen wir das Baby, Baby? Ich hätte da eine Idee für einen Namen für Deine Operation.'}
          </KaterBubble>
          <InfoRow icon="map-pin" value={challenge.location} />
          {(isAssignee ? challenge.acceptedAt : mine?.joinedAt) ? (
            <InfoRow
              icon="check"
              value={t('Von Dir angenommen am {acceptedAt}', {
                acceptedAt: formatDayMonthShort((isAssignee ? challenge.acceptedAt : mine?.joinedAt) ?? ''),
              })}
            />
          ) : null}
          {challenge.rejectionReason ? (
            <Notice
              variant="warning"
              message={tAbout(author, '{firstName} hat nicht als erledigt bestätigt: „{rejectionReason}“', { firstName: author.firstName, rejectionReason: challenge.rejectionReason })}
            />
          ) : null}
          {!named ? (
            <View style={styles.naming}>
              <TextField
                label="Operationsname (nur für Dich)"
                helperText="Vorschlag von Cat The Käptn. Du kannst den Vorschlag übernehmen, ändern oder das Feld leer lassen."
                value={operationName}
                onChangeText={setOperationName}
                maxLength={40}
              />
              <Button
                label="Namen geben"
                variant="secondary"
                onPress={() => dispatch({ type: 'nameOperation', id: challenge.id, name: operationName })}
              />
            </View>
          ) : null}
        </>
      ) : null}
      {baDuration !== undefined ? (
        <InfoRow icon="clock" value={t('In {duration} geschafft', { duration: formatHoursMinutes(baDuration) })} />
      ) : null}
      {!isAuthor && mine?.status === 'requested' ? (
        <Notice message={tAbout(author, 'Deine Anfrage ist bei {firstName}. Du bekommst Bescheid, sobald {firstName} antwortet.', { firstName: author.firstName })} />
      ) : null}
      {!isAuthor && mine?.status === 'unconfirmed' ? (
        <Notice variant="warning" message={tAbout(author, '{firstName} hat Dich beim Bestätigen nicht ausgewählt. Die Belohnung geht an die anderen.', { firstName: author.firstName })} />
      ) : null}
      {!isAuthor && (mine?.status === 'removed' || mine?.status === 'declined') ? (
        <Notice variant="warning" message={mine.status === 'removed' ? t('Du bist bei dieser Challenge nicht mehr dabei.') : t('Deine Anfrage wurde abgelehnt.')} />
      ) : null}
      {joinOpen && !mine && far && challenge.joinMode !== 'approval' && freeSpots(challenge) > 0 ? (
        <Notice
          message={
            here
              ? tAbout(author, 'Du bist mehr als 5 km entfernt. Du kannst anfragen, {firstName} entscheidet.', { firstName: author.firstName })
              : tAbout(author, 'Ohne Deinen Standort weiß die App nicht, ob Du in der Nähe bist. Du kannst anfragen, {firstName} entscheidet.', { firstName: author.firstName })
          }
        />
      ) : null}
      {!isAuthor && !mine && multi && participantsOpen(challenge) && freeSpots(challenge) === 0 ? (
        <Notice message={t('Alle Plätze sind vergeben.')} />
      ) : null}
      {description ? (
        <Text style={styles.description}>
          {isBeforeAfter || challenge.type === 'photo' || challenge.type === 'individual' ? <WithMentions value={description} /> : description}
        </Text>
      ) : null}
      {challenge.type === 'individual' && (multi || challenge.joinMode === 'approval' || joinRequests(challenge).length > 0 || (challenge.participants ?? []).length > 1) ? (
        <ParticipantsSection
          challenge={challenge}
          users={users}
          currentUserId={currentUserId}
          isAuthor={isAuthor}
          onOpenProfile={openProfile}
          onAnswer={(userId, accept) => dispatch({ type: 'answerRequest', id: challenge.id, userId, accept })}
          onRemove={(userId) => dispatch({ type: 'removeParticipant', id: challenge.id, userId })}
        />
      ) : null}
      <View style={styles.authorBlock}>
        <AuthorRow
          user={author}
          location={acceptedByMe ? (challenge.kiez ?? challenge.location) : challenge.location}
          onPress={() => openProfile(author.id)}
        />
      </View>
      {needsShare ? (
        <View style={styles.naming}>
          <Notice
            message={tAbout(author, 'Damit {firstName} Dir Deinen Anteil zahlen kann, gib Deine IBAN oder PayPal frei. {firstName} sieht sie erst nach der Bestätigung.', { firstName: author.firstName })}
          />
          <Button label="Zahlungsdaten freigeben" variant="secondary" onPress={() => router.push(`/challenge/${challenge.id}/report/payout?nur=1`)} />
        </View>
      ) : null}
      {challenge.bountyAmount && !isAuthor && sharedBounty ? (
        <Notice
          message={tAbout(author, 'Die {amount} werden unter allen geteilt, die mitmachen. {firstName} zahlt jeder Person ihren Anteil direkt, zum Beispiel per Überweisung oder PayPal. Kiez Coins bewegt kein Geld, alles beruht auf Vertrauen.', { firstName: author.firstName, amount })}
        />
      ) : challenge.bountyAmount && !isAuthor ? (
        <Notice
          message={
            acceptedByMe
              ? tAbout(author, '{firstName} zahlt die {amount} direkt an Dich. Beim Erledigt-Melden gibst Du {firstName} dafür Deine IBAN oder PayPal frei. Kiez Coins bewegt kein Geld, alles beruht auf Vertrauen.', { firstName: author.firstName, amount })
              : tAbout(author, '{firstName} zahlt die Coins direkt an Dich, zum Beispiel per Überweisung oder PayPal. Kiez Coins bewegt kein Geld, alles beruht auf Vertrauen.', { firstName: author.firstName })
          }
        />
      ) : null}
      {challenge.status !== 'draft' ? (
        <CommentSection
          comments={challenge.comments}
          users={users}
          currentUserId={currentUserId}
          composerPlaceholder={isAuthor ? 'Antworten oder ergänzen …' : t('Frage {firstName} …', { firstName: author.firstName })}
          onSend={
            challenge.status === 'closed' || challenge.status === 'deleted' || !canWrite
              ? undefined
              : (body, replyToId) => needKiez() && dispatch({ type: 'addComment', id: challenge.id, body, replyToId })
          }
          audience={challenge.groupId ? 'Nur Eure Gruppe kann hier mitlesen.' : undefined}
          closedHint={
            challenge.status === 'closed'
              ? 'Die Challenge ist geschlossen. Neue Kommentare sind nicht mehr möglich.'
              : challenge.status === 'deleted'
                ? 'Die Challenge ist gelöscht und nur für Dich sichtbar. Neue Kommentare sind nicht möglich.'
                : 'Lege in Deinem Konto Deinen Kiez fest, dann kannst Du mitschreiben.'
          }
          onAuthorPress={openProfile}
          onReport={(comment) =>
            router.push({ pathname: '/user/[id]/report', params: { id: comment.authorId, challengeId: challenge.id } })
          }
        />
      ) : null}
    </>
  );

  if (!image) {
    return (
      <SubScreen
        title={challenge.groupId ? 'Gruppenaufgabe' : 'Challenge'}
        navigation="back"
        onLeadingPress={goBack}
        actions={actions}
      >
        {summary}
        {details}
      </SubScreen>
    );
  }

  return (
    <View style={styles.flex} onStartShouldSetResponderCapture={closeMenuOnTouch}>
    <HeroScreen
      scrollToEndOnOpen={!!kommentare}
      slideIn
      image={image}
      moreImages={moreImages}
      imageLabel={challenge.title}
      onBackPress={() => goBack()}
      onSharePress={() => shareText(t('{title} – Kiez Coins', { title: challenge.title }))}
      imageOverlay={acceptedByMe && challenge.operationName ? <OperationTag name={challenge.operationName} /> : undefined}
      actions={actions}
      summary={summary}
    >
      {details}
    </HeroScreen>
    </View>
  );
}

/** Eintrag im Zahnrad-Menü der eigenen Challenge */
function MenuItem({
  label,
  onPress,
  tone,
  last,
}: {
  label: string;
  onPress: () => void;
  /** muted: ausgegraut, aber tippbar (die Meldung erklärt, warum es nicht geht) */
  tone?: 'signal' | 'error' | 'muted';
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="menuitem"
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, !last && styles.menuDivider, pressed && styles.pressed]}
    >
      <Text
        style={[
          styles.menuText,
          tone === 'signal' && styles.signal,
          tone === 'error' && styles.error,
          tone === 'muted' && styles.muted,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  statusWrap: { zIndex: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  flex: { flex: 1 },
  gear: { marginRight: -space[4] },
  gearOpen: { opacity: 0.7 },
  menu: {
    position: 'absolute',
    top: size.touchTarget + space[6],
    right: 0,
    minWidth: 200,
    borderRadius: radius.lg,
    backgroundColor: color.bg.surface,
    borderWidth: stroke.ultraThin,
    borderColor: color.line.hairline,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  menuItem: { minHeight: size.touchTarget, justifyContent: 'center', paddingHorizontal: space[16] },
  menuDivider: { borderBottomWidth: stroke.ultraThin, borderBottomColor: color.line.hairline },
  menuText: { fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: color.text.primary },
  caption: { ...text.caption, fontSize: 13, color: color.text.secondary },
  headline: { ...text.headline, color: color.text.primary },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  // Icon, Bezeichnung und Wert in einer Zeile
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    minHeight: size.touchTarget,
    paddingHorizontal: space[12],
    borderRadius: radius.lg,
    backgroundColor: color.bg.surface,
  },
  metricLabel: { ...text.caption, fontSize: 13, color: color.text.secondary },
  deadline: { justifyContent: 'center', minHeight: size.touchTarget },
  metricValue: { ...text.metric, fontSize: 17, lineHeight: 22, color: color.text.primary },
  pressed: { opacity: 0.7 },
  signal: { color: color.accent.signal },
  eden: { color: color.accent.confirmation },
  error: { color: color.accent.error },
  muted: { color: color.text.secondary, opacity: 0.6 },
  description: { fontFamily: font.light, fontSize: 15, lineHeight: 22, color: color.text.secondary },
  authorBlock: { borderTopWidth: stroke.ultraThin, borderTopColor: color.line.hairline },
  secondary: { ...text.body, color: color.text.secondary },
  naming: { gap: space[12] },
});
