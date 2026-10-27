import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { anrede, formatBountyShort } from '../data/format';
import { useFriends } from '../data/friends';
import { reiseEntries, reiseMood, reiseMoodText, type ReiseEntry } from '../data/reise';
import { useStore } from '../data/store';
import { t } from '../data/texts';
import { useAppDimensions } from '../theme/layout';
import { color, font, radius, space, stroke } from '../theme/tokens';
import { Avatar } from './AuthorRow';
import { Cat } from './icons/Brand';
import { Icon } from './icons/Icon';
import { PH, phXml, useIconPt } from './icons/fashionableSvgs';
import { TAB_BAR_SPACE, TabBar } from './TabBar';
import { Text } from './T';
import { useGoBack } from '../lib/goBack';

type GridTab = 'created' | 'accepted' | 'groups';

const GRID_TABS: { key: GridTab; label: string; icon: (typeof PH)[keyof typeof PH] }[] = [
  { key: 'created', label: 'Erstellt', icon: PH.created },
  { key: 'accepted', label: 'Angenommen', icon: PH.accepted },
  { key: 'groups', label: 'Gruppenaufgaben', icon: PH.groups },
];

/**
 * „Was Du so machst“ im Look „Fashionable“ als Profil (Daria, 23.10.2026), wie fashionable.com/<name> mobil.
 * Maße in pt, seitlich 16:
 * Kopf 44: Name halbfett 20 mit Pfeil, rechts das Menü (Konto). Darunter Bild 86 links, Notiz-Blase des Katers
 * darüber; rechts Name und drei Zahlen (Challenges, Freund:innen, Gruppen). Danach Ort und Verdienst,
 * zwei Knöpfe 34 hoch (8 Abstand), Highlights mit den Gruppen (Kreis 64), Reiter-Icons 44 hoch mit 1 pt Strich,
 * Raster mit drei Spalten im Hochformat 3:4 und 2 pt Fuge.
 */
export function FashionProfile() {
  const router = useRouter();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  const { width } = useAppDimensions();
  const { challenges, currentUserId, profile, groups, users } = useStore();
  const friends = useFriends();
  const [tab, setTab] = useState<GridTab>('created');
  const ICON_PT = useIconPt();
  const entries = useMemo(() => reiseEntries(challenges, currentUserId), [challenges, currentUserId]);
  const mood = reiseMood(entries);
  const me = users.find((u) => u.id === currentUserId);
  const tasks = entries.filter((e) => e.needsAction);
  const earned = entries
    .filter((e) => e.role === 'assignee' && e.challenge.status === 'paid')
    .reduce((sum, e) => sum + (e.challenge.bountyAmount ?? 0), 0);
  const grid = entries.filter((e) =>
    tab === 'groups' ? !!e.challenge.groupId : !e.challenge.groupId && e.role === (tab === 'created' ? 'author' : 'assignee'),
  );
  const tile = (width - 2 * GUTTER) / 3;
  const handle = profile.handle || me?.name || anrede(profile);
  const kiez = profile.kiez?.split(',')[0];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <View style={styles.topSide} />
        <View style={styles.topName}>
          <Text noTranslate style={styles.handle} numberOfLines={1}>
            {handle}
          </Text>
          <View style={styles.chevron}>
            <Icon name="chevron-right" size={12} color={color.text.primary} />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Menü')}
          onPress={() => router.push('/account')}
          hitSlop={8}
          style={({ pressed }) => [styles.topSide, styles.topRight, pressed && styles.pressed]}
        >
          <Icon name="burger" size={20} color={color.text.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_SPACE }}>
        <View style={styles.head}>
          {/* Notiz-Blase wie bei großen Foto-Apps: Der Kater sagt, wie es steht. Tipp öffnet seine Seite. */}
          <View style={styles.avatarCol}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Cat The Käptn Hallo sagen')}
              onPress={() => router.push('/kater')}
              style={styles.note}
            >
              <Text style={styles.noteText} numberOfLines={3}>
                {reiseMoodText(mood, anrede(profile))}
              </Text>
              <View style={styles.noteTail} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Profil bearbeiten')}
              onPress={() => router.push('/account/profile')}
            >
              {me ? (
                <Avatar user={me} diameter={AVATAR} />
              ) : (
                <View style={styles.catAvatar}>
                  <Cat height={AVATAR * 0.6} />
                </View>
              )}
            </Pressable>
          </View>
          <View style={styles.headRight}>
            <Text noTranslate style={styles.name} numberOfLines={1}>
              {anrede(profile)}
            </Text>
            <View style={styles.stats}>
              <Stat value={entries.length} label="Challenges" />
              <Stat value={friends?.friends.length ?? 0} label="Freund:innen" onPress={() => router.push('/account/freunde')} />
              <Stat value={groups.length} label="Gruppen" onPress={() => router.push('/gruppen')} />
            </View>
          </View>
        </View>

        <View style={styles.bio}>
          {kiez ? <Text style={styles.bioText}>{kiez}</Text> : null}
          {earned > 0 ? (
            <Text style={styles.bioText}>{t('{earned} verdient', { earned: formatBountyShort(earned) })}</Text>
          ) : null}
        </View>

        <View style={styles.buttons}>
          <ProfileButton label="Profil bearbeiten" onPress={() => router.push('/account/profile')} />
          <ProfileButton label="Freundschaften" onPress={() => router.push('/account/freunde')} />
        </View>

        {tasks.map((entry) => (
          <Pressable
            key={entry.challenge.id}
            accessibilityRole="button"
            onPress={() => router.push(entry.href)}
            style={({ pressed }) => [styles.task, pressed && styles.pressed]}
          >
            <Thumb entry={entry} side={44} />
            <View style={styles.flex}>
              <Text style={styles.taskKicker}>Du bist dran</Text>
              <Text style={styles.taskTitle} numberOfLines={1}>
                {entry.label}
              </Text>
            </View>
            <Icon name="chevron-right" size={16} color={color.text.secondary} />
          </Pressable>
        ))}

        {/* Highlights: Deine Gruppen, vorn „Neu“ zum Gründen */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlights}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Gruppe gründen')} onPress={() => router.push('/gruppen/neu')} style={styles.hl}>
            <View style={styles.hlCircle}>
              <Icon name="plus" size={24} color={color.text.primary} />
            </View>
            <Text style={styles.hlText}>Neu</Text>
          </Pressable>
          {groups.map((g) => (
            <Pressable
              key={g.id}
              accessibilityRole="button"
              onPress={() => router.push(`/gruppen/${g.id}`)}
              style={styles.hl}
            >
              <View style={[styles.hlCircle, styles.hlGroup]}>
                <Text style={styles.hlInitial}>{g.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <Text noTranslate style={styles.hlText} numberOfLines={1}>
                {g.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.gridTabs} accessibilityRole="tablist">
          {GRID_TABS.map((g) => {
            const on = g.key === tab;
            return (
              <Pressable
                key={g.key}
                accessibilityRole="tab"
                accessibilityLabel={t(g.label)}
                accessibilityState={{ selected: on }}
                onPress={() => setTab(g.key)}
                style={[styles.gridTab, on && styles.gridTabOn]}
              >
                <SvgXml xml={phXml(g.icon, on ? color.text.primary : color.text.secondary)} width={ICON_PT} height={ICON_PT} />
              </Pressable>
            );
          })}
        </View>

        {grid.length ? (
          <View style={styles.grid}>
            {grid.map((entry) => (
              <Pressable
                key={entry.challenge.id}
                accessibilityRole="button"
                accessibilityLabel={entry.label}
                onPress={() => router.push(entry.href)}
                style={({ pressed }) => [{ width: tile, height: tile * (4 / 3) }, pressed && styles.pressed]}
              >
                <Tile entry={entry} />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>
            {tab === 'created' ? 'Noch keine Challenge erstellt.' : tab === 'accepted' ? 'Noch keine Challenge angenommen.' : 'Noch keine Gruppenaufgaben.'}
          </Text>
        )}
      </ScrollView>

      <TabBar
        active="reise"
        onFeedPress={() => (goBack())}
        onMenuPress={() => router.push('/account')}
      />
    </View>
  );
}

function Stat({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function ProfileButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function image(entry: ReiseEntry) {
  const c = entry.challenge;
  return c.image ?? c.imageAfter ?? c.report?.photo;
}

function Thumb({ entry, side }: { entry: ReiseEntry; side: number }) {
  const src = image(entry);
  const box = { width: side, height: side, borderRadius: radius.sm };
  return src ? <Image source={src} style={box} contentFit="cover" /> : <View style={[box, styles.tileEmpty]} />;
}

/** Kachel im Raster: Foto, ohne Foto der Titel auf grauer Fläche. Punkt oben rechts: Du bist dran. */
function Tile({ entry }: { entry: ReiseEntry }) {
  const src = image(entry);
  return (
    <View style={styles.tile}>
      {src ? (
        <Image source={src} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Text style={styles.tileTitle} numberOfLines={4}>
          {entry.challenge.title}
        </Text>
      )}
      {entry.needsAction ? <View style={styles.tileDot} /> : null}
    </View>
  );
}

const AVATAR = 86;
const GUTTER = 2;
const HL = 64;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  pressed: { opacity: 0.6 },
  flex: { flex: 1, gap: space[2] },
  top: { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[16] },
  topSide: { width: 44, height: 44, justifyContent: 'center' },
  topRight: { alignItems: 'flex-end' },
  topName: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[4] },
  handle: { fontFamily: font.semiBold, fontSize: 20, lineHeight: 24, color: color.text.primary },
  chevron: { transform: [{ rotate: '90deg' }] },
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: space[24], paddingHorizontal: space[16], paddingTop: space[8] },
  avatarCol: { alignItems: 'flex-start', paddingTop: 34 },
  note: {
    position: 'absolute',
    top: 0,
    left: -4,
    maxWidth: 156,
    paddingHorizontal: space[12],
    paddingVertical: space[6],
    borderRadius: 16,
    backgroundColor: color.bg.surface,
    zIndex: 2,
  },
  noteText: { fontFamily: font.regular, fontSize: 11, lineHeight: 14, color: color.text.primary },
  noteTail: {
    position: 'absolute',
    bottom: -5,
    left: 18,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.bg.surface,
  },
  catAvatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: color.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headRight: { flex: 1, gap: space[8], paddingBottom: space[8] },
  name: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 20, color: color.text.primary },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'flex-start' },
  statValue: { fontFamily: font.semiBold, fontSize: 16, lineHeight: 20, color: color.text.primary, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.text.primary },
  bio: { paddingHorizontal: space[16], paddingTop: space[12], gap: space[2] },
  bioText: { fontFamily: font.regular, fontSize: 14, lineHeight: 18, color: color.text.primary },
  buttons: { flexDirection: 'row', gap: space[8], paddingHorizontal: space[16], paddingTop: space[12] },
  button: { flex: 1, height: 34, borderRadius: radius.md, backgroundColor: color.bg.surface, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 18, color: color.text.primary },
  task: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    marginHorizontal: space[16],
    marginTop: space[12],
    padding: space[8],
    borderRadius: radius.lg,
    borderWidth: stroke.thin,
    borderColor: color.line.hairline,
  },
  taskKicker: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: color.accent.primary },
  taskTitle: { fontFamily: font.regular, fontSize: 14, lineHeight: 18, color: color.text.primary },
  highlights: { paddingHorizontal: space[16], paddingTop: space[16], paddingBottom: space[12], gap: space[16] },
  hl: { width: HL, alignItems: 'center', gap: space[6] },
  hlCircle: {
    width: HL,
    height: HL,
    borderRadius: HL / 2,
    borderWidth: stroke.thin,
    borderColor: color.line.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hlGroup: { backgroundColor: color.bg.surface },
  hlInitial: { fontFamily: font.semiBold, fontSize: 24, lineHeight: 28, color: color.brand.signature },
  hlText: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: color.text.primary, alignSelf: 'stretch', textAlign: 'center' },
  gridTabs: { flexDirection: 'row', borderBottomWidth: stroke.ultraThin, borderBottomColor: color.line.hairline },
  gridTab: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: 'transparent', marginBottom: -stroke.ultraThin },
  gridTabOn: { borderBottomColor: color.text.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GUTTER, paddingTop: GUTTER },
  tile: { flex: 1, backgroundColor: color.bg.surface, overflow: 'hidden', justifyContent: 'center', padding: space[8] },
  tileEmpty: { backgroundColor: color.bg.surface },
  tileTitle: { fontFamily: font.semiBold, fontSize: 13, lineHeight: 17, color: color.text.primary, textAlign: 'center' },
  tileDot: {
    position: 'absolute',
    top: space[8],
    right: space[8],
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: color.accent.affection,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  empty: { fontFamily: font.regular, fontSize: 14, lineHeight: 18, color: color.text.secondary, textAlign: 'center', paddingVertical: space[48] },
});
