import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { color, radius, space, stroke, text } from '../theme/tokens';
import { Icon } from './icons/Icon';
import { IconButton } from './IconButton';

type EditableRowProps = {
  label: string;
  value: string;
  onSave: (value: string) => void;
  /** Statt eines Textfelds eigenen Inhalt zum Bearbeiten zeigen (z. B. Auswahl der Ansprache) */
  renderEditor?: (draft: string, setDraft: (value: string) => void) => React.ReactNode;
  maxLength?: number;
};

/**
 * Figma „EditableRow“ (Display, Editing): Kachel, die beim Antippen zum Eingabefeld wird.
 * Häkchen speichert, Verlassen ohne Speichern verwirft.
 */
export function EditableRow({ label, value, onSave, renderEditor, maxLength }: EditableRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <Pressable
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}. Ändern`}
        onPress={() => {
          setDraft(value);
          setEditing(true);
        }}
      >
        <View style={styles.texts}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, styles.editing]}>
      <View style={styles.texts}>
        <Text style={styles.label}>{label}</Text>
        {renderEditor ? (
          renderEditor(draft, setDraft)
        ) : (
          <TextInput
            style={[styles.value, styles.input]}
            value={draft}
            onChangeText={setDraft}
            onBlur={() => setEditing(false)}
            autoFocus
            maxLength={maxLength}
            accessibilityLabel={label}
            selectionColor={color.accent.primary}
          />
        )}
      </View>
      <IconButton
        icon="check"
        accessibilityLabel={`${label} speichern`}
        onPress={() => {
          if (draft.trim()) onSave(draft.trim());
          setEditing(false);
        }}
      />
    </View>
  );
}

type NavRowProps = {
  label: string;
  value?: string;
  tone?: 'default' | 'danger';
  onPress: () => void;
};

/** Figma „NavRow“ (Default, Danger): Zeile, die zu einem anderen Screen führt. */
export function NavRow({ label, value, tone = 'default', onPress }: NavRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, styles.navRow, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
    >
      <Text style={[styles.value, styles.flex, tone === 'danger' && { color: color.accent.signal }]}>{label}</Text>
      {value ? <Text style={styles.label}>{value}</Text> : null}
      <Icon name="chevron-right" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    padding: space[12],
    minHeight: 60,
    borderRadius: radius.md,
    backgroundColor: color.bg.surface,
  },
  navRow: { minHeight: 48 },
  editing: { borderWidth: stroke.thin, borderColor: color.accent.primary, paddingVertical: space[4], paddingRight: space[4] },
  pressed: { opacity: 0.8 },
  texts: { flex: 1, gap: space[2] },
  flex: { flex: 1 },
  label: { ...text.caption, color: color.text.secondary },
  value: { ...text.body, color: color.text.primary },
  input: { padding: 0 },
});
