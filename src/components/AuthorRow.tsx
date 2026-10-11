import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import type { User } from '../data/types';
import { color, font, radius, size, space, text } from '../theme/tokens';
import { Icon } from './icons/Icon';

/** Figma „Avatar“: 36×36, ohne Bild Initialen auf color/accent/primary. */
export function Avatar({ user }: { user: User }) {
  if (user.avatar) {
    return <Image source={user.avatar} style={styles.avatar} accessibilityIgnoresInvertColors />;
  }
  const initials = user.name
    .split(/[\s*]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return (
    <View style={[styles.avatar, styles.fallback]}>
      <Text style={styles.initials}>{initials}</Text>
    </View>
  );
}

type AuthorRowProps = {
  user: User;
  location?: string;
  trailing?: ReactNode;
};

/** Figma „AuthorRow“: Profilbild, Name und Ort, rechts optional Badge. */
export function AuthorRow({ user, location, trailing }: AuthorRowProps) {
  return (
    <View style={styles.row}>
      <Avatar user={user} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
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
    </View>
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
