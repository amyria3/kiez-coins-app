import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TextField } from './Form';
import { Icon } from './icons/Icon';
import { Text } from './T';
import { searchPlaces } from '../data/placeSearch';
import { useStore } from '../data/store';
import { t } from '../data/texts';
import { color, radius, space, text } from '../theme/tokens';

/**
 * Ort mit Vorschlägen beim Tippen (Daria, 2026-11-16). Vorschläge kommen erst, wenn man selbst tippt, nicht beim
 * Öffnen einer bestehenden Erinnerung. Ein Tipp auf einen Vorschlag übernimmt ihn als Text. Ohne Auswahl bleibt der
 * getippte Text.
 */
export function PlaceField({ value, onChange }: { value: string; onChange: (place: string) => void }) {
  const { profile } = useStore();
  const [typed, setTyped] = useState(false);
  const [hits, setHits] = useState<string[]>([]);
  const ask = useRef(0);

  useEffect(() => {
    if (!typed) return;
    const id = ++ask.current;
    const timer = setTimeout(() => {
      searchPlaces(value, profile.kiez)
        .then((list) => id === ask.current && setHits(list.filter((x) => x !== value.trim())))
        .catch(() => id === ask.current && setHits([]));
    }, 450);
    return () => clearTimeout(timer);
  }, [value, typed, profile.kiez]);

  const pick = (place: string) => {
    ask.current++;
    setTyped(false);
    setHits([]);
    onChange(place);
  };

  return (
    <View style={styles.wrap}>
      <TextField
        label="Ort"
        placeholder="Adresse oder Name des Orts"
        value={value}
        onChangeText={(place) => {
          setTyped(true);
          if (place.trim().length < 3) setHits([]);
          onChange(place);
        }}
        maxLength={200}
        textContentType="fullStreetAddress"
        autoComplete="street-address"
      />
      {typed && hits.length ? (
        <View style={styles.list} accessibilityRole="menu" accessibilityLabel={t('Vorschläge für den Ort')}>
          {hits.map((place) => (
            <Pressable
              key={place}
              onPress={() => pick(place)}
              accessibilityRole="menuitem"
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <Icon name="map-pin" size={14} color={color.text.secondary} />
              <Text noTranslate style={styles.name} numberOfLines={2}>
                {place}
              </Text>
            </Pressable>
          ))}
          <Text style={styles.source}>{t('Vorschläge: OpenStreetMap')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[8] },
  list: { paddingVertical: space[4], borderRadius: radius.lg, backgroundColor: color.bg.surface },
  item: { flexDirection: 'row', alignItems: 'center', gap: space[8], paddingVertical: space[8], paddingHorizontal: space[16] },
  pressed: { opacity: 0.6 },
  name: { ...text.body, color: color.text.primary, flex: 1 },
  source: { ...text.caption, color: color.text.secondary, paddingHorizontal: space[16], paddingVertical: space[4] },
});
