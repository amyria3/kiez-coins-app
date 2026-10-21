import { useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/T';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthorRow } from '../../../components/AuthorRow';
import { StatusBadge } from '../../../components/Badges';
import { CoinsIcon, EdensteinPile } from '../../../components/icons/Brand';
import { Icon } from '../../../components/icons/Icon';
import { GlassIconButton } from '../../../components/Glass';
import { IconButton } from '../../../components/IconButton';
import { Button } from '../../../components/Button';
import { CommentSection } from '../../../components/Comments';
import { InfoRow, KaterBubble, Notice, OperationTag } from '../../../components/Content';
import { TextField } from '../../../components/Form';
import { HeroScreen, SubScreen } from '../../../components/Screen';
import { formatBountyShort, formatDayMonthShort, formatEuro, formatRelative, formatRemainingShort } from '../../../data/format';
import { useRequireKiez } from '../../../data/kiez';
import { recordView } from '../../../data/remote';
import { useChallenge, useStore } from '../../../data/store';
import type { ChallengeStatus } from '../../../data/types';
import { color, font, radius, size, space, stroke, text } from '../../../theme/tokens';
import { t } from '../../../data/texts';

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUserId, users, dispatch, mode, profile } = useStore();

  const { challenge, author } = useChallenge(id);
  // Schreiben nur mit Kiez (grobe Verortung); Beispieldaten und Gruppenaufgaben immer
  const canWrite = mode === 'demo' || !!profile.kiez || !!challenge?.groupId;
  // Gruppenaufgaben brauchen keinen Kiez
  const needKiez = () => !!challenge?.groupId || requireKiezRaw();
  const requireKiezRaw = useRequireKiez();
  const [menuOpen, setMenuOpen] = useState(false);
  const [operationName, setOperationName] = useState(() => (id ? suggestName(id) : ''));
  const authorId = challenge?.authorId;

  // Aufruf zählen: einmal pro Person, nicht bei eigenen Challenges
  useEffect(() => {
    if (mode !== 'live' || !id || !authorId || authorId === currentUserId) return;
    recordView(id).catch(() => undefined);
  }, [mode, id, authorId, currentUserId]);

  if (!challenge || !author) {
    return (
      <SubScreen title="Challenge" navigation="back" onLeadingPress={() => router.back()}>
        <Text style={styles.secondary}>Diese Challenge gibt es nicht mehr.</Text>
      </SubScreen>
    );
  }

  const isAuthor = challenge.authorId === currentUserId;
  const isAssignee = challenge.assigneeId === currentUserId;
  const acceptedByMe = challenge.status === 'accepted' && isAssignee;
  const named = challenge.operationName !== undefined;
  const image = challenge.image ?? challenge.imageAfter;

  const giveBack = () =>
    Alert.alert('Challenge abgeben?', 'Die Challenge ist dann wieder für alle offen.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abgeben', style: 'destructive', onPress: () => dispatch({ type: 'giveBack', id: challenge.id }) },
    ]);

  let actions: React.ReactNode = null;
  if (challenge.status === 'open' && !isAuthor) {
    actions = <Button label={challenge.groupId ? 'Aufgabe annehmen' : 'Challenge annehmen'} onPress={() => needKiez() && dispatch({ type: 'accept', id: challenge.id })} />;
  } else if (acceptedByMe) {
    actions = (
      <>
        <Button label="Erledigt melden" onPress={() => router.push(`/challenge/${challenge.id}/report`)} />
        <Button label="Challenge abgeben" variant="secondary" onPress={giveBack} />
      </>
    );
  } else if (isAuthor && challenge.status === 'reported') {
    actions = <Button label="Erledigung prüfen" onPress={() => router.push(`/challenge/${challenge.id}/review`)} />;
  } else if (isAuthor && challenge.status === 'payment_open') {
    actions = <Button label="Bounty bezahlen" onPress={() => router.push(`/challenge/${challenge.id}/pay`)} />;
  } else if (isAssignee && challenge.status === 'paid_marked') {
    actions = <Button label="Bounty bestätigen" onPress={() => router.push(`/challenge/${challenge.id}/payment`)} />;
  }

  const openProfile = (userId: string) =>
    router.push({ pathname: '/user/[id]', params: { id: userId, challengeId: challenge.id } });

  const amount = challenge.bountyAmount ? formatEuro(challenge.bountyAmount) : '';
  // Eigene Challenge, die noch niemand angenommen hat: bearbeiten oder schließen
  const canManage = isAuthor && challenge.status === 'open' && !challenge.assigneeId;
  // Löschen bis jemand annimmt, auch geschlossene (Migration 20261021000300)
  const canDelete = isAuthor && (challenge.status === 'open' || challenge.status === 'closed') && !challenge.assigneeId;
  const description = (challenge.type === 'wave' ? challenge.challengeText : challenge.text)?.trim();

  const closeChallenge = () =>
    Alert.alert(
      'Challenge schließen?',
      'Hat sich das erledigt? Die Challenge bleibt im Feed sichtbar, lässt sich aber nicht mehr annehmen oder kommentieren. Das lässt sich nicht rückgängig machen.',
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
    Alert.alert('Challenge löschen?', 'Sie verschwindet aus dem Feed. In „Deine Challenges“ kannst Du sie wieder veröffentlichen.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          router.back();
          dispatch({ type: 'delete', id: challenge.id });
        },
      },
    ]);
  };

  // Zeitangaben nur, solange die Challenge läuft
  const running = RUNNING.has(challenge.status);
  const showDeadline = running;
  const summary = (
    <>
      <View style={styles.statusWrap}>
        <View style={styles.statusRow}>
          <StatusBadge status={challenge.status} />
          <Text style={[styles.caption, styles.flex]}>{running ? formatRelative(challenge.createdAt) : ''}</Text>
          {isAuthor ? (
            <GlassIconButton
              icon="settings"
              variant="regular"
              accessibilityLabel={t('Challenge verwalten')}
              onPress={() => setMenuOpen((open) => !open)}
              style={[styles.gear, menuOpen && styles.gearOpen]}
            />
          ) : challenge.status !== 'draft' && challenge.status !== 'deleted' ? (
            <IconButton
              icon="flag"
              iconSize={size.icon}
              iconColor={color.text.secondary}
              accessibilityLabel={t('Challenge melden')}
              onPress={() => router.push(`/challenge/${challenge.id}/flag`)}
            />
          ) : null}
        </View>
        {isAuthor && menuOpen ? (
          <View style={styles.menu} accessibilityRole="menu">
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
            <EdensteinPile height={26} amount={challenge.edensteine} />
            <Text style={styles.metricLabel}>Edensteine</Text>
            <Text style={[styles.metricValue, styles.eden]}>{challenge.edensteine}</Text>
          </View>
        ) : null}
        {challenge.bountyAmount ? (
          <View style={styles.metric}>
            <CoinsIcon height={28} />
            <Text style={styles.metricLabel}>Bounty</Text>
            <Text style={[styles.metricValue, styles.signal]}>{formatBountyShort(challenge.bountyAmount)}</Text>
          </View>
        ) : null}
        {showDeadline ? (
          <View style={styles.metric}>
            <Icon name="clock" size={size.icon} color={color.text.secondary} />
            <Text style={styles.metricLabel}>Noch</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {formatRemainingShort(challenge.deadline).replace('Noch ', '')}
            </Text>
          </View>
        ) : null}
      </View>
      ) : null}
    </>
  );

  const details = (
    <>
      {acceptedByMe ? (
        <>
          <KaterBubble>
            {named
              ? t('Danke, dass Du anpackst! Mach am Ende ein Foto vom Ergebnis, dann kann {name} bestätigen.', {
                  name: author.firstName,
                })
              : 'Danke, dass Du anpackst! Taufen wir das Baby, Baby? Ich hätte da einen Namen für Deine Operation.'}
          </KaterBubble>
          <InfoRow icon="map-pin" value={challenge.location} />
          {challenge.acceptedAt ? (
            <InfoRow icon="check" value={t('Von Dir angenommen am {acceptedAt}', { acceptedAt: formatDayMonthShort(challenge.acceptedAt) })} />
          ) : null}
          {challenge.rejectionReason ? (
            <Notice
              variant="warning"
              message={t('{firstName} hat die Erledigung abgelehnt: „{rejectionReason}“', { firstName: author.firstName, rejectionReason: challenge.rejectionReason })}
            />
          ) : null}
          {!named ? (
            <View style={styles.naming}>
              <TextField
                label="Operationsname (nur für Dich)"
                helperText="Vorschlag vom Kater. Ändern, übernehmen oder leer lassen, die Taufe ist freiwillig."
                value={operationName}
                onChangeText={setOperationName}
                maxLength={40}
              />
              <Button
                label="Taufen"
                variant="secondary"
                onPress={() => dispatch({ type: 'nameOperation', id: challenge.id, name: operationName })}
              />
            </View>
          ) : null}
        </>
      ) : null}
      {description ? <Text style={styles.description}>{description}</Text> : null}
      <View style={styles.authorBlock}>
        <AuthorRow
          user={author}
          location={acceptedByMe ? (challenge.kiez ?? challenge.location) : challenge.location}
          onPress={() => openProfile(author.id)}
        />
      </View>
      {challenge.bountyAmount && !isAuthor ? (
        <Notice
          message={
            acceptedByMe
              ? t('{firstName} zahlt die {amount} direkt an Dich. Beim Erledigt-Melden gibst Du {firstName} dafür Deine IBAN oder PayPal frei. Kiez Coins bewegt kein Geld, alles beruht auf Vertrauen.', { firstName: author.firstName, amount })
              : t('{firstName} zahlt die Bounty direkt an Dich, zum Beispiel per Überweisung oder PayPal. Kiez Coins bewegt kein Geld, alles beruht auf Vertrauen.', { firstName: author.firstName })
          }
        />
      ) : null}
      {challenge.status !== 'draft' ? (
        <CommentSection
          comments={challenge.comments}
          users={users}
          currentUserId={currentUserId}
          composerPlaceholder={isAuthor ? 'Antworte oder ergänze etwas …' : t('Frag {firstName} …', { firstName: author.firstName })}
          onSend={
            challenge.status === 'closed' || challenge.status === 'deleted' || !canWrite
              ? undefined
              : (body, replyToId) => needKiez() && dispatch({ type: 'addComment', id: challenge.id, body, replyToId })
          }
          audience={challenge.groupId ? 'Nur Eure Gruppe kann mitlesen.' : undefined}
          closedHint={
            challenge.status === 'closed'
              ? 'Die Challenge ist geschlossen. Neue Kommentare sind nicht mehr möglich.'
              : challenge.status === 'deleted'
                ? 'Die Challenge ist gelöscht und nur für Dich sichtbar. Neue Kommentare sind nicht möglich.'
                : 'Leg in Deinem Konto Deinen Kiez fest, dann kannst Du mitschreiben.'
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
        onLeadingPress={() => router.back()}
        actions={actions}
      >
        {summary}
        {details}
      </SubScreen>
    );
  }

  return (
    <HeroScreen
      image={image}
      moreImages={challenge.extraImages?.map((e) => e.photo)}
      imageLabel={challenge.title}
      onBackPress={() => router.back()}
      onSharePress={() => Share.share({ message: t('{title} – Kiez Coins', { title: challenge.title }) })}
      imageOverlay={acceptedByMe && challenge.operationName ? <OperationTag name={challenge.operationName} /> : undefined}
      actions={actions}
      summary={summary}
    >
      {details}
    </HeroScreen>
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
