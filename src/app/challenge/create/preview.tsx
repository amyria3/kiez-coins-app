import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthorRow } from '../../../components/AuthorRow';
import { StatusBadge } from '../../../components/Badges';
import { Button } from '../../../components/Button';
import { CoinsIcon } from '../../../components/icons/Brand';
import { Icon } from '../../../components/icons/Icon';
import { HeroScreen } from '../../../components/Screen';
import { formatBountyShort, formatRemainingShort } from '../../../data/format';
import { useCurrentUser, useStore } from '../../../data/store';
import { color, font, radius, size, space, stroke, text } from '../../../theme/tokens';
import { useDraft } from './_layout';

/** Breite des ausgeblurrten Rands links und rechts */
const EDGE = space[16];
/** Höhe der Button-Leiste unten (Button 52 + Abstand oben) */
const BAR = 52 + space[12];

/**
 * Route `challenge/create/preview`. Vorschau vor dem Veröffentlichen: die Challenge so, wie sie im Detail
 * erscheint, mit ausgeblurrtem Rand. Unten ein langer Button „Veröffentlichen“, links daneben ein kleiner
 * „Bearbeiten“ zurück zu Schritt 2.
 */
export default function CreatePreview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [draft] = useDraft();
  const user = useCurrentUser();
  const { canOfferBounties, createChallenge, publishDraft } = useStore();
  const [busy, setBusy] = useState(false);

  const deadline = new Date(Date.now() + draft.durationDays * 24 * 60 * 60 * 1000).toISOString();
  const bountyAmount = draft.bountyAmount;
  const bottom = Math.max(insets.bottom, space[16]);
  const top = insets.top + space[48];

  const publish = async () => {
    if (!draft.photo || busy) return;
    if (bountyAmount && !canOfferBounties) {
      Alert.alert(
        'Keine Bounty möglich',
        'Nach einer Meldung wegen einer nicht gezahlten Bounty kannst Du keine Bounties mehr anbieten. Challenges ohne Bounty gehen weiterhin.',
      );
      return;
    }
    setBusy(true);
    try {
      const id = draft.id
        ? await publishDraft(
            draft.id,
            {
              title: draft.title,
              text: draft.text,
              location: draft.location,
              bountyAmount,
              photo: draft.imagePath ? undefined : draft.photo,
              imagePath: draft.imagePath,
              coords: draft.coords,
              extras: draft.extras,
            },
            deadline,
          )
        : await createChallenge({
            title: draft.title.trim(),
            text: draft.text.trim(),
            location: draft.location.trim(),
            bountyAmount,
            photo: draft.photo,
            deadline,
            coords: draft.coords,
            extras: draft.extras,
          });
      router.replace({ pathname: '/challenge/create/success', params: { id } });
    } catch (error) {
      Alert.alert('Nicht veröffentlicht', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!draft.photo) return null;

  const summary = (
    <>
      <View style={styles.statusRow}>
        <StatusBadge status="open" />
        <Text style={styles.caption}>gerade eben</Text>
      </View>
      <Text style={styles.headline} accessibilityRole="header">
        {draft.title.trim()}
      </Text>
      <View style={styles.metrics}>
        {bountyAmount ? (
          <View style={styles.metric}>
            <CoinsIcon height={18} />
            <Text style={styles.metricLabel}>Bounty</Text>
            <Text style={[styles.metricValue, styles.signal]}>{formatBountyShort(bountyAmount)}</Text>
          </View>
        ) : null}
        <View style={styles.metric}>
          <Icon name="clock" size={size.icon} color={color.text.secondary} />
          <Text style={styles.metricLabel}>Noch</Text>
          <Text style={styles.metricValue} numberOfLines={1}>
            {formatRemainingShort(deadline).replace('Noch ', '')}
          </Text>
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.screen}>
      <HeroScreen
        image={draft.photo}
        moreImages={draft.extras.map((e) => e.photo)}
        imageLabel={draft.title}
        onBackPress={() => router.back()}
        // Platzhalter, damit der Inhalt über der eigenen Button-Leiste endet
        actions={<View style={{ height: BAR - space[12] }} />}
        summary={summary}
      >
        {draft.text.trim() ? <Text style={styles.description}>{draft.text.trim()}</Text> : null}
        <View style={styles.authorBlock}>
          <AuthorRow user={user} location={draft.location.trim()} />
        </View>
      </HeroScreen>

      {/* Ausgeblurrter Rand: oben, unten, links, rechts. Die Mitte bleibt scharf. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BlurView intensity={30} tint="dark" style={[styles.edge, { top: 0, left: 0, right: 0, height: top }]} />
        <BlurView
          intensity={30}
          tint="dark"
          style={[styles.edge, { bottom: 0, left: 0, right: 0, height: BAR + bottom + space[8] }]}
        />
        <BlurView
          intensity={30}
          tint="dark"
          style={[styles.edge, { top, bottom: BAR + bottom + space[8], left: 0, width: EDGE }]}
        />
        <BlurView
          intensity={30}
          tint="dark"
          style={[styles.edge, { top, bottom: BAR + bottom + space[8], right: 0, width: EDGE }]}
        />
        <View style={[styles.frame, { top, bottom: BAR + bottom + space[8], left: EDGE, right: EDGE }]} />
        <Text style={[styles.label, { top: insets.top + space[16] }]}>Vorschau</Text>
      </View>

      <View style={[styles.bar, { paddingBottom: bottom }]}>
        <Button label="Bearbeiten" variant="secondary" onPress={() => router.back()} disabled={busy} />
        <Button
          label={busy ? 'Wird veröffentlicht …' : 'Veröffentlichen'}
          onPress={publish}
          disabled={busy}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  flex: { flex: 1 },
  edge: { position: 'absolute', backgroundColor: 'rgba(31, 33, 35, 0.35)' },
  frame: {
    position: 'absolute',
    borderRadius: radius.lg,
    borderWidth: stroke.thin,
    borderColor: color.line.hairline,
  },
  label: { position: 'absolute', alignSelf: 'center', ...text.caption, color: color.text.primary },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: space[8],
    paddingTop: space[12],
    paddingHorizontal: space[16],
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  caption: { ...text.caption, fontSize: 13, color: color.text.secondary },
  headline: { ...text.headline, color: color.text.primary },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
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
  signal: { color: color.accent.signal },
  description: { fontFamily: font.light, fontSize: 15, lineHeight: 22, color: color.text.secondary },
  authorBlock: { borderTopWidth: stroke.ultraThin, borderTopColor: color.line.hairline },
});
