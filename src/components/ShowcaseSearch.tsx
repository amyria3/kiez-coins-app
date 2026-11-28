import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import type { ShowcaseHit } from '../data/showcase';
import { t } from '../data/texts';
import { isMono } from '../theme/look';
import { useFocusColor } from '../theme/signal';
import { color, emphasis, radius, space, stroke, text } from '../theme/tokens';
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
    <View style={[styles.field, isMono && styles.fieldMono, focused && { borderColor: accent }, isMono && focused && styles.fieldMonoFocused]}>
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
 * Treffer der Suche: darüber die Zahl, jeder Treffer eine eigene Karte mit feinem Rand (Daria, 2026-11-28: „nicht
 * zusammenfassen … das sind separate Entitäten“, „der Pfeil ist zu technisch“). Die ganze Karte öffnet das Schaufenster.
 */
export function ShowcaseHitList({ hits, onOpen }: { hits: ShowcaseHit[]; onOpen: (id: string) => void }) {
  return (
    <View style={styles.list}>
      <Text style={styles.count}>{t('{n} Schaufenster', { n: hits.length })}</Text>
      {hits.map((hit) => (
        <ShowcaseHitCard key={hit.id} hit={hit} onPress={() => onOpen(hit.id)} />
      ))}
    </View>
  );
}

/**
 * Ein Treffer als eigene Karte (Daria, 2026-11-28: „besser anordnen“): oben Logo, Name und Kiez wie
 * eine Visitenkarte, darunter „Über uns“ über die volle Breite in zurückgenommener Tinte. Antippen öffnet das
 * Schaufenster.
 */
function ShowcaseHitCard({ hit, onPress }: { hit: ShowcaseHit; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.head}>
        <ShowcaseLogo image={hit.logo} size={48} />
        <View style={styles.headText}>
          <Text style={styles.name} numberOfLines={2}>
            {hit.name}
          </Text>
          {hit.kiez ? (
            // Ohne Ortsmarke: Sie stand eingerückt neben der Schriftkante und war größer als die Schrift (Daria,
            // 2026-11-28: „Ist das gutes Design?“). Der Kiez fluchtet jetzt mit dem Namen.
            <Text style={styles.meta} numberOfLines={1}>
              {hit.kiez}
            </Text>
          ) : null}
        </View>
      </View>
      {hit.about ? (
        <Text style={styles.about} numberOfLines={3}>
          {hit.about}
        </Text>
      ) : null}
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
    // Mehr Luft zum ersten Post darunter (Daria, 2026-11-28)
    marginBottom: space[16],
    // Abzüglich des Rands, der immer da ist und nur im aktiven Feld Farbe bekommt; so springt nichts
    // Ruhiger Rand 1,5 statt des dicken Fokusrands (Daria, 2026-11-28, Entwurf A)
    paddingLeft: space[12] - stroke.primary,
    paddingRight: space[4] - stroke.primary,
    borderWidth: stroke.primary,
    borderColor: 'transparent',
    borderRadius: radius.sm,
    backgroundColor: color.bg.surface,
  },
  // Mono: kein graues Feld, sondern eine feine schwarze Linie auf Weiß wie die Knöpfe; aktiv wird die Linie dicker
  // (Daria, 2026-11-28: „grau hervorgehobenen Bereich anders hervorheben“)
  fieldMono: {
    backgroundColor: color.bg.screen,
    borderWidth: stroke.thin,
    borderColor: color.text.primary,
    paddingLeft: space[12] - stroke.thin,
    paddingRight: space[4] - stroke.thin,
  },
  fieldMonoFocused: {
    borderWidth: stroke.focus,
    paddingLeft: space[12] - stroke.focus,
    paddingRight: space[4] - stroke.focus,
  },
  input: { ...text.body, flex: 1, color: color.text.primary, paddingVertical: space[8] },
  list: { marginHorizontal: space[16], marginTop: space[8], gap: space[12] },
  count: { ...text.caption, color: color.text.secondary },
  card: {
    gap: space[12],
    padding: space[16],
    borderWidth: stroke.thin,
    borderColor: color.text.primary,
    borderRadius: radius.md,
    backgroundColor: color.bg.screen,
  },
  pressed: { opacity: 0.6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  headText: { flex: 1, gap: space[4] },
  name: { ...text.cardTitle, color: color.text.primary },
  meta: { ...text.small, color: color.text.secondary },
  about: { ...text.bodySm, color: color.text.primary, opacity: emphasis.humble },
});
