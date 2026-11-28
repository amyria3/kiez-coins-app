import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import type { ShowcaseHit } from '../data/showcase';
import { t } from '../data/texts';
import { useFocusColor } from '../theme/signal';
import { color, emphasis, radius, size, space, stroke, text } from '../theme/tokens';
import { Icon } from './icons/Icon';
import { IconButton } from './IconButton';
import { phXml } from './icons/phosphor';
import { ShowcaseLogo } from './ShowcasePlaceholder';
import { Text } from './T';

/**
 * Suchfeld im Kiez- und Überall-Feed, unter dem Umschalter (Daria, 2026-11-13). Sucht öffentliche Schaufenster.
 * Fläche wie der Umschalter darüber, Rand nur im aktiven Feld, Lupe vorn (Daria, 2026-11-13). Die Lupe kommt aus
 * Phosphor, bis es ein eigenes Such-Icon gibt. Das Kreuz leert die Suche und bringt den Feed zurück.
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
  // Fokus wie in allen Eingabefeldern (useFocusColor), nicht die Akzentfarbe (Daria, 2026-11-13)
  const accent = useFocusColor();
  return (
    <View style={[styles.field, focused && { borderColor: accent }]}>
      <SvgXml xml={phXml('magnifying-glass', color.text.secondary)} width={SEARCH_ICON} height={SEARCH_ICON} accessible={false} />
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

/**
 * Treffer der Suche (Daria, 2026-11-28, Entwurf A): darüber die Zahl, alle Treffer in einer Karte mit feinem Rand,
 * Zeilen mit Pfeil und Trennlinie wie auf der Kontoseite.
 */
export function ShowcaseHitList({ hits, onOpen }: { hits: ShowcaseHit[]; onOpen: (id: string) => void }) {
  return (
    <View style={styles.list}>
      <Text style={styles.count}>{t('{n} Schaufenster', { n: hits.length })}</Text>
      <View style={styles.card}>
        {hits.map((hit, i) => (
          <View key={hit.id}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <ShowcaseHitRow hit={hit} onPress={() => onOpen(hit.id)} />
          </View>
        ))}
      </View>
    </View>
  );
}

/** Ein Treffer: Logo, Name, Kiez und der Anfang von „Über uns“, Pfeil. Antippen öffnet das Schaufenster. */
function ShowcaseHitRow({ hit, onPress }: { hit: ShowcaseHit; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <ShowcaseLogo image={hit.logo} size={44} />
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
          <Text style={styles.about} numberOfLines={2}>
            {hit.about}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-right" size={size.icon} color={color.text.primary} />
    </Pressable>
  );
}

const SEARCH_ICON = 18;

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    minHeight: 44,
    marginHorizontal: space[16],
    // Etwas mehr Abstand zum Umschalter (Daria, 2026-11-13)
    marginTop: space[4],
    marginBottom: space[8],
    // Abzüglich des Rands, der immer da ist und nur im aktiven Feld Farbe bekommt; so springt nichts
    // Ruhiger Rand 1,5 statt des dicken Fokusrands (Daria, 2026-11-28, Entwurf A)
    paddingLeft: space[12] - stroke.primary,
    paddingRight: space[4] - stroke.primary,
    borderWidth: stroke.primary,
    borderColor: 'transparent',
    borderRadius: radius.sm,
    backgroundColor: color.bg.surface,
  },
  input: { ...text.body, flex: 1, color: color.text.primary, paddingVertical: space[8] },
  list: { marginHorizontal: space[16], marginTop: space[8], gap: space[8] },
  count: { ...text.caption, color: color.text.secondary },
  card: { borderWidth: stroke.thin, borderColor: color.text.primary, borderRadius: radius.md, overflow: 'hidden', backgroundColor: color.bg.screen },
  divider: { height: stroke.thin, backgroundColor: color.line.hairline, marginLeft: space[12] + 44 + space[12] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], padding: space[12] },
  pressed: { opacity: 0.6 },
  rowText: { flex: 1, gap: space[2] },
  name: { ...text.title, color: color.text.primary },
  meta: { ...text.caption, color: color.text.secondary },
  about: { ...text.caption, color: color.text.primary, opacity: emphasis.humble },
});
