import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './T';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';

import { useStore } from '../data/store';
import type { User } from '../data/types';
import { color, font, radius, size, space, text, isFashionable } from '../theme/tokens';
import { Icon } from './icons/Icon';
import { t } from '../data/texts';

/**
 * Ohne Kiez (keine grobe Verortung) bleiben Namen und Profilbilder anderer Personen verdeckt.
 * Beispieldaten und das eigene Profil sind immer sichtbar.
 */
export function useHideName(user: Pick<User, 'id'>): boolean {
  const { mode, profile, currentUserId, groups } = useStore();
  if (mode !== 'live' || profile.kiez || user.id === currentUserId) return false;
  // Mitglieder gemeinsamer Gruppen kennt man, auch ohne Kiez
  return !groups.some((g) => g.members.some((m) => m.userId === user.id));
}

/** Verdeckter Text: nur ein unscharfer Schatten der Buchstaben bleibt sichtbar. */
export const hiddenText = {
  color: 'transparent',
  textShadowColor: isFashionable ? 'rgba(0, 0, 0, 0.55)' : 'rgba(240, 240, 240, 0.85)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 10,
} as const;

const AVATAR_GRADIENT =
  '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="avatar-verlauf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7E94FF"/><stop offset="1" stop-color="#FFB2E5"/></linearGradient></defs><rect width="100" height="100" fill="url(#avatar-verlauf)"/></svg>';

/** Figma „Avatar“: 36×36 (oder `diameter`), ohne Bild Initialen auf color/accent/primary. */
export function Avatar({ user, diameter }: { user: User; diameter?: number }) {
  const hidden = useHideName(user);
  const sizeStyle = diameter ? { width: diameter, height: diameter } : null;
  if (user.avatar) {
    return (
      <Image
        source={user.avatar}
        style={[styles.avatar, sizeStyle]}
        blurRadius={hidden ? 12 : 0}
        accessibilityIgnoresInvertColors
      />
    );
  }
  if (hidden) return <View style={[styles.avatar, styles.fallback, sizeStyle]} />;
  const initials = user.name
    .split(/[\s*]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const d = diameter ?? size.avatar;
  return (
    <View style={[styles.avatar, styles.fallback, isFashionable && styles.fallbackFashionable, sizeStyle]}>
      {/* Fashionable Look: Verlauf wie im Mockup, 135° von Kiez-Lila #7E94FF nach Rosa #FFB2E5 (Daria, 24.10.2026) */}
      {isFashionable ? (
        <SvgXml
          xml={AVATAR_GRADIENT}
          width={d}
          height={d}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Text style={[styles.initials, isFashionable && styles.initialsFashionable, { fontSize: Math.round(d * 0.4) }]}>{initials}</Text>
    </View>
  );
}

type AuthorRowProps = {
  user: User;
  location?: string;
  trailing?: ReactNode;
  /** Öffnet das Profil der Person (`user/[id]`) */
  onPress?: () => void;
};

/** Figma „AuthorRow“: Profilbild, Name und Ort, rechts optional Badge. */
export function AuthorRow({ user, location, trailing, onPress }: AuthorRowProps) {
  const hidden = useHideName(user);
  const Row = onPress ? Pressable : View;
  return (
    <Row
      style={styles.row}
      {...(onPress
        ? { onPress, accessibilityRole: 'button' as const, accessibilityHint: 'Profil öffnen' }
        : {})}
    >
      <Avatar user={user} />
      <View style={styles.info}>
        <Text noTranslate
          style={[styles.name, hidden && hiddenText]}
          numberOfLines={1}
          accessibilityLabel={hidden ? t('Name verdeckt, solange Dein Kiez fehlt') : undefined}
        >
          {user.name}
        </Text>
        {location ? (
          <View style={styles.locationRow}>
            <Icon name="map-pin" size={14} color={color.text.secondary} />
            <Text style={styles.location} numberOfLines={1}>
              {location}
            </Text>
          </View>
        ) : null}
      </View>
      {trailing}
    </Row>
  );
}

const styles = StyleSheet.create({
  avatar: { width: size.avatar, height: size.avatar, borderRadius: radius.full },
  fallback: { backgroundColor: color.accent.primary, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: font.semiBold, fontSize: 14, color: color.bg.screen },
  fallbackFashionable: { backgroundColor: 'transparent', overflow: 'hidden' },
  /** Dunkle Schrift auf dem hellen Verlauf, wie im Mockup */
  initialsFashionable: { color: '#1F2123' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    paddingTop: space[8],
    paddingBottom: space[12],
  },
  info: { flex: 1, gap: space[2] },
  name: { ...text.body, color: color.text.primary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  location: { ...text.caption, color: color.text.secondary, flex: 1 },
});
