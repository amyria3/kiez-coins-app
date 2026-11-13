import { Pressable, StyleSheet, View } from 'react-native';

import { TextField } from './Form';
import { Icon } from './icons/Icon';
import { Text } from './T';
import { t } from '../data/texts';
import { callPhone, openInMaps, openLink, shortLinkText } from '../lib/places';
import { font, space } from '../theme/tokens';

export type Extras = { place: string; phone: string; link: string };

/**
 * Ort, Telefon und Link einer Erinnerung (Daria, 2026-11-13), alle freiwillig. Beim Anlegen und Bearbeiten
 * unter der Beschreibung.
 */
export function ReminderExtrasFields({ value, onChange }: { value: Extras; onChange: (next: Extras) => void }) {
  return (
    <>
      <TextField
        label="Ort"
        placeholder="Adresse oder Name des Orts"
        value={value.place}
        onChangeText={(place) => onChange({ ...value, place })}
        maxLength={200}
        textContentType="fullStreetAddress"
        autoComplete="street-address"
      />
      <TextField
        label="Telefon"
        placeholder="+49 …"
        value={value.phone}
        onChangeText={(phone) => onChange({ ...value, phone })}
        maxLength={40}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
      />
      <TextField
        label="Link"
        placeholder="z. B. auentee.de"
        value={value.link}
        onChangeText={(link) => onChange({ ...value, link })}
        maxLength={500}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="URL"
      />
    </>
  );
}

/**
 * Auf der Karte: Ort öffnet die Karten-App, Telefon ruft an, Link öffnet die Seite. `ink`: Schriftfarbe der Karte.
 */
export function ReminderExtrasRow({ place, phone, link, ink }: { place?: string; phone?: string; link?: string; ink: string }) {
  if (!place && !phone && !link) return null;
  return (
    <View style={styles.row}>
      {place ? (
        <Pressable
          onPress={() => openInMaps(place)}
          accessibilityRole="link"
          accessibilityHint={t('Öffnet die Karten-App')}
          hitSlop={6}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
        >
          <Icon name="map-pin" size={14} color={ink} />
          <Text noTranslate style={[styles.text, { color: ink }]} numberOfLines={1}>
            {place}
          </Text>
        </Pressable>
      ) : null}
      {phone ? (
        <Pressable
          onPress={() => callPhone(phone)}
          accessibilityRole="link"
          accessibilityLabel={t('{phone} anrufen', { phone })}
          hitSlop={6}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
        >
          <Text noTranslate style={[styles.text, styles.underline, { color: ink }]} numberOfLines={1}>
            {phone}
          </Text>
        </Pressable>
      ) : null}
      {link ? (
        <Pressable onPress={() => openLink(link)} accessibilityRole="link" hitSlop={6} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
          <Icon name="link" size={14} color={ink} />
          <Text noTranslate style={[styles.text, { color: ink }]} numberOfLines={1}>
            {shortLinkText(link)}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[16], rowGap: space[4] },
  item: { flexDirection: 'row', alignItems: 'center', gap: space[4], maxWidth: '100%', flexShrink: 1 },
  text: { fontFamily: font.medium, fontSize: 14, lineHeight: 18, flexShrink: 1 },
  underline: { textDecorationLine: 'underline' },
  pressed: { opacity: 0.6 },
});
