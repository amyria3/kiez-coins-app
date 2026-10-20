import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';

import { StatusBadge } from '../components/Badges';
import { Button } from '../components/Button';
import { Icon } from '../components/icons/Icon';
import { SubScreen } from '../components/Screen';
import { formatRelative, formatRemainingShort } from '../data/format';
import { useRequireKiez } from '../data/kiez';
import { useStore } from '../data/store';
import type { Challenge } from '../data/types';
import { color, font, radius, size, space, stroke, text } from '../theme/tokens';

const RUNNING = new Set(['accepted', 'reported', 'payment_open', 'paid_marked']);
const DONE = new Set(['confirmed', 'paid', 'closed']);

type Section = { key: string; title: string; hint: string; items: Challenge[] };

/**
 * Route `manage` („Deine Challenges“). Erreichbar über „Verwalten“ an eigenen Posts im Feed und im Detail.
 * Entwürfe fertig machen oder löschen, offene Challenges bearbeiten oder schließen, den Rest ansehen.
 */
export default function ManageChallenges() {
  const router = useRouter();
  const requireKiez = useRequireKiez();
  const { challenges, currentUserId, dispatch } = useStore();

  const sections = useMemo<Section[]>(() => {
    const mine = challenges
      .filter((c) => c.authorId === currentUserId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return [
      {
        key: 'draft',
        title: 'Entwürfe',
        hint: 'Nur für Dich sichtbar.',
        items: mine.filter((c) => c.status === 'draft'),
      },
      {
        key: 'open',
        title: 'Offen',
        hint: 'Bearbeiten und Schließen geht, bis jemand annimmt.',
        items: mine.filter((c) => c.status === 'open'),
      },
      { key: 'running', title: 'Läuft', hint: 'Jemand packt gerade an.', items: mine.filter((c) => RUNNING.has(c.status)) },
      {
        key: 'done',
        title: 'Erledigt und geschlossen',
        hint: 'Bleibt in der Timeline sichtbar.',
        items: mine.filter((c) => DONE.has(c.status)),
      },
    ].filter((s) => s.items.length > 0);
  }, [challenges, currentUserId]);

  const create = () => requireKiez() && router.push('/challenge/create/step-1');

  const deleteDraft = (c: Challenge) =>
    Alert.alert('Entwurf löschen?', 'Das lässt sich nicht rückgängig machen.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => dispatch({ type: 'deleteDraft', id: c.id }) },
    ]);

  const close = (c: Challenge) =>
    Alert.alert(
      'Challenge schließen?',
      'Die Challenge bleibt im Feed sichtbar, lässt sich aber nicht mehr annehmen oder kommentieren. Das lässt sich nicht rückgängig machen.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Schließen', style: 'destructive', onPress: () => dispatch({ type: 'close', id: c.id }) },
      ],
    );

  const openDraft = (c: Challenge) =>
    requireKiez() && router.push({ pathname: '/challenge/create/step-1', params: { draftId: c.id } });

  return (
    <SubScreen
      title="Deine Challenges"
      navigation="back"
      onLeadingPress={() => (router.canGoBack() ? router.back() : router.replace('/feed'))}
      actions={<Button label="Neue Challenge" onPress={create} />}
    >
      {sections.length === 0 ? (
        <Text style={styles.hint}>Du hast noch keine Challenge erstellt. Fang mit einem Foto an.</Text>
      ) : null}
      {sections.map((section) => (
        <View key={section.key} style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {section.title}
            </Text>
            <Text style={styles.hint}>{section.hint}</Text>
          </View>
          {section.items.map((c) => {
            const isDraft = c.status === 'draft';
            const href: Href = `/challenge/${c.id}`;
            const meta = isDraft
              ? `Gespeichert ${formatRelative(c.createdAt)}`
              : c.status === 'open'
                ? formatRemainingShort(c.deadline)
                : formatRelative(c.closedAt ?? c.createdAt);
            return (
              <View key={c.id} style={styles.card}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${c.title || 'Ohne Titel'} öffnen`}
                  onPress={() => (isDraft ? openDraft(c) : router.push(href))}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  {c.image ? (
                    <Image source={c.image} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbEmpty]}>
                      <Icon name="camera" size={size.icon} color={color.text.secondary} />
                    </View>
                  )}
                  <View style={styles.flex}>
                    <Text style={styles.title} numberOfLines={2}>
                      {c.title || 'Ohne Titel'}
                    </Text>
                    <View style={styles.metaRow}>
                      <StatusBadge status={c.status} />
                      <Text style={styles.meta} numberOfLines={1}>
                        {meta}
                      </Text>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={size.icon} color={color.text.secondary} />
                </Pressable>
                {isDraft || (c.status === 'open' && !c.assigneeId) ? (
                  <View style={styles.pills}>
                    {isDraft ? (
                      <>
                        <Pill label="Weiter bearbeiten" onPress={() => openDraft(c)} />
                        <Pill label="Löschen" onPress={() => deleteDraft(c)} />
                      </>
                    ) : (
                      <>
                        <Pill label="Bearbeiten" onPress={() => router.push(`/challenge/${c.id}/edit`)} />
                        <Pill label="Schließen" onPress={() => close(c)} />
                      </>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </SubScreen>
  );
}

function Pill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[12] },
  sectionHead: { gap: space[2] },
  sectionTitle: { ...text.title, color: color.text.primary },
  hint: { ...text.caption, color: color.text.secondary },
  card: {
    gap: space[12],
    padding: space[12],
    borderRadius: radius.lg,
    backgroundColor: color.bg.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  pressed: { opacity: 0.7 },
  thumb: { width: 56, height: 56, borderRadius: radius.md },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: stroke.thin,
    borderColor: color.line.hairline,
  },
  flex: { flex: 1, gap: space[6] },
  title: { fontFamily: font.medium, fontSize: 15, lineHeight: 20, color: color.text.primary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  meta: { ...text.caption, color: color.text.secondary, flex: 1 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  pill: {
    minHeight: 40,
    paddingHorizontal: space[16],
    borderRadius: radius.full,
    borderWidth: stroke.thin,
    borderColor: color.line.hairline,
    justifyContent: 'center',
  },
  pillText: { fontFamily: font.medium, fontSize: 14, lineHeight: 18, color: color.text.primary },
});
