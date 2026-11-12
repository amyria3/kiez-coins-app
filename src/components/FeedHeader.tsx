import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, I18nManager, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, G, Mask, Path, Rect } from 'react-native-svg';
import { Text } from './T';
import { fitShape, SWITCH_KNOB, SWITCH_TRACK } from './handSwitch';
import { Image } from 'expo-image';

import { challengeTypes, isTypeActive } from '../data/features';
import type { Challenge } from '../data/types';
import { color, font, isFashionable, motion, radius, size, space, stroke, text } from '../theme/tokens';
import { Notice } from './Content';
import { Logo } from './icons/Brand';
import { Icon } from './icons/Icon';
import { useRouter } from 'expo-router';
import { useFriendRequests, useUnreadMessages } from '../data/chat';
import { SkeletonTopItem } from './Skeleton';
import { isRtl, t } from '../data/texts';
import type { Mode } from '../data/features';

type AppHeaderProps = {
  /** Tipp auf Logo und Kater öffnet „Was Du so machst“. */
  onLogoPress?: () => void;
  /** Langes Drücken aufs Logo öffnet das Demo-Menü (nur für Tests mit Beispieldaten). */
  onLogoLongPress?: () => void;
  /** Punkt am Kater: Bei einer Deiner Challenges bist Du dran. */
  hasTasks?: boolean;
};

/**
 * Figma „AppHeader“, Upgrade „Nachtschicht“: Logo mit Kater in der Mitte. Das Menü liegt in der Tab-Leiste,
 * die Kamera oben rechts ist seit 2026-11-09 weg, Erstellen sitzt in der Leiste unten. Der Kopf scrollt mit dem Feed weg.
 */
export function AppHeader(props: AppHeaderProps) {
  return isFashionable ? <FashionHeader {...props} /> : <KiezHeader {...props} />;
}

/**
 * Kopf im Look „Fashionable“ nach Darias Mockup (24.10.2026): Logo mit Kater und Schriftzug links (seit 2026-11-12 das neue Logo),
 * Inter Tight halbfett 24/28, rechts die Sprechblase mit Zeilen (Chats). Dein Profilbild („Was Du so machst“) sitzt in der Leiste unten (Daria, 27.10.2026).
 * Abstände 4 oben, 12 rechts, 8 unten, 14 links.
 */
function FashionHeader({ onLogoLongPress }: AppHeaderProps) {
  const router = useRouter();
  const unread = useUnreadMessages();
  const requests = useFriendRequests();
  return (
    <View style={styles.fashionHead}>
      <Pressable onLongPress={onLogoLongPress} accessibilityRole="header">
        {/* Neues Logo mit Kater und Schriftzug, in Textfarbe (Daria, 2026-11-12) */}
        <View style={styles.brand} accessible accessibilityLabel="KiezCoins">
          <Logo height={26} />
        </View>
      </Pressable>
      <View style={styles.headIcons}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unread ? t('Chats, {n} ungelesen', { n: unread }) : requests ? t('Chats, neue Freundschaftsanfrage') : t('Chats')}
          onPress={() => router.push('/chat')}
          hitSlop={10}
        >
          <Icon name="message" size={size.icon} />
          {unread || requests ? <View style={styles.headDot} /> : null}
        </Pressable>
      </View>
    </View>
  );
}

function KiezHeader({ onLogoPress, onLogoLongPress, hasTasks }: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onLogoPress}
        onLongPress={onLogoLongPress}
        accessibilityRole="button"
        accessibilityLabel={hasTasks ? t('Was Du so machst, Du bist dran') : t('Was Du so machst')}
        style={styles.logo}
      >
        {/* Logo mit Kater links (Daria, 2026-11-12: neues Logo); der Punkt sitzt am Kater */}
        <View>
          <Logo height={28} />
          {hasTasks ? <View style={[styles.taskDot, styles.taskDotLogo]} /> : null}
        </View>
      </Pressable>
      <View style={styles.spacer} />
    </View>
  );
}

/** Offene öffentliche Posts nach Art (ohne Gruppen und private Posts), für die Zeile unter der Begrüßung */
export type FeedCounts = { challenges: number; me: number; photos: number };

/** „2 Challenges, 1 Me-Challenge und 3 Bilder in Deiner Nähe“; Arten ohne Post fallen weg (Daria, 31.10.2026) */
function countLine(counts: FeedCounts): string {
  const parts = [
    counts.challenges ? t('{n, plural, one {# Challenge} other {# Challenges}}', { n: counts.challenges }) : '',
    counts.me ? t('{n, plural, one {# Me-Challenge} other {# Me-Challenges}}', { n: counts.me }) : '',
    counts.photos ? t('{n, plural, one {# Bild} other {# Bilder}}', { n: counts.photos }) : '',
  ].filter(Boolean);
  if (parts.length === 3) return t('{a}, {b} und {c} in Deiner Nähe', { a: parts[0], b: parts[1], c: parts[2] });
  if (parts.length === 2) return t('{a} und {b} in Deiner Nähe', { a: parts[0], b: parts[1] });
  if (parts.length === 1) return t('{a} in Deiner Nähe', { a: parts[0] });
  return t('Noch nichts in Deiner Nähe');
}

/**
 * Begrüßung über dem Feed: Tageszeit, Ansprache, Kiez und was es in der Nähe gibt, getrennt nach Art.
 * `counts` leer, solange der Feed lädt: Dann steht nur der Kiez da, nicht „Noch nichts“.
 */
export function FeedGreeting({ name, kiez, counts }: { name: string; kiez?: string; counts?: FeedCounts }) {
  // Fashionable Look: keine Begrüßung, der Schriftzug steht allein (Mockup)
  if (isFashionable) return null;
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend';
  const sub = [kiez, counts ? countLine(counts) : ''].filter(Boolean).join(' · ');
  return (
    <View style={styles.greeting}>
      <Text style={styles.greetingTitle} accessibilityRole="header">
        {greeting},{' '}
        <Text noTranslate style={styles.greetingName}>
          {name}
        </Text>
      </Text>
      {sub ? <Text style={styles.greetingSub}>{sub}</Text> : null}
    </View>
  );
}

type TopChallengeBarProps = {
  items: Challenge[];
  /** Während des Ladens Platzhalter zeigen; ohne Einträge danach gar nichts. */
  loading?: boolean;
  onItemPress: (id: string) => void;
};

/** Figma „TopChallengeBar“: horizontale Liste aus „TopChallengeItem“. */
export function TopChallengeBar({ items, loading, onItemPress }: TopChallengeBarProps) {
  if (items.length === 0 && !loading) return null;
  if (items.length === 0) {
    // Ladezustand (Figma FeedScreen State=Loading)
    return (
      <View style={[styles.topBar, styles.row]}>
        {[0, 1, 2].map((i) => (
          <SkeletonTopItem key={i} />
        ))}
      </View>
    );
  }
  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.topBar}
      style={styles.noGrow}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onItemPress(item.id)}
          hitSlop={{ top: 4, bottom: 4 }}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          style={styles.topItem}
        >
          <Image source={item.image} style={styles.thumbnail} contentFit="cover" />
          <Text style={styles.topTitle} numberOfLines={1}>
            {item.title}
          </Text>
        </Pressable>
      )}
    />
  );
}

export type FeedTab = 'private' | 'nearby' | 'everywhere' | 'wave' | 'completed' | 'groups';

/** Reiter je Modus (data/features.ts): Privat, Gruppe, Kiez, Überall */
export const TAB_OF_MODE: Record<Mode, FeedTab> = { private: 'private', groups: 'groups', kiez: 'nearby', everywhere: 'everywhere' };
export const MODE_OF_TAB: Partial<Record<FeedTab, Mode>> = { private: 'private', groups: 'groups', nearby: 'kiez', everywhere: 'everywhere' };

// Wave und Pleasure sind raus aus der Leiste (Daria, 22.10.2026). Die Filter in feed.tsx bleiben für später.
// Reihenfolge Privat, Gruppe, Kiez (Daria, 27.10.2026)
const tabs: { key: FeedTab; label: string; planned?: boolean }[] = [
  { key: 'private', label: 'Privat' },
  { key: 'groups', label: 'Gruppen' },
  { key: 'nearby', label: 'Kiez' },
  // Rechts im Umschalter (Daria, 29.10.2026)
  { key: 'everywhere', label: 'Überall' },
];

type TabsNavigationProps = {
  selectedKey: FeedTab;
  onChange: (key: FeedTab) => void;
  /** Auswahl lila hervorheben, bis die Person den Umschalter berührt (Erstellen, Daria, 2026-10-31) */
  accent?: boolean;
  /** Sichtbare Modi (Auge in „Dein Konto › Funktionen“, Daria, 27.10.2026) */
  visible: Mode[];
  /** Eigene kleine Spur links neben den Reitern, z. B. „Routine“ */
  lead?: SegmentLead;
};

/**
 * Figma „TabsNavigation“, Upgrade „Nachtschicht“: Segmente auf einer Pille; die Auswahl filtert den Feed.
 * Abgeschaltete Challenge-Typen (data/features.ts) sind gedimmt, lassen sich aber öffnen:
 * Der Feed zeigt dann einen Hinweis und vorhandene Challenges dieses Typs.
 */
export function TabsNavigation({ selectedKey, onChange, visible, accent, lead }: TabsNavigationProps) {
  const shown = tabs.filter((tab) => visible.some((mode) => TAB_OF_MODE[mode] === tab.key));
  // Nur ein Modus sichtbar und nichts daneben: kein Umschalter
  if (shown.length < 2 && !lead) return null;
  return <Segments tabs={shown} selectedKey={selectedKey} onChange={onChange} accent={accent} lead={lead} />;
}

/**
 * „Routine“ links neben den Reitern (Daria, 2026-11-09): eigene Spur wie ein zweiter Schalter, sieht aber aus
 * wie ein nicht gewählter Reiter. Beim Tippen gleitet der helle Knopf hinüber, unter dem Bildschirm-Hintergrund
 * zwischen den Spuren hindurch wie unter Papier (Daria, 2026-11-10).
 */
export type SegmentLead = { label: string; active: boolean; onPress: () => void };

type SegmentsProps<K extends string> = {
  tabs: { key: K; label: string; planned?: boolean }[];
  selectedKey: K;
  onChange: (key: K) => void;
  /**
   * Lage beim Wischen zwischen den Seiten, 0 = erster Reiter, 1 = zweiter usw.
   * Damit folgt die Pille dem Finger. Ohne: Die Pille gleitet nach dem Tippen zum Reiter.
   */
  progress?: Animated.Value | Animated.AnimatedInterpolation<number>;
  /** Auswahl lila statt schwarz-weiß: zeigt, was eingestellt ist, solange niemand umgeschaltet hat */
  accent?: boolean;
  /** Eigene Spur links daneben; der Knopf gleitet hinüber, wenn sie aktiv ist (nur Pillen-Look) */
  lead?: SegmentLead;
};

/** Segmente mit gleitender Pille, z. B. Feed-Reiter oder „Aktuell / Archiv“ in „Deine Challenges“. */
export function Segments<K extends string>(props: SegmentsProps<K>) {
  return isFashionable ? <UnderlineTabs {...props} /> : <PillSegments {...props} />;
}

/**
 * Umschalter im Look „Fashionable“ (Daria, 23.10.2026), wie die Reiter in Profilen großer Foto-Apps: gleich breite Felder,
 * 44 pt hoch, Schrift 15 pt. Aktiv schwarz und halbfett, sonst Grau #737373. Unter dem aktiven Reiter liegt
 * ein schwarzer Strich, 1 pt stark und so breit wie das Feld; er gleitet mit „Schranke“ bzw. folgt dem Finger.
 * Darunter eine Haarlinie über die ganze Breite.
 */
function UnderlineTabs<K extends string>({ tabs, selectedKey, onChange, progress, accent = false }: SegmentsProps<K>) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, tabs.findIndex((tab) => tab.key === selectedKey));
  const x = useRef(new Animated.Value(index)).current;
  useEffect(() => {
    if (progress) return;
    Animated.timing(x, {
      toValue: index,
      duration: motion.tabSwitch.duration,
      easing: Easing.bezier(...motion.barrier.bezier),
      useNativeDriver: true,
    }).start();
  }, [index, x, progress]);
  const at = progress ?? x;
  const w = tabs.length ? width / tabs.length : 0;
  // Rechts nach links liegt der erste Reiter rechts
  const slot = rtlLayout() ? Animated.subtract(tabs.length - 1, at) : at;
  return (
    <View style={styles.under} accessibilityRole="tablist" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {tabs.map((tab) => {
        const selected = tab.key === selectedKey;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.planned ? t('{label}, kommt später', { label: t(tab.label) }) : t(tab.label)}
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [styles.underTab, pressed && styles.underPressed]}
          >
            <Text numberOfLines={1} style={[styles.underText, selected && styles.underTextSelected, selected && accent && styles.accentText, tab.planned && !selected && styles.planned]}>
              {t(tab.label)}
            </Text>
          </Pressable>
        );
      })}
      {w ? (
        <View pointerEvents="none" style={styles.physical}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.underBar,
              accent && styles.accentFill,
              { width: w, transform: [{ translateX: Animated.multiply(slot, w) }] },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

type Box = { x: number; width: number; height: number };
const sameBox = (a: Box | null, b: Box) => !!a && a.x === b.x && a.width === b.width && a.height === b.height;

function PillSegments<K extends string>({ tabs, selectedKey, onChange, progress, accent = false, lead }: SegmentsProps<K>) {
  // Helle Pille gleitet zum gewählten Reiter (Bewegung „Schranke“, etwas langsamer).
  // Der gewählte Reiter bekommt seitlich mehr Polsterung; die Nachbarn rutschen mit (Daria, 31.10.2026).
  // Eine Lage `pos` (Index, auch Zwischenwerte) steuert Polsterung, Pille und Schriftfarbe gemeinsam.
  // Die eigene Spur links (`lead`) hat die Lage -1.
  const index = Math.max(0, tabs.findIndex((tab) => tab.key === selectedKey));
  const target = lead?.active ? -1 : index;
  const [main, setMain] = useState<Box | null>(null);
  const [rowWidth, setRowWidth] = useState(0);
  const [leadBox, setLeadBox] = useState<Box | null>(null);
  const [content, setContent] = useState<Partial<Record<K, number>>>({});
  const own = useRef(new Animated.Value(target)).current;
  const pos = progress ?? own;
  const placed = useRef(false);
  useEffect(() => {
    if (progress) return;
    if (!placed.current) {
      own.setValue(target);
      placed.current = true;
      return;
    }
    Animated.timing(own, {
      toValue: target,
      duration: motion.tabSwitch.duration,
      easing: Easing.bezier(...motion.barrier.bezier),
      useNativeDriver: false,
    }).start();
  }, [target, own, progress]);

  const barWidth = main?.width ?? 0;
  const barHeight = main?.height ?? 0;
  const widths = tabs.map((tab) => content[tab.key]);
  const measured = barWidth > 0 && widths.every((w) => w !== undefined) ? (widths as number[]) : undefined;
  const basePad = measured ? segmentPad(measured, barWidth) : SEGMENT_PAD;
  const rest = measured ? restLayouts(measured, barWidth, basePad) : undefined;
  // Höchstbreite der Beschriftung bei den nicht gewählten Reitern
  const cap = measured ? labelCap(measured, index, barWidth, basePad) : Infinity;
  const single = tabs.length < 2;
  // Wie stark ein Reiter gerade gewählt ist: 1 unter der Pille, 0 daneben
  const weight = (i: number) =>
    single && !lead ? 1 : pos.interpolate({ inputRange: [i - 1, i, i + 1], outputRange: [0, 1, 0], extrapolate: 'clamp' });

  // Lagen des Knopfs in der ganzen Zeile: zuerst die eigene Spur, dann die Reiter
  const withLead = !!lead;
  const ready = !!rest && !!main && rowWidth > 0 && (!withLead || !!leadBox);
  // `rest` zählt vom Anfang der Spur. Rechts nach links (Hebräisch, Arabisch) liegt der Anfang rechts;
  // Spuren und Knopf werden aber von links gezeichnet (Daria, 2026-11-11).
  const rtl = rtlLayout();
  const knobRest = ready
    ? [
        ...(withLead && leadBox ? [{ x: leadBox.x + BAR_PAD, width: leadBox.width - 2 * BAR_PAD }] : []),
        ...rest!.map((l) => ({ x: main!.x + (rtl ? main!.width - l.x - l.width : l.x), width: l.width })),
      ]
    : undefined;
  const on = accent ? color.text.onAccent : color.bg.screen;
  /** Heller Knopf in der Farbe der großen Icons statt Puder-Weiß (Daria, 2026-11-12: Puder biss sich mit dem Feed) */
  const fill = accent ? color.accent.primary : color.icon.large;

  return (
    <View
      style={styles.segmentsRow}
      onLayout={(e) => {
        const rw = e.nativeEvent.layout.width;
        setRowWidth((old) => (old === rw ? old : rw));
      }}
    >
      {/* Spur und Knopf aus Darias Icon „Switch“, der Knopf 2° im Uhrzeigersinn geneigt (Daria, 08.11.2026) */}
      {main && rowWidth ? (
        <View pointerEvents="none" style={styles.physical}>
          <Svg width={rowWidth} height={barHeight}>
            {leadBox ? (
              <G transform={`translate(${leadBox.x} 0)`}>
                <Path d={fitShape(SWITCH_TRACK, leadBox.width, leadBox.height)} fill={color.bg.surface} />
              </G>
            ) : null}
            <G transform={`translate(${main.x} 0)`}>
              <Path d={fitShape(SWITCH_TRACK, main.width, main.height)} fill={color.bg.surface} />
            </G>
          </Svg>
        </View>
      ) : null}
      {knobRest ? (
        <View pointerEvents="none" style={styles.physical}>
          <HandKnob pos={pos} shift={withLead ? 1 : 0} rest={knobRest} single={knobRest.length < 2} height={barHeight - 2 * BAR_PAD} fill={fill} />
        </View>
      ) : null}
      {/* Zwischen den Spuren liegt der Bildschirm-Hintergrund wie Papier über dem Knopf */}
      {main && leadBox && rowWidth ? <Paper lead={leadBox} main={main} width={rowWidth} /> : null}
      {lead ? (
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: lead.active }}
          onPress={lead.onPress}
          onLayout={(e) => {
            const { x, width: w, height: h } = e.nativeEvent.layout;
            const box = { x, width: w, height: h };
            setLeadBox((old) => (sameBox(old, box) ? old : box));
          }}
          style={({ pressed }) => [styles.lead, pressed && styles.leadPressed]}
        >
          <Animated.Text
            numberOfLines={1}
            style={[styles.segmentText, lead.active && styles.segmentTextSelected, ready ? { color: labelColor(pos, -1, on) } : null]}
          >
            {lead.label}
          </Animated.Text>
        </Pressable>
      ) : null}
      <View
        style={[styles.segments, withLead && styles.segmentsBeside]}
        accessibilityRole="tablist"
        onLayout={(e) => {
          const { x, width: w, height: h } = e.nativeEvent.layout;
          const box = { x, width: w, height: h };
          setMain((old) => (sameBox(old, box) ? old : box));
        }}
      >
        {/* Unsichtbar: volle Breite jeder Beschriftung. Wird es eng, kürzen die sichtbaren Reiter mit „…“ (Daria, 2026-11-10). */}
        {tabs.map((tab) => (
          <View
            key={`measure-${tab.key}`}
            style={styles.measure}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onLayout={(e) => {
              const cw = e.nativeEvent.layout.width;
              setContent((c) => (c[tab.key] === cw ? c : { ...c, [tab.key]: cw }));
            }}
          >
            <Text numberOfLines={1} style={[styles.segmentText, tab.key === selectedKey && !lead?.active && styles.segmentTextSelected]}>
              {t(tab.label)}
            </Text>
          </View>
        ))}
        {tabs.map((tab, i) => {
          const selected = tab.key === selectedKey && !lead?.active;
          const w = weight(i);
          const pad = typeof w === 'number' ? basePad + PILL_EXTRA * w : w.interpolate({ inputRange: [0, 1], outputRange: [basePad, basePad + PILL_EXTRA] });
          return (
            <AnimatedPressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.planned ? t('{label}, kommt später', { label: t(tab.label) }) : t(tab.label)}
              accessibilityState={{ selected }}
              onPress={() => onChange(tab.key)}
              style={[styles.segment, { paddingHorizontal: pad }, selected ? styles.noShrink : Number.isFinite(cap) && { maxWidth: Animated.add(Animated.multiply(pad, 2), cap) }, !ready && selected && styles.segmentSelected]}
            >
              <View style={styles.segmentInner}>
                <Animated.Text
                  numberOfLines={1}
                  style={[
                    styles.segmentText,
                    !selected && styles.shrink,
                    selected && styles.segmentTextSelected,
                    tab.planned && !selected && styles.planned,
                    // Schrift wird dunkel, während die Pille darübergleitet
                    ready ? { color: labelColor(pos, i, on) } : null,
                  ]}
                >
                  {t(tab.label)}
                </Animated.Text>
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Bildschirm-Hintergrund im Spalt zwischen zwei Spuren, über dem Knopf: Der Knopf gleitet darunter hindurch
 * und ist nur auf den Spuren zu sehen. Maske = Streifen um den Spalt ohne die beiden Spuren.
 */
function Paper({ lead, main, width }: { lead: Box; main: Box; width: number }) {
  const height = main.height;
  // Die eigene Spur liegt am Anfang der Zeile: links, bei Rechts nach links rechts
  const leadFirst = lead.x < main.x;
  const reach = Math.min(main.width / 2, 40);
  const from = leadFirst ? lead.x + lead.width / 2 : main.x + main.width - reach;
  const to = leadFirst ? main.x + reach : lead.x + lead.width / 2;
  return (
    <View pointerEvents="none" style={styles.physical}>
      <Svg width={width} height={height}>
        <Defs>
          <Mask id="segmentsPaper" maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
            <Rect x={from} y={-4} width={to - from} height={height + 8} fill="white" />
            <G transform={`translate(${lead.x} 0)`}>
              <Path d={fitShape(SWITCH_TRACK, lead.width, lead.height)} fill="black" />
            </G>
            <G transform={`translate(${main.x} 0)`}>
              <Path d={fitShape(SWITCH_TRACK, main.width, main.height)} fill="black" />
            </G>
          </Mask>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={color.bg.screen} mask="url(#segmentsPaper)" />
      </Svg>
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Gezeichneter Knopf unter dem gewählten Reiter. Folgt der Lage `pos` (auch beim Wischen) und passt seine Breite an. */
function HandKnob({
  pos,
  shift = 0,
  rest,
  single,
  height,
  fill,
}: {
  pos: Animated.Value | Animated.AnimatedInterpolation<number>;
  /** Wird zur Lage addiert, z. B. 1, wenn links eine eigene Spur mit Lage -1 liegt */
  shift?: number;
  rest: { x: number; width: number }[];
  single: boolean;
  height: number;
  fill: string;
}) {
  const now = () => (pos as unknown as { __getValue?: () => number }).__getValue?.() ?? 0;
  const [at, setAt] = useState(now);
  useEffect(() => {
    const id = pos.addListener(({ value }) => setAt(value));
    setAt(now());
    return () => pos.removeListener(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos]);
  const v = single ? 0 : Math.min(Math.max(at + shift, 0), rest.length - 1);
  const i = Math.min(Math.floor(v), rest.length - 2 < 0 ? 0 : rest.length - 2);
  const f = single ? 0 : v - i;
  const a = rest[i];
  const b = rest[Math.min(i + 1, rest.length - 1)];
  const left = a.x + (b.x - a.x) * f;
  const width = Math.round(a.width + (b.width - a.width) * f);
  const d = useMemo(() => fitShape(SWITCH_KNOB, width, height), [width, height]);
  const m = 3;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: left - m, top: BAR_PAD - m }}>
      <Svg width={width + 2 * m} height={height + 2 * m}>
        <G transform={`translate(${m} ${m}) rotate(2 ${width / 2} ${height / 2})`}>
          <Path d={d} fill={fill} />
        </G>
      </Svg>
    </View>
  );
}

/** Seitliche Polsterung je Reiter und Zuschlag für den gewählten Reiter */
const SEGMENT_PAD = space[8];
const PILL_EXTRA = space[8];
const BAR_PAD = space[4];

/** Engere Polsterung der nicht gewählten Reiter, wenn sonst nicht alle Beschriftungen ganz passen */
const TIGHT_PAD = space[4];

/** Seitliche Polsterung der Reiter: normal, oder eng, wenn der Platz mit normaler Polsterung nicht reicht. */
function segmentPad(content: number[], barWidth: number) {
  const need = content.reduce((a, c) => a + c + 2 * SEGMENT_PAD, 2 * PILL_EXTRA);
  return need > barWidth - 2 * BAR_PAD ? TIGHT_PAD : SEGMENT_PAD;
}

/**
 * Größte Beschriftungsbreite der nicht gewählten Reiter, wenn der gewählte `k` ganz bleiben soll.
 * Gekürzt werden nur die längsten, alle auf dieselbe Höchstbreite; kurze bleiben ganz (Daria, 2026-11-10).
 */
function labelCap(content: number[], k: number, barWidth: number, pad: number) {
  const inner = barWidth - 2 * BAR_PAD;
  let room = inner - content.length * 2 * pad - 2 * PILL_EXTRA - content[k];
  const others = content.filter((_, j) => j !== k).sort((a, b) => a - b);
  for (let i = 0; i < others.length; i++) {
    const left = others.length - i;
    if (others[i] * left > room) return Math.max(0, room / left);
    room -= others[i];
  }
  return Infinity;
}

/**
 * Lage und Breite jedes Reiters, wenn er gewählt ist.
 * Rechnet wie Flexbox: Grundbreite = Inhalt (höchstens `labelCap`) + Polsterung, freier Platz zu gleichen Teilen.
 */
function restLayouts(content: number[], barWidth: number, pad: number) {
  const inner = barWidth - 2 * BAR_PAD;
  return content.map((_, k) => {
    const cap = labelCap(content, k, barWidth, pad);
    const basis = content.map((c, j) => (j === k ? c + 2 * pad + 2 * PILL_EXTRA : Math.min(c, cap) + 2 * pad));
    const free = Math.max(0, inner - basis.reduce((a, b) => a + b, 0));
    const width = (j: number) => basis[j] + free / basis.length;
    let x = BAR_PAD;
    for (let j = 0; j < k; j++) x += width(j);
    return { x, width: width(k) };
  });
}

/**
 * true, wenn Zeilen gerade von rechts nach links laufen. Web: Sprache der Seite; iOS/Android: Richtung der App
 * (wechselt erst mit dem Neustart, siehe `needsRestartForDirection`).
 */
const rtlLayout = () => (Platform.OS === 'web' ? isRtl() : I18nManager.isRTL);

/** Farbe eines Reiters je nach Lage der Pille: dunkel darunter, grau daneben. */
const labelColor = (pos: Animated.Value | Animated.AnimatedInterpolation<number>, i: number, on: string) =>
  pos.interpolate({
    inputRange: [i - 0.6, i, i + 0.6],
    outputRange: [color.text.secondary, on, color.text.secondary],
    extrapolate: 'clamp',
  });

/** Inhalt eines geplanten Reiters: Systemhinweis mit Krabbe, dass das Feature später kommt (Daria, 2026-11-11). */
export function PlannedHint({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.hint}>
      <Notice message={`${t(title)}. ${t(message)}`} />
    </View>
  );
}

const styles = StyleSheet.create({
  taskDotLogo: { left: 28, right: undefined, top: -4 },
  row: { flexDirection: 'row' },
  noGrow: { flexGrow: 0, flexShrink: 0 },
  // Logo links; rechts sitzt die schwebende Kamera
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[16],
    paddingVertical: isFashionable ? 0 : space[8],
  },
  spacer: { width: size.touchTarget, height: size.touchTarget },
  logo: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  taskDot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.accent.signal,
    borderWidth: stroke.thin,
    borderColor: color.bg.screen,
  },
  // Fashionable Look: Kopf 44 hoch, Begrüßung kleiner und halbfett, 16 seitlich, 4 oben, 12 unten bis zum Umschalter
  greeting: isFashionable
    ? { paddingHorizontal: space[16], paddingTop: space[4], paddingBottom: space[12], gap: space[2] }
    : { paddingHorizontal: space[16], paddingTop: space[12], paddingBottom: space[8], gap: space[4] },
  greetingTitle: isFashionable
    ? { fontFamily: font.semiBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: color.text.primary }
    : // Ganze Begrüßung in der Unbounded wie die Ansprache „Pirat:in“ (Daria, 2026-11-09). 26 statt 30, die Unbounded
      // läuft breiter; so passt „Guten Morgen, Pirat:in“ in eine Zeile.
      { ...text.display, fontFamily: font.onPhoto, fontSize: 26, lineHeight: 32, letterSpacing: 0, color: color.text.primary },
  // Ansprache in der Unbounded wie Namen und Hashtags über dem Foto (Daria, 09.11.2026)
  greetingName: { fontFamily: font.onPhoto, letterSpacing: 0 },
  greetingSub: isFashionable
    ? { fontFamily: font.regular, fontSize: 14, lineHeight: 18, color: color.text.secondary }
    : { fontFamily: font.text, fontSize: 15, lineHeight: 20, color: color.text.secondary },
  topBar: { paddingHorizontal: space[16], paddingTop: space[4], paddingBottom: space[4], gap: space[12] },
  topItem: { width: size.thumbnail, alignItems: 'center', gap: space[4] },
  thumbnail: {
    width: size.thumbnail,
    height: size.thumbnail,
    borderRadius: radius.full,
    borderWidth: stroke.thin,
    borderColor: color.accent.signal,
  },
  topTitle: { ...text.labelXs, color: color.accent.signal, textAlign: 'center', alignSelf: 'stretch' },
  segmentsRow: { flexDirection: 'row', alignItems: 'stretch', gap: space[8], width: '100%' },
  // Ebene für Spur, Knopf und Strich: Lagen zählen von links, auch bei Rechts nach links
  // iOS/Android tauschen sonst links und rechts; im Browser zählt `left` ohnehin von links
  physical: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, ...(Platform.OS === 'web' ? null : { direction: 'ltr' as const }) },
  // Eigene Spur links, gleich hoch wie der Umschalter daneben
  lead: { minHeight: 40 + 2 * space[4], paddingHorizontal: space[16], alignItems: 'center', justifyContent: 'center' },
  leadPressed: { opacity: 0.7 },
  segments: {
    flexDirection: 'row',
    width: '100%',
    padding: space[4],
  },
  segmentsBeside: { width: undefined, flex: 1 },
  pill: {
    position: 'absolute',
    top: space[4],
    bottom: space[4],
    borderRadius: radius.full,
    backgroundColor: color.icon.large,
  },
  // Breite nach Inhalt, damit vier Reiter neben die Kamera passen
  segment: { flexGrow: 1, flexShrink: 1, minWidth: 0, minHeight: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  segmentSelected: { backgroundColor: color.icon.large },
  segmentText: { fontFamily: font.regular, fontSize: 14, lineHeight: 18, color: color.text.secondary },
  segmentTextSelected: { fontFamily: font.medium, color: color.bg.screen },
  segmentInner: { flexDirection: 'row', alignItems: 'center', gap: space[4], flexShrink: 1, minWidth: 0, maxWidth: '100%' },
  shrink: { flexShrink: 1 },
  // Der gewählte Reiter wird nie gekürzt (Daria, 2026-11-10)
  noShrink: { flexShrink: 0 },
  measure: { position: 'absolute', left: 0, top: 0, opacity: 0, flexDirection: 'row' },
  planned: { opacity: 0.6 },
  hint: { paddingHorizontal: space[16] },
  fashionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space[4],
    paddingRight: space[12],
    paddingBottom: space[8],
    paddingLeft: 14,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  headIcons: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  headDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.accent.affection,
  },
  under: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: stroke.ultraThin,
    borderBottomColor: color.line.hairline,
  },
  // Mockup: Großbuchstaben halbfett 12, 0,5 Laufweite, 12 oben und 11 unten, Strich 1,5
  underTab: { flex: 1, paddingTop: 12, paddingBottom: 11, alignItems: 'center', justifyContent: 'center' },
  underPressed: { opacity: 0.5 },
  underText: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.5, textTransform: 'uppercase', color: color.text.secondary },
  underTextSelected: { color: color.text.primary },
  // Lila Auswahl beim Erstellen, bis die Person umschaltet (Daria, 2026-10-31)
  accentFill: { backgroundColor: color.accent.primary },
  accentText: { color: color.accent.primary },
  underBar: { position: 'absolute', left: 0, bottom: -stroke.ultraThin, height: 1.5, backgroundColor: color.text.primary },
});
