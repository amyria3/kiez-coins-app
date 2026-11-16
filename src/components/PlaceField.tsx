import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TextField } from './Form';
import { Icon } from './icons/Icon';
import { Text } from './T';
import { searchPlaces } from '../data/placeSearch';
import { useStore } from '../data/store';
import { t } from '../data/texts';
import { useFocusColor } from '../theme/signal';
import { color, radius, space, stroke, text } from '../theme/tokens';

/**
 * Ort mit Vorschlägen beim Tippen (Daria, 2026-11-16). Vorschläge kommen erst, wenn man selbst tippt, nicht beim
 * Öffnen einer bestehenden Erinnerung.
 * - Der erste Treffer ist vorausgewählt und gefüllt. Enter, Tippen auf einen Treffer oder Verlassen des Felds
 *   übernimmt ihn als Text (Daria, 2026-11-16: „Enter tippen oder verlassen“). Ohne Treffer bleibt der getippte Text.
 * - Optik wie das Feld: Rahmen in der Fokusfarbe, Hintergrund wie die Seite, kein Grau.
 */
export function PlaceField({ value, onChange }: { value: string; onChange: (place: string) => void }) {
  const { profile } = useStore();
  const accent = useFocusColor();
  const [typed, setTyped] = useState(false);
  const [hits, setHits] = useState<string[]>([]);
  const ask = useRef(0);
  // Tippen auf einen Treffer nimmt dem Feld erst den Fokus. Dann soll nicht der vorausgewählte gewinnen.
  const choosing = useRef(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  const pick = (place: string) => {
    ask.current++;
    choosing.current = false;
    clearTimeout(blurTimer.current);
    setTyped(false);
    setHits([]);
    onChange(place);
  };
  const shown = typed && hits.length > 0;

  return (
    <View style={styles.wrap}>
      <TextField
        label="Ort"
        placeholder="Adresse oder Name des Orts"
        value={value}
        onChangeText={(place) => {
          setTyped(true);
          choosing.current = false;
          if (place.trim().length < 3) setHits([]);
          onChange(place);
        }}
        onSubmitEditing={() => (shown ? pick(hits[0]) : undefined)}
        onBlur={() => {
          if (!shown) return;
          clearTimeout(blurTimer.current);
          blurTimer.current = setTimeout(() => {
            if (!choosing.current) pick(hits[0]);
          }, 250);
        }}
        returnKeyType={shown ? 'done' : undefined}
        maxLength={200}
        textContentType="fullStreetAddress"
        autoComplete="street-address"
      />
      {shown ? (
        <View style={[styles.list, { borderColor: accent }]} accessibilityRole="menu" accessibilityLabel={t('Vorschläge für den Ort')}>
          {hits.map((place, i) => {
            const chosen = i === 0;
            return (
              <Pressable
                key={place}
                onPressIn={() => (choosing.current = true)}
                onPress={() => pick(place)}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: chosen }}
                accessibilityHint={chosen ? t('Vorausgewählt, Enter übernimmt ihn') : undefined}
                style={({ pressed }) => [
                  styles.item,
                  i > 0 && styles.divider,
                  chosen && { backgroundColor: accent },
                  pressed && styles.pressed,
                ]}
              >
                <Icon name="map-pin" size={14} color={chosen ? color.text.onAccent : color.text.secondary} />
                <Text noTranslate style={[styles.name, chosen && styles.nameChosen]} numberOfLines={2}>
                  {place}
                </Text>
              </Pressable>
            );
          })}
          <Text style={styles.source}>{t('Vorschläge: OpenStreetMap')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  list: { borderWidth: stroke.focus, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: color.bg.screen },
  item: { flexDirection: 'row', alignItems: 'center', gap: space[8], paddingVertical: space[12], paddingHorizontal: space[16] },
  divider: { borderTopWidth: stroke.thin, borderTopColor: color.line.hairline },
  pressed: { opacity: 0.7 },
  name: { ...text.body, color: color.text.primary, flex: 1 },
  nameChosen: { color: color.text.onAccent },
  source: { ...text.caption, color: color.text.secondary, paddingHorizontal: space[16], paddingVertical: space[8] },
});
