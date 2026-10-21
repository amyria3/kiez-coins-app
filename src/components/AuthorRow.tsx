import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { useStore } from '../data/store';
import type { User } from '../data/types';
import { color, font, radius, size, space, text } from '../theme/tokens';
import { Icon } from './icons/Icon';

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
  textShadowColor: 'rgba(240, 240, 240, 0.85)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 10,
} as const;

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
  return (
    <View style={[styles.avatar, styles.fallback, sizeStyle]}>
      <Text style={[styles.initials, diameter ? { fontSize: Math.round(diameter * 0.4) } : null]}>{initials}</Text>
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
        <Text
          style={[styles.name, hidden && hiddenText]}
          numberOfLines={1}
          accessibilityLabel={hidden ? 'Name verdeckt, solange Dein Kiez fehlt' : undefined}
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
