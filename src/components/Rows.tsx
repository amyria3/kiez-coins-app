import { useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from './T';

import type { User } from '../data/types';
import { color, radius, size, space, stroke, text } from '../theme/tokens';
import { Avatar } from './AuthorRow';
import { Icon } from './icons/Icon';
import { IconButton } from './IconButton';
import { t } from '../data/texts';

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
  // Speichern genau einmal: beim Häkchen oder beim Verlassen des Felds. Das Feld verliert den Fokus,
  // bevor das Häkchen den Tipp bekommt, deshalb speichert schon onBlur.
  const committed = useRef(false);
  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    const next = draft.trim();
    if (next && next !== value) onSave(next);
    setEditing(false);
  };

  if (!editing) {
    return (
      <Pressable
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={t('{label}: {value}. Ändern', { label, value })}
        onPress={() => {
          setDraft(value);
          committed.current = false;
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
            onBlur={commit}
            onSubmitEditing={commit}
            returnKeyType="done"
            autoFocus
            maxLength={maxLength}
            accessibilityLabel={label}
            selectionColor={color.accent.primary}
          />
        )}
      </View>
      <IconButton
        icon="check"
        accessibilityLabel={t('{label} speichern', { label })}
        onPress={commit}
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
      <Icon name="chevron-right" size={size.icon} color={color.text.secondary} />
    </Pressable>
  );
}

type ProfileCardProps = {
  user: User;
  name: string;
  details: string[];
  onPress: () => void;
};

/** Große Karte im Stil der NavRow: Profilbild, Deckname und persönliche Angaben, führt zum Bearbeiten. */
export function ProfileCard({ user, name, details, onPress }: ProfileCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, styles.profileCard, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={t('Persönliche Angaben: {name}, {details}. Ändern', { name, details: details.join(', ') })}
      onPress={onPress}
    >
      <Avatar user={{ ...user, name }} diameter={56} />
      <View style={styles.texts}>
        <Text style={styles.profileName} numberOfLines={1}>
          {name}
        </Text>
        {details.map((line) => (
          <Text key={line} style={styles.label} numberOfLines={1}>
            {line}
          </Text>
        ))}
      </View>
      <Icon name="chevron-right" size={size.icon} color={color.text.secondary} />
    </Pressable>
  );
}

/**
 * Große Karte in der Größe der ProfileCard, z. B. für Your Pleasure, Deine Challenges und Deine Gruppen.
 * Links ein runder Kreis mit Icon oder Zeichnung, daneben Titel und eine Zeile Beschreibung.
 */
export function NavCard({
  title,
  description,
  leading,
  onPress,
}: {
  title: string;
  description?: string;
  leading: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, styles.profileCard, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={description ? `${title}, ${description}` : title}
      onPress={onPress}
    >
      <View style={styles.cardLeading}>{leading}</View>
      <View style={styles.texts}>
        <Text style={styles.profileName} numberOfLines={1}>
          {title}
        </Text>
        {description ? (
          <Text style={styles.label} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-right" size={size.icon} color={color.text.secondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardLeading: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: color.bg.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  profileCard: { padding: space[16], gap: space[16], borderRadius: radius.lg },
  profileName: { ...text.cardTitle, color: color.text.primary },
  editing: { borderWidth: stroke.thin, borderColor: color.accent.primary, paddingVertical: space[4], paddingRight: space[4] },
  pressed: { opacity: 0.8 },
  texts: { flex: 1, gap: space[2] },
  flex: { flex: 1 },
  label: { ...text.caption, color: color.text.secondary },
  value: { ...text.body, color: color.text.primary },
  input: { padding: 0 },
});
