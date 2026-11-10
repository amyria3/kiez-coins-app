import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

import { TextField } from './Form';
import { Text } from './T';
import { parseRich, toggleBullets, wrapSelection, type Inline } from '../data/richText';
import { t } from '../data/texts';
import { color, font, radius, space, text } from '../theme/tokens';

function Spans({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) => (
        <Text key={i} noTranslate style={[p.bold && styles.bold, p.italic && styles.italic]}>
          {p.text}
        </Text>
      ))}
    </>
  );
}

/** Formatierbaren Text anzeigen: Absätze, **fett**, *kursiv*, Aufzählungen (data/richText.ts) */
export function RichText({ value, style }: { value: string; style?: StyleProp<TextStyle> }) {
  const blocks = parseRich(value);
  return (
    <View style={styles.blocks}>
      {blocks.map((b, i) =>
        b.kind === 'p' ? (
          <Text key={i} noTranslate selectable style={[styles.body, style]}>
            {b.lines.map((line, j) => (
              <Text key={j} noTranslate>
                {j ? '\n' : ''}
                <Spans parts={line} />
              </Text>
            ))}
          </Text>
        ) : (
          <View key={i} style={styles.list}>
            {b.items.map((item, j) => (
              <View key={j} style={styles.item}>
                <Text style={[styles.body, style]}>•</Text>
                <Text noTranslate selectable style={[styles.body, style, styles.flex]}>
                  <Spans parts={item} />
                </Text>
              </View>
            ))}
          </View>
        ),
      )}
    </View>
  );
}

/**
 * Eingabe für formatierbaren Text: Feld mit Knöpfen „Fett“, „Kursiv“ und „Liste“ darüber.
 * Die Knöpfe setzen die Zeichen um die Auswahl; man kann sie auch selbst tippen.
 */
export function RichTextField({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (v: string) => void; maxLength?: number }) {
  const [sel, setSel] = useState({ start: value.length, end: value.length });
  const tool = (name: string, run: () => string) => (
    <Pressable
      key={name}
      accessibilityRole="button"
      accessibilityLabel={t(name)}
      onPress={() => onChange(run())}
      style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
    >
      <Text style={[styles.toolText, name === 'Fett' && styles.bold, name === 'Kursiv' && styles.italic]}>{name === 'Liste' ? '• Liste' : name}</Text>
    </Pressable>
  );
  return (
    <View style={styles.field}>
      <View style={styles.tools}>
        {tool('Fett', () => wrapSelection(value, sel, '**', t('fett')))}
        {tool('Kursiv', () => wrapSelection(value, sel, '*', t('kursiv')))}
        {tool('Liste', () => toggleBullets(value, sel))}
      </View>
      <TextField
        label={label}
        multiline
        value={value}
        onChangeText={onChange}
        maxLength={maxLength}
        onSelectionChange={(e) => setSel(e.nativeEvent.selection)}
        helperText="**fett**, *kursiv*, „- “ am Zeilenanfang für eine Liste"
      />
      {value.trim() ? (
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>So sieht es aus</Text>
          <RichText value={value} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: { gap: space[12] },
  body: { ...text.body, color: color.text.primary },
  bold: { fontFamily: font.semiBold },
  italic: { fontStyle: 'italic' },
  list: { gap: space[4] },
  item: { flexDirection: 'row', gap: space[8] },
  flex: { flex: 1 },
  field: { gap: space[8] },
  tools: { flexDirection: 'row', gap: space[8] },
  tool: { paddingHorizontal: space[12], paddingVertical: space[6], borderRadius: radius.md, backgroundColor: color.bg.surface },
  toolText: { ...text.caption, color: color.text.primary },
  pressed: { opacity: 0.6 },
  preview: { gap: space[8], padding: space[12], borderRadius: radius.md, borderWidth: 1, borderColor: color.bg.surface },
  previewLabel: { ...text.caption, color: color.text.secondary },
});
