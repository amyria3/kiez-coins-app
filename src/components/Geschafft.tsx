import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { donePhoto, erfolge } from '../data/erfolge';
import { formatBountyShort, formatHoursMinutes } from '../data/format';
import { type ReiseEntry } from '../data/reise';
import { loadPraise } from '../data/remote';
import { useStore } from '../data/store';
import { t } from '../data/texts';
import { useAppDimensions } from '../theme/layout';
import { color, font, radius, space, stroke, text } from '../theme/tokens';
import { Avatar } from './AuthorRow';
import { Cat } from './icons/Brand';
import { Text } from './T';

/** Lob für Dich (Migration für Lob nötig, sonst keine Zahl). Nur mit Konto. */
export function usePraise(): number | null {
  const { mode, currentUserId } = useStore();
  const [praise, setPraise] = useState<number | null>(null);
  useEffect(() => {
    if (mode !== 'live' || !currentUserId) return;
    let active = true;
    loadPraise(currentUserId, currentUserId).then((p) => active && setPraise(p?.count ?? null)).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [mode, currentUserId]);
  return praise;
}

/**
 * Geschafft (Daria, 29.10.2026): Zahlen, die nur wachsen (erst ab 1), Meilensteine (nur erreichte), Danke von anderen
 * und eine Wand mit Fotos von allem, was erledigt ist. Genutzt in „Was Du so machst“ (beide Looks).
 * `wall = false`: ohne Fotowand, z. B. im Fashionable Look, der die Fotos im eigenen Raster zeigt.
 * `gutter`: Seitenrand der Seite, für die Breite der Fotos.
 */
export function Geschafft({
  entries,
  me,
  praise,
  onOpen,
  wall = true,
  gutter = space[20],
}: {
  entries: ReiseEntry[];
  me: string;
  praise: number | null;
  onOpen: (entry: ReiseEntry) => void;
  wall?: boolean;
  gutter?: number;
}) {
  const { users } = useStore();
  const { width } = useAppDimensions();
  const e = useMemo(() => erfolge(entries, me), [entries, me]);
  const stats: { value: string; label: string; signal?: boolean }[] = [];
  if (e.helped) stats.push({ value: String(e.helped), label: t('Mal geholfen') });
  if (e.meDone) stats.push({ value: String(e.meDone), label: t('Me-Challenges') });
  if (e.meTime >= 60000) stats.push({ value: formatHoursMinutes(e.meTime), label: t('für Dich') });
  if (e.gotHelp) stats.push({ value: String(e.gotHelp), label: t('Hilfe bekommen') });
  if (e.hearts) stats.push({ value: String(e.hearts), label: t('Herzen') });
  if (praise) stats.push({ value: String(praise), label: t('Lob') });
  if (e.edensteine) stats.push({ value: String(e.edensteine), label: t('Edensteine') });
  if (e.coins) stats.push({ value: formatBountyShort(e.coins), label: t('verdient'), signal: true });
  // Drei Fotos pro Reihe, Abstand 4
  const tile = Math.floor((Math.min(width, 640) - 2 * gutter - 2 * space[4]) / 3);

  if (e.done.length === 0 && stats.length === 0) {
    return <Text style={styles.empty}>{t('Hier sammelt sich, was Du schaffst. Das erste Foto landet hier, sobald etwas erledigt ist.')}</Text>;
  }
  return (
    <>
      {stats.length ? (
        <View style={styles.stats}>
          {stats.slice(0, 6).map((s) => (
            <Stat key={s.label} value={s.value} label={s.label} signal={s.signal} />
          ))}
        </View>
      ) : null}
      {e.thanks.length ? (
        <View style={styles.block}>
          <Text style={styles.sectionLabel}>{t('Danke von anderen')}</Text>
          <View style={styles.list}>
            {e.thanks.slice(0, 3).map(({ comment, challenge }, i) => {
              const author = users.find((u) => u.id === comment.authorId);
              return (
                <View key={comment.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                  {author ? <Avatar user={author} diameter={32} /> : null}
                  <View style={styles.flex}>
                    <Text style={styles.rowTitle} numberOfLines={2}>
                      {comment.body}
                    </Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {[author?.name, challenge.title].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
      {wall && e.done.length ? (
        <View style={styles.block}>
          <Text style={styles.sectionLabel}>{t('Geschafft')}</Text>
          <View style={styles.wall}>
            {e.done.map((entry) => {
              const photo = donePhoto(entry.challenge);
              return (
                <Pressable
                  key={entry.challenge.id}
                  accessibilityRole="button"
                  accessibilityLabel={entry.label}
                  onPress={() => onOpen(entry)}
                  style={({ pressed }) => [{ width: tile, height: tile }, styles.tile, pressed && styles.pressed]}
                >
                  {photo ? (
                    <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, styles.fallback]}>
                      <Cat height={tile * 0.5} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </>
  );
}

function Stat({ value, label, signal }: { value: string; label: string; signal?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, signal && styles.signal]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: space[2] },
  pressed: { opacity: 0.8 },
  sub: { ...text.caption, fontSize: 12, color: color.text.secondary },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  stat: { flexGrow: 1, flexBasis: '30%', gap: space[4], padding: space[12], borderRadius: radius.lg, backgroundColor: color.bg.surface },
  statValue: { ...text.metric, fontSize: 24, lineHeight: 28, color: color.text.primary },
  statLabel: { ...text.caption, color: color.text.secondary },
  signal: { color: color.accent.signal },
  block: { gap: space[8] },
  sectionLabel: { ...text.caption, letterSpacing: 1, textTransform: 'uppercase', color: color.text.secondary },
  list: { borderRadius: radius.xl + 2, backgroundColor: color.bg.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[12], paddingHorizontal: space[12] },
  rowDivider: { borderTopWidth: stroke.ultraThin, borderTopColor: color.line.hairline },
  rowTitle: { fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: color.text.primary },
  empty: { ...text.body, color: color.text.secondary },
  wall: { flexDirection: 'row', flexWrap: 'wrap', gap: space[4] },
  tile: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: color.bg.surface },
  fallback: { backgroundColor: color.bg.screen, alignItems: 'center', justifyContent: 'center' },
});
