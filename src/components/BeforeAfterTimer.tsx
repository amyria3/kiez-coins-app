import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle } from 'react-native-svg';

import { formatClock } from '../data/format';
import { BEFORE_AFTER_MAX_MS } from '../data/remote';
import { t } from '../data/texts';
import type { Challenge } from '../data/types';
import { color, font, isInstagram, radius, space, stroke, text } from '../theme/tokens';
import { Text } from './T';

/** Aktuelle Zeit, jede `everyMs` neu. Ohne `active` steht die Uhr. */
export function useNow(everyMs = 1000, active = true): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs, active]);
  return now;
}

/** Vergangene Zeit seit dem Timerstart, höchstens 48 h */
export const elapsedMs = (c: Pick<Challenge, 'timerStartedAt'>, now: number) =>
  c.timerStartedAt ? Math.min(BEFORE_AFTER_MAX_MS, Math.max(0, now - Date.parse(c.timerStartedAt))) : 0;

/** Ring über 48 h, beginnt oben und läuft im Uhrzeigersinn */
export function TimerRing({
  diameter,
  width,
  progress,
  tint = color.accent.primary,
  children,
}: {
  diameter: number;
  width: number;
  /** 0 bis 1 */
  progress: number;
  tint?: string;
  children?: ReactNode;
}) {
  const r = (diameter - width) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <View style={{ width: diameter, height: diameter }}>
      <Svg width={diameter} height={diameter} style={styles.rotate}>
        <Circle cx={diameter / 2} cy={diameter / 2} r={r} stroke={isInstagram ? color.line.hairline : color.bg.surface} strokeWidth={width} fill="none" />
        <Circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={r}
          stroke={tint}
          strokeWidth={width}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - p)}
        />
      </Svg>
      {children ? <View style={styles.center}>{children}</View> : null}
    </View>
  );
}

/** Kurze Angabe „1:23 h“ für die Leiste im Feed */
const hoursShort = (ms: number) => {
  const m = Math.floor(ms / 60_000);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} h`;
};

/**
 * Leiste oben im Feed, solange ein eigener Vorher-Nachher-Timer läuft (Daria, 23.10.2026):
 * Vorher-Foto rund mit Ring über 48 h und „Du hast Dich selbst herausgefordert“. Tippen führt zum Timer.
 */
export function RunningBeforeAfter({ challenge, onPress }: { challenge: Challenge; onPress: () => void }) {
  const now = useNow(30_000);
  const elapsed = elapsedMs(challenge, now);
  const left = Math.max(1, Math.ceil((BEFORE_AFTER_MAX_MS - elapsed) / 3_600_000));
  const photo = challenge.imageBefore ?? challenge.image;
  const tint = isInstagram ? color.accent.primary : color.accent.signal;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('Du hast Dich selbst herausgefordert. Seit {since}, noch {left} h. Zum Timer.', {
        since: formatClock(elapsed),
        left,
      })}
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
    >
      <TimerRing diameter={48} width={stroke.ring} progress={elapsed / BEFORE_AFTER_MAX_MS} tint={tint}>
        {photo ? <Image source={photo} style={styles.thumb} contentFit="cover" /> : null}
      </TimerRing>
      <View style={styles.texts}>
        <Text style={styles.line1} numberOfLines={1}>
          Du hast Dich selbst herausgefordert
        </Text>
        <Text style={styles.line2} numberOfLines={1}>
          {t('seit {since} · noch {left} h', { since: hoursShort(elapsed), left })}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rotate: { transform: [{ rotate: '-90deg' }] },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
  banner: isInstagram
    ? {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[12],
        paddingVertical: space[8],
        paddingHorizontal: space[12],
        borderBottomWidth: stroke.thin,
        borderBottomColor: color.line.hairline,
        marginBottom: space[4],
      }
    : {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[12],
        marginHorizontal: space[16],
        paddingVertical: space[8],
        paddingLeft: space[8],
        paddingRight: space[16],
        borderRadius: radius.xl,
        backgroundColor: color.bg.surface,
      },
  thumb: { width: 38, height: 38, borderRadius: 19 },
  texts: { flex: 1, gap: space[2] },
  line1: { fontFamily: isInstagram ? font.semiBold : font.medium, fontSize: 14, lineHeight: 18, color: color.text.primary },
  line2: { ...text.caption, fontSize: 12, color: color.text.secondary, fontVariant: ['tabular-nums'] },
});
