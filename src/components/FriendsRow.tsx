import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useFriends } from '../data/friends';
import { t } from '../data/texts';
import { color, font, isInstagram, space, stroke, text } from '../theme/tokens';
import { Avatar } from './AuthorRow';
import { Icon } from './icons/Icon';
import { Text } from './T';

/** Durchmesser der Bilder in der Leiste (wie Instagrams Story-Kreise) */
const AVATAR = 62;
/** Ring: 2 pt Farbe, 2 pt Luft zum Bild */
const RING = 2;
const GAP = 2;
const CIRCLE = AVATAR + 2 * (RING + GAP);

/**
 * Freundschaften im Reiter „Gruppen“, unter der Gruppe (Daria, 23.10.2026), in beiden Looks:
 * Überschrift mit „Alle“, darunter eine Leiste wie Instagrams Stories. Vorn „Finden“, dann offene Anfragen
 * mit Zahl, dann die Freund:innen. Ein Tipp öffnet das Profil, „Finden“ und „Anfragen“ die Seite „Freundschaften“.
 * Maße in pt: 16 seitlich, 12 zwischen den Kreisen, Kreis 70 (Bild 62, Ring 2, Luft 2), Name 12 pt darunter.
 */
export function FriendsRow() {
  const router = useRouter();
  const lists = useFriends();
  if (lists === null) return null;
  const friends = lists?.friends ?? [];
  const incoming = lists?.incoming.length ?? 0;
  const openAll = () => router.push('/account/freunde');
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          Freund:innen
        </Text>
        <Pressable accessibilityRole="button" onPress={openAll} hitSlop={12}>
          <Text style={styles.all}>Alle</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Freund:innen finden')} onPress={openAll} style={styles.item}>
          <View style={[styles.circle, styles.add]}>
            <Icon name="plus" size={22} color={color.text.primary} />
          </View>
          <Text style={styles.name} numberOfLines={1}>
            Finden
          </Text>
        </Pressable>
        {incoming ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('{n} Anfragen', { n: incoming })}
            onPress={openAll}
            style={styles.item}
          >
            <View style={[styles.circle, styles.ring]}>
              <View style={styles.requests}>
                <Text style={styles.requestsCount}>{incoming}</Text>
              </View>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              Anfragen
            </Text>
          </Pressable>
        ) : null}
        {friends.map((user) => (
          <Pressable
            key={user.id}
            accessibilityRole="button"
            accessibilityLabel={t('Profil von {name}', { name: user.name })}
            onPress={() => router.push({ pathname: '/user/[id]', params: { id: user.id } })}
            style={styles.item}
          >
            <View style={[styles.circle, styles.ring]}>
              <Avatar user={user} diameter={AVATAR} />
            </View>
            <Text noTranslate style={styles.name} numberOfLines={1}>
              {user.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {lists && friends.length === 0 && !incoming ? (
        <Text style={styles.hint}>Noch niemand. Im Profil einer Person fragst Du an.</Text>
      ) : null}
    </View>
  );
}

const ringColor = isInstagram ? color.brand.signature : color.accent.confirmation;

const styles = StyleSheet.create({
  wrap: { gap: space[8], paddingTop: space[12], paddingBottom: space[12] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[16] },
  title: isInstagram
    ? { fontFamily: font.semiBold, fontSize: 16, lineHeight: 20, color: color.text.primary }
    : { ...text.title, color: color.text.primary },
  all: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 18, color: color.accent.primary },
  row: { paddingHorizontal: space[16], gap: space[12] },
  item: { width: CIRCLE, alignItems: 'center', gap: space[4] },
  circle: { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, alignItems: 'center', justifyContent: 'center' },
  ring: { borderWidth: RING, borderColor: ringColor },
  add: { borderWidth: stroke.thin, borderColor: color.line.hairline, backgroundColor: color.bg.surface },
  requests: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: ringColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestsCount: { fontFamily: font.display, fontSize: 22, lineHeight: 26, color: color.text.onAccent },
  name: { ...text.caption, fontSize: 12, lineHeight: 16, color: color.text.primary, alignSelf: 'stretch', textAlign: 'center' },
  hint: { ...text.caption, color: color.text.secondary, paddingHorizontal: space[16] },
});
