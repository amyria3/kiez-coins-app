import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { ShowcaseHit } from '../data/showcase';
import { t } from '../data/texts';
import { useAccentColor } from '../theme/signal';
import { color, radius, space, stroke, text } from '../theme/tokens';
import { IconButton } from './IconButton';
import { ShowcaseLogo } from './ShowcasePlaceholder';
import { Text } from './T';

/**
 * Suchfeld im Kiez- und Überall-Feed, unter dem Umschalter (Daria, 2026-11-13). Sucht öffentliche Schaufenster.
 * Ohne Lupe: Es gibt kein Such-Icon im Icon-Regelwerk, der Platzhalter sagt, was das Feld tut. Das Kreuz leert die
 * Suche und bringt den Feed zurück.
 */
export function ShowcaseSearchField({
  value,
  onChangeText,
  onClear,
  onFocusChange,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
  onFocusChange?: (focused: boolean) => void;
}) {
  const [focused, setFocused] = useState(false);
  const accent = useAccentColor();
  return (
    <View style={[styles.field, { borderColor: focused ? accent : color.text.secondary }, focused && styles.fieldFocused]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={t('Schaufenster suchen')}
        placeholderTextColor={color.text.placeholder}
        selectionColor={accent}
        accessibilityLabel={t('Schaufenster suchen')}
        returnKeyType="search"
        autoCorrect={false}
        onFocus={() => {
          setFocused(true);
          onFocusChange?.(true);
        }}
        onBlur={() => {
          setFocused(false);
          onFocusChange?.(false);
        }}
        style={styles.input}
      />
      {value ? <IconButton icon="close" iconSize={16} accessibilityLabel={t('Suche leeren')} onPress={onClear} /> : null}
    </View>
  );
}

/** Ein Treffer: Logo, Name, Kiez und der Anfang von „Über uns“. Antippen öffnet das Schaufenster. */
export function ShowcaseHitRow({ hit, onPress }: { hit: ShowcaseHit; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <ShowcaseLogo image={hit.logo} size={48} />
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>
          {hit.name}
        </Text>
        {hit.kiez ? (
          <Text style={styles.meta} numberOfLines={1}>
            {hit.kiez}
          </Text>
        ) : null}
        {hit.about ? (
          <Text style={styles.meta} numberOfLines={2}>
            {hit.about}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    marginHorizontal: space[16],
    marginBottom: space[8],
    paddingLeft: space[12],
    paddingRight: space[4],
    borderWidth: stroke.thin,
    borderRadius: radius.sm,
  },
  // Aktives Feld mit kräftigerem Rand; das Innere rückt um die Differenz ein, damit nichts springt
  fieldFocused: { borderWidth: stroke.focus, paddingLeft: space[12] - (stroke.focus - stroke.thin) },
  input: { ...text.body, flex: 1, color: color.text.primary, paddingVertical: space[8] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[16] },
  pressed: { opacity: 0.6 },
  rowText: { flex: 1, gap: space[2] },
  name: { ...text.title, color: color.text.primary },
  meta: { ...text.caption, color: color.text.secondary },
});
