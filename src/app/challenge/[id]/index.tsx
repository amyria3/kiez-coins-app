import { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthorRow } from '../../../components/AuthorRow';
import { StatusBadge } from '../../../components/Badges';
import { CoinsIcon } from '../../../components/icons/Brand';
import { Icon } from '../../../components/icons/Icon';
import { IconButton } from '../../../components/IconButton';
import { Button } from '../../../components/Button';
import { CommentSection } from '../../../components/Comments';
import { InfoRow, KaterBubble, Notice, OperationTag } from '../../../components/Content';
import { TextField } from '../../../components/Form';
import { HeroScreen, SubScreen } from '../../../components/Screen';
import { formatBountyShort, formatDayMonthShort, formatEuro, formatRelative, formatRemainingShort } from '../../../data/format';
import { useRequireKiez } from '../../../data/kiez';
import { useChallenge, useStore } from '../../../data/store';
import { color, font, radius, size, space, stroke, text } from '../../../theme/tokens';

// Vorschläge des Katers für den Operationsnamen (später aus einer Wortliste)
const operationNames = ['Operation Gießkanne', 'Operation Igelglück', 'Operation Besenstiel', 'Operation Sonnenschirm'];
const suggestName = (id: string) => operationNames[[...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % operationNames.length];

/**
 * Route `challenge/[id]` (Push). Figma: `challenge/detail` (Status open),
 * `challenge/detail--accepted` und `--accepted--named` (nur für die Person, die angenommen hat).
 */
export default function ChallengeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUserId, users, dispatch } = useStore();
  const { challenge, author } = useChallenge(id);
  const requireKiez = useRequireKiez();
  const [menuOpen, setMenuOpen] = useState(false);
  const [operationName, setOperationName] = useState(() => (id ? suggestName(id) : ''));

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
    actions = <Button label="Challenge annehmen" onPress={() => requireKiez() && dispatch({ type: 'accept', id: challenge.id })} />;
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

  const amount = challenge.bountyAmount ? formatEuro(challenge.bountyAmount) : '';
  // Eigene Challenge, die noch niemand angenommen hat: bearbeiten oder schließen
  const canManage = isAuthor && challenge.status === 'open' && !challenge.assigneeId;
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

  const summary = (
    <>
      <View style={styles.statusWrap}>
        <View style={styles.statusRow}>
          <StatusBadge status={challenge.status} />
          <Text style={[styles.caption, styles.flex]}>{formatRelative(challenge.createdAt)}</Text>
          {isAuthor ? (
            <IconButton
              icon="settings"
              iconSize={size.icon}
              accessibilityLabel="Challenge verwalten"
              onPress={() => setMenuOpen((open) => !open)}
              style={[styles.gear, menuOpen && styles.gearOpen]}
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
      <View style={styles.metrics}>
        {challenge.bountyAmount ? (
          <View style={styles.metric}>
            <CoinsIcon height={18} />
            <Text style={styles.metricLabel}>Bounty</Text>
            <Text style={[styles.metricValue, styles.signal]}>{formatBountyShort(challenge.bountyAmount)}</Text>
          </View>
        ) : null}
        <View style={styles.metric}>
          <Icon name="clock" size={size.icon} color={color.text.secondary} />
          <Text style={styles.metricLabel}>Frist</Text>
          <Text style={styles.metricValue} numberOfLines={1}>
            {formatRemainingShort(challenge.deadline).replace('Noch ', '')}
          </Text>
        </View>
      </View>
    </>
  );

  const details = (
    <>
      {acceptedByMe ? (
        <>
          <KaterBubble>
            {named
              ? `Danke, dass Du anpackst! Mach am Ende ein Foto vom Ergebnis, dann kann ${author.firstName} bestätigen.`
              : 'Danke, dass Du anpackst! Taufen wir das Baby, Baby? Ich hätte da einen Namen für Deine Operation.'}
          </KaterBubble>
          <InfoRow icon="map-pin" value={challenge.location} />
          {challenge.acceptedAt ? (
            <InfoRow icon="check" value={`Von Dir angenommen am ${formatDayMonthShort(challenge.acceptedAt)}`} />
          ) : null}
          {challenge.rejectionReason ? (
            <Notice
              variant="warning"
              message={`${author.firstName} hat die Erledigung abgelehnt: „${challenge.rejectionReason}“`}
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
        />
      </View>
      {challenge.bountyAmount && !isAuthor ? (
        <Notice
          message={
            acceptedByMe
              ? `${author.firstName} zahlt die ${amount} direkt an Dich. Beim Erledigt-Melden gibst Du ${author.firstName} dafür Deine IBAN oder PayPal frei. Kiez Coins bewegt kein Geld, alles beruht auf Vertrauen.`
              : `${author.firstName} zahlt die Bounty direkt an Dich, zum Beispiel per Überweisung oder PayPal. Kiez Coins bewegt kein Geld, alles beruht auf Vertrauen.`
          }
        />
      ) : null}
      {challenge.status !== 'draft' ? (
        <CommentSection
          comments={challenge.comments}
          users={users}
          currentUserId={currentUserId}
          composerPlaceholder={isAuthor ? 'Antworte oder ergänze etwas …' : `Frag ${author.firstName} …`}
          onSend={
            challenge.status === 'closed'
              ? undefined
              : (body, replyToId) => requireKiez() && dispatch({ type: 'addComment', id: challenge.id, body, replyToId })
          }
          closedHint="Die Challenge ist geschlossen. Neue Kommentare sind nicht mehr möglich."
          onReport={(comment) =>
            router.push({ pathname: '/user/[id]/report', params: { id: comment.authorId, challengeId: challenge.id } })
          }
        />
      ) : null}
    </>
  );

  if (!image) {
    return (
      <SubScreen title="Challenge" navigation="back" onLeadingPress={() => router.back()} actions={actions}>
        {summary}
        {details}
      </SubScreen>
    );
  }

  return (
    <HeroScreen
      image={image}
      imageLabel={challenge.title}
      onBackPress={() => router.back()}
      onSharePress={() => Share.share({ message: `${challenge.title} – Kiez Coins` })}
      imageOverlay={acceptedByMe && challenge.operationName ? <OperationTag name={challenge.operationName} /> : undefined}
      actions={actions}
      summary={summary}
    >
      {details}
    </HeroScreen>
  );
}

/** Eintrag im Zahnrad-Menü der eigenen Challenge */
function MenuItem({ label, onPress, tone, last }: { label: string; onPress: () => void; tone?: 'signal'; last?: boolean }) {
  return (
    <Pressable
      accessibilityRole="menuitem"
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, !last && styles.menuDivider, pressed && styles.pressed]}
    >
      <Text style={[styles.menuText, tone === 'signal' && styles.signal]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  statusWrap: { zIndex: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  flex: { flex: 1 },
  gear: { borderRadius: radius.full, backgroundColor: color.bg.surface, marginRight: -space[4] },
  gearOpen: { backgroundColor: color.line.hairline },
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
  description: { fontFamily: font.light, fontSize: 15, lineHeight: 22, color: color.text.secondary },
  authorBlock: { borderTopWidth: stroke.ultraThin, borderTopColor: color.line.hairline },
  secondary: { ...text.body, color: color.text.secondary },
  naming: { gap: space[12] },
});
